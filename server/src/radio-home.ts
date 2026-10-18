// Keep the RTL-SDR decoder's home position in step with the display location.
//
// dump1090 (gvanem, Windows) reads `homepos` once at start and drops every
// decoded position more than 500 km from it ("global distance check failed"),
// so after moving the location across the world the stick hears aircraft but
// nothing ever reaches aircraft.json. The Windows launcher sets
// SKYLIGHT_DUMP1090_RESTART to a script that rewrites dump1090's config from
// config.json and restarts just the decoder; we run it when the location has
// moved far enough to matter. Elsewhere (Pi, Docker) the variable is unset and
// this does nothing.

import { spawn } from "node:child_process";
import { greatCircleMiles, type Config } from "@shared/index.js";
import type { ConfigStore } from "./config-store.js";

/** Well inside dump1090's 500 km window, well outside a move across town. */
export const RESTART_DISTANCE_KM = 50;
/** Wait for the location to settle (typing, several quick picks). */
const SETTLE_MS = 4000;

const KM_PER_MI = 1.609344;

export interface LatLon {
  lat: number;
  lon: number;
}

/** True when `next` is far enough from where the decoder was started. */
export function needsRestart(started: LatLon, next: LatLon): boolean {
  const km = greatCircleMiles(started.lat, started.lon, next.lat, next.lon) * KM_PER_MI;
  return km > RESTART_DISTANCE_KM;
}

export function watchRadioHome(
  store: ConfigStore,
  opts: {
    script: string | undefined;
    isRadio: () => boolean;
    run?: (script: string) => void;
  },
): void {
  const { script } = opts;
  if (!script) return;
  const run = opts.run ?? runScript;

  // The launcher started dump1090 from config.json just before the server.
  let started: LatLon = center(store.get());
  let timer: ReturnType<typeof setTimeout> | null = null;

  store.subscribe((cfg) => {
    if (!needsRestart(started, center(cfg))) {
      if (timer) clearTimeout(timer); // moved back before it settled
      timer = null;
      return;
    }
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      const now = center(store.get());
      if (!opts.isRadio() || !needsRestart(started, now)) return;
      console.log(
        `[radio] location moved ${Math.round(
          greatCircleMiles(started.lat, started.lon, now.lat, now.lon) * KM_PER_MI,
        )} km — restarting dump1090 with the new home position`,
      );
      started = now;
      run(script);
    }, SETTLE_MS);
  });
}

function center(cfg: Config): LatLon {
  return { lat: cfg.centerLat, lon: cfg.centerLon };
}

function runScript(script: string): void {
  // Not `detached`: on Windows that starts PowerShell without a console, and
  // it then exits 0 without running the script. The script launches dump1090
  // as its own process, so nothing depends on this child staying around.
  const child = spawn(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", script],
    { stdio: "ignore", windowsHide: true },
  );
  child.on("error", (e) => console.error("[radio] dump1090 restart failed:", e));
  child.unref();
}
