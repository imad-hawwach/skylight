import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG } from "@shared/index.js";
import { ConfigStore } from "../src/config-store.js";
import { needsRestart, watchRadioHome } from "../src/radio-home.js";

const ACCRA = { lat: 5.6052, lon: -0.1668 };
const CDG = { lat: 49.009, lon: 2.5541 };
const TEMA = { lat: 5.6698, lon: -0.0166 }; // ~18 km from Kotoka

describe("needsRestart", () => {
  it("ignores moves within a metro area", () => {
    expect(needsRestart(ACCRA, TEMA)).toBe(false);
  });
  it("restarts for a move across the world", () => {
    expect(needsRestart(CDG, ACCRA)).toBe(true);
  });
});

describe("watchRadioHome", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  // Patches schedule a save; keep it in a throwaway folder.
  const dir = mkdtempSync(join(tmpdir(), "skylight-home-"));
  const storeAt = (p: { lat: number; lon: number }) =>
    new ConfigStore(join(dir, "config.json"), { ...DEFAULT_CONFIG, centerLat: p.lat, centerLon: p.lon });

  it("runs the script once the far move settles", () => {
    const store = storeAt(CDG);
    const run = vi.fn();
    watchRadioHome(store, { script: "restart.ps1", isRadio: () => true, run });

    store.patch({ centerLat: ACCRA.lat, centerLon: ACCRA.lon });
    store.patch({ radiusMiles: 20 }); // more edits while settling: still one restart
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5000);
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith("restart.ps1");

    // Now homed at Accra: a nearby move does nothing.
    store.patch({ centerLat: TEMA.lat, centerLon: TEMA.lon });
    vi.advanceTimersByTime(5000);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("does nothing on the API source or without a script", () => {
    const run = vi.fn();
    const a = storeAt(CDG);
    watchRadioHome(a, { script: "restart.ps1", isRadio: () => false, run });
    a.patch({ centerLat: ACCRA.lat, centerLon: ACCRA.lon });
    const b = storeAt(CDG);
    watchRadioHome(b, { script: undefined, isRadio: () => true, run });
    b.patch({ centerLat: ACCRA.lat, centerLon: ACCRA.lon });
    vi.advanceTimersByTime(5000);
    expect(run).not.toHaveBeenCalled();
  });

  it("skips the restart when the location comes back before settling", () => {
    const store = storeAt(ACCRA);
    const run = vi.fn();
    watchRadioHome(store, { script: "restart.ps1", isRadio: () => true, run });
    store.patch({ centerLat: CDG.lat, centerLon: CDG.lon });
    vi.advanceTimersByTime(1000);
    store.patch({ centerLat: ACCRA.lat, centerLon: ACCRA.lon });
    vi.advanceTimersByTime(5000);
    expect(run).not.toHaveBeenCalled();
  });
});
