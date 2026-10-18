// Install-time setup, run by the installer with the bundled node.exe:
//   node configure.mjs --lat=5.6052 --lon=-0.1668 --name="Kotoka International, Accra"
//                      --sky=sun,moon,planets,stars,satellites
// (the = form matters: parseArgs reads a bare "-0.1668" as an option)
// Writes the location and sky layers into app/server/data/config.json, merging
// into an existing config so a reinstall keeps everything set from the phone
// panel. An empty --lat/--lon leaves the location alone (set it later from
// /control); no --sky leaves the sky layers alone. --sky lists the layers to
// switch ON; every other layer it knows is switched off.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = resolve(root, "app/server/data/config.json");

const { values } = parseArgs({
  options: {
    lat: { type: "string", default: "" },
    lon: { type: "string", default: "" },
    name: { type: "string", default: "" },
    sky: { type: "string" },
  },
});

// Installer sky choice -> config flag.
const SKY_LAYERS = {
  sun: "showSun",
  moon: "showMoon",
  planets: "showPlanets",
  stars: "showStars",
  satellites: "showSatellites",
  satlabels: "satelliteLabels",
};

let config = {};
try {
  config = JSON.parse(readFileSync(configPath, "utf8"));
} catch {
  // first install
}

const save = () => {
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
};

if (values.sky !== undefined) {
  const on = new Set(values.sky.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
  for (const [layer, field] of Object.entries(SKY_LAYERS)) config[field] = on.has(layer);
  save();
  console.log(`Sky layers: ${[...on].join(", ") || "none"}`);
}

if (values.lat.trim() === "" && values.lon.trim() === "") process.exit(0);

// Accept a decimal comma too ("5,6052") - it's what some locales type.
const num = (s) => Number(s.trim().replace(",", "."));
const lat = num(values.lat);
const lon = num(values.lon);
if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
  console.error(`Invalid location "${values.lat}", "${values.lon}" - set it from the control panel instead.`);
  process.exit(2);
}

config.centerLat = lat;
config.centerLon = lon;
config.locationName = values.name.trim() || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
save();
console.log(`Location set to ${config.locationName} (${lat}, ${lon})`);
