import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { searchAirports } from "../src/airports.js";

// A fresh cached airports.csv in a temp data dir, so no download happens.
function dataDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "skylight-ap-"));
  mkdirSync(join(dir, "ourairports"));
  writeFileSync(
    join(dir, "ourairports", "airports.csv"),
    [
      "id,ident,type,name,latitude_deg,longitude_deg,iso_country,municipality,icao_code,iata_code",
      '1,DGAA,large_airport,"Kotoka International Airport",5.6052,-0.1668,GH,Accra,DGAA,ACC',
      '2,GH-0002,small_airport,"Accra Kotoka Air Base Strip",5.6,-0.17,GH,Accra,,',
      '3,DGLE,medium_airport,"Tamale Airport",9.5572,-0.8632,GH,Tamale,DGLE,TML',
      '4,GH-0099,heliport,"Accra Heliport",5.58,-0.2,GH,Accra,,',
      '5,KSFO,large_airport,"San Francisco International Airport",37.6213,-122.379,US,San Francisco,KSFO,SFO',
      '6,EGLL,large_airport,"London Heathrow Airport",51.47,-0.4619,GB,London,EGLL,LHR',
    ].join("\n"),
  );
  return dir;
}

describe("searchAirports", () => {
  const dir = dataDir();

  it("finds by exact IATA and ICAO code first", async () => {
    expect((await searchAirports("acc", dir))[0].ident).toBe("DGAA");
    expect((await searchAirports("DGAA", dir))[0].ident).toBe("DGAA");
  });

  it("matches code prefixes", async () => {
    const ids = (await searchAirports("DG", dir)).map((h) => h.ident);
    expect(ids).toEqual(["DGAA", "DGLE"]);
  });

  it("matches name and city words, bigger airports first", async () => {
    const ids = (await searchAirports("kotoka", dir)).map((h) => h.ident);
    expect(ids).toEqual(["DGAA", "GH-0002"]);
    expect((await searchAirports("san fran", dir))[0].ident).toBe("KSFO");
  });

  it("skips heliports and needs two characters", async () => {
    expect((await searchAirports("heliport", dir)).length).toBe(0);
    expect(await searchAirports("a", dir)).toEqual([]);
  });

  it("returns what the control panel shows and imports", async () => {
    const [hit] = await searchAirports("ACC", dir);
    expect(hit).toEqual({
      ident: "DGAA",
      iata: "ACC",
      name: "Kotoka International Airport",
      city: "Accra",
      country: "GH",
      lat: 5.6052,
      lon: -0.1668,
      type: "large_airport",
    });
  });
});
