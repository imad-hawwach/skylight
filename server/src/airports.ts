// Airport lookup by ICAO/IATA code, backed by the OurAirports public-domain
// dataset (airports.csv + runways.csv). The CSVs are downloaded on first use
// and cached on disk for a month; if a refresh download fails, the stale
// cache keeps working.

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Airport, Runway } from "@shared/index.js";

const BASE = "https://davidmegginson.github.io/ourairports-data";
const MAX_AGE_MS = 30 * 24 * 3600_000;

async function cachedCsv(dataDir: string, name: string): Promise<string> {
  const dir = join(dataDir, "ourairports");
  const path = join(dir, name);
  let fresh = false;
  try {
    fresh = Date.now() - (await stat(path)).mtimeMs < MAX_AGE_MS;
  } catch {
    // not downloaded yet
  }
  if (!fresh) {
    try {
      const res = await fetch(`${BASE}/${name}`, { signal: AbortSignal.timeout(60_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      await mkdir(dir, { recursive: true });
      await writeFile(path, text);
      return text;
    } catch (e) {
      // fall through to a stale cache if we have one
      console.error(`[airports] OurAirports ${name} download failed:`, e);
    }
  }
  try {
    return await readFile(path, "utf8");
  } catch {
    throw new Error("airport database download failed — check the server's internet access");
  }
}

/** One CSV line -> fields, honoring quotes ("a,b" stays one field). */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = false;
      } else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

/**
 * Resolve an airport (with runway geometry) by ICAO ident ("KSFO", "EDDF")
 * or IATA code ("SFO"). Throws with a human-readable message on miss.
 */
export async function lookupAirport(code: string, dataDir: string): Promise<Airport> {
  const q = code.trim().toUpperCase();
  // 3-4 chars for ICAO/IATA; longer local idents ("GH-0002") come from search.
  if (!/^[A-Z0-9-]{3,10}$/.test(q)) {
    throw new Error("enter an ICAO (KSFO) or IATA (SFO) airport code");
  }

  const airportsCsv = await cachedCsv(dataDir, "airports.csv");
  const lines = airportsCsv.split("\n");
  const h = parseCsvLine(lines[0]);
  const cIdent = h.indexOf("ident");
  const cName = h.indexOf("name");
  const cLat = h.indexOf("latitude_deg");
  const cLon = h.indexOf("longitude_deg");
  const cIcao = h.indexOf("icao_code");
  const cIata = h.indexOf("iata_code");

  let row: string[] | null = null;
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].includes(q)) continue; // cheap prefilter, ~80k rows
    const r = parseCsvLine(lines[i]);
    if (r[cIdent] === q) {
      row = r;
      break; // exact ident match always wins
    }
    if (!row && ((cIcao >= 0 && r[cIcao] === q) || (cIata >= 0 && r[cIata] === q))) {
      row = r;
    }
  }
  if (!row) throw new Error(`no airport found for "${q}"`);

  const ident = row[cIdent];
  const lat = parseFloat(row[cLat]);
  const lon = parseFloat(row[cLon]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error(`${ident} has no coordinates in OurAirports`);
  }

  const runwaysCsv = await cachedCsv(dataDir, "runways.csv");
  const rl = runwaysCsv.split("\n");
  const rh = parseCsvLine(rl[0]);
  const col = (name: string) => rh.indexOf(name);
  const cAp = col("airport_ident");
  const cClosed = col("closed");
  const cWidth = col("width_ft");
  const cLeId = col("le_ident");
  const cLeLat = col("le_latitude_deg");
  const cLeLon = col("le_longitude_deg");
  const cHeId = col("he_ident");
  const cHeLat = col("he_latitude_deg");
  const cHeLon = col("he_longitude_deg");

  const runways: Runway[] = [];
  for (let i = 1; i < rl.length; i++) {
    if (!rl[i].includes(ident)) continue;
    const r = parseCsvLine(rl[i]);
    if (r[cAp] !== ident || r[cClosed] === "1") continue;
    const le: [number, number] = [parseFloat(r[cLeLat]), parseFloat(r[cLeLon])];
    const he: [number, number] = [parseFloat(r[cHeLat]), parseFloat(r[cHeLon])];
    if (!le.every(Number.isFinite) || !he.every(Number.isFinite)) continue;
    runways.push({
      leIdent: r[cLeId] || "?",
      heIdent: r[cHeId] || "?",
      le,
      he,
      widthFt: parseFloat(r[cWidth]) || 100,
    });
  }
  if (!runways.length) {
    throw new Error(
      `OurAirports has no runway endpoint coordinates for ${ident} — ` +
        "smaller airfields often lack them",
    );
  }

  const iata = cIata >= 0 ? row[cIata] : "";
  return { icao: ident, name: iata || ident, fullName: row[cName], lat, lon, runways };
}

/** One autocomplete hit — enough to show and to import with lookupAirport. */
export interface AirportHit {
  /** OurAirports ident (ICAO for most airports) — pass to /api/airport. */
  ident: string;
  iata: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  type: string;
}

interface IndexedAirport extends AirportHit {
  /** Lowercased name + city, for substring matching. */
  hay: string;
  rank: number;
}

/** Bigger airports first when matches tie. */
const TYPE_RANK: Record<string, number> = {
  large_airport: 0,
  medium_airport: 1,
  small_airport: 2,
  seaplane_base: 3,
};

let index: { builtAt: number; rows: IndexedAirport[] } | null = null;
let building: Promise<IndexedAirport[]> | null = null;

async function airportIndex(dataDir: string): Promise<IndexedAirport[]> {
  if (index && Date.now() - index.builtAt < MAX_AGE_MS) return index.rows;
  building ??= (async () => {
    const csv = await cachedCsv(dataDir, "airports.csv");
    const lines = csv.split("\n");
    const h = parseCsvLine(lines[0]);
    const c = (name: string) => h.indexOf(name);
    const [cIdent, cType, cName, cLat, cLon, cCountry, cCity, cIata] = [
      c("ident"), c("type"), c("name"), c("latitude_deg"), c("longitude_deg"),
      c("iso_country"), c("municipality"), c("iata_code"),
    ];
    const rows: IndexedAirport[] = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i]) continue;
      const r = parseCsvLine(lines[i]);
      const type = r[cType];
      // Heliports, balloon ports and closed fields have no runways to draw.
      if (!(type in TYPE_RANK)) continue;
      const lat = parseFloat(r[cLat]);
      const lon = parseFloat(r[cLon]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const name = r[cName] ?? "";
      const city = r[cCity] ?? "";
      rows.push({
        ident: r[cIdent],
        iata: (cIata >= 0 && r[cIata]) || "",
        name,
        city,
        country: r[cCountry] ?? "",
        lat,
        lon,
        type,
        hay: `${name} ${city}`.toLowerCase(),
        rank: TYPE_RANK[type],
      });
    }
    index = { builtAt: Date.now(), rows };
    return rows;
  })().finally(() => {
    building = null;
  });
  return building;
}

/**
 * Autocomplete: airports matching `query` by code (ICAO/IATA, exact or
 * prefix) or by words of the name/city ("kotoka", "accra", "san fran").
 * Exact codes first, then code prefixes, then name/city word starts, then
 * substrings; bigger airports first within each tier.
 */
export async function searchAirports(query: string, dataDir: string, limit = 8): Promise<AirportHit[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const Q = q.toUpperCase();
  const rows = await airportIndex(dataDir);
  const words = q.split(/\s+/).filter(Boolean);

  const scored: { a: IndexedAirport; s: number }[] = [];
  for (const a of rows) {
    let tier: number;
    if (a.ident === Q || a.iata === Q) tier = 0;
    else if (a.ident.startsWith(Q) || (a.iata && a.iata.startsWith(Q))) tier = 1;
    else if (words.every((w) => a.hay.startsWith(w) || a.hay.includes(` ${w}`))) tier = 2;
    else if (words.every((w) => a.hay.includes(w))) tier = 3;
    else continue;
    scored.push({ a, s: tier * 10 + a.rank });
  }
  scored.sort((x, y) => x.s - y.s || x.a.name.localeCompare(y.a.name));
  return scored.slice(0, limit).map(({ a }) => ({
    ident: a.ident,
    iata: a.iata,
    name: a.name,
    city: a.city,
    country: a.country,
    lat: a.lat,
    lon: a.lon,
    type: a.type,
  }));
}

/**
 * Resolve just the city name for a 3-letter IATA code (fast path for the
 * click-card feature — no runway lookup needed). Falls back to the code
 * itself on any miss so the UI never shows an empty string.
 */
export async function lookupCity(code: string, dataDir: string): Promise<string> {
  const q = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{3,4}$/.test(q)) return code;

  try {
    const airportsCsv = await cachedCsv(dataDir, "airports.csv");
    const lines = airportsCsv.split("\n");
    const h = parseCsvLine(lines[0]);
    const cIdent = h.indexOf("ident");
    const cIcao = h.indexOf("icao_code");
    const cIata = h.indexOf("iata_code");
    const cCity = h.indexOf("municipality");

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].includes(q)) continue;
      const r = parseCsvLine(lines[i]);
      const isMatch =
        r[cIdent] === q ||
        (cIcao >= 0 && r[cIcao] === q) ||
        (cIata >= 0 && r[cIata] === q);
      if (isMatch && cCity >= 0 && r[cCity]) {
        return r[cCity];
      }
    }
  } catch {
    /* fall through to code fallback below */
  }
  return code;
}
