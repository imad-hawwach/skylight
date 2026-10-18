import { describe, expect, it } from "vitest";
import { computeSky } from "../src/celestial.js";
import { CONSTELLATIONS, STARS, visibleAsterisms } from "../src/stars.js";

// Constellation outlines reference stars by id, and their faint corners must
// survive the star-density cut so an outline never draws with a gap.

const ACCRA = { lat: 5.6052, lon: -0.1668 };
// Mid-July evening: Scorpius stands near the meridian from Accra.
const JULY_NIGHT = new Date("2026-07-15T21:00:00Z");
const OPTS = {
  sun: false,
  moon: false,
  stars: true,
  satellites: false,
  planets: false,
  magLimit: 2.6,
  tles: [],
};

describe("constellations", () => {
  it("only reference stars in the catalog", () => {
    const ids = new Set(STARS.map((s) => s.id));
    for (const c of CONSTELLATIONS) {
      for (const [a, b] of c.segments) {
        expect(ids.has(a), `${c.id}: ${a}`).toBe(true);
        expect(ids.has(b), `${c.id}: ${b}`).toBe(true);
      }
    }
  });

  it("have unique ids, and the catalog has unique star ids", () => {
    expect(new Set(CONSTELLATIONS.map((c) => c.id)).size).toBe(CONSTELLATIONS.length);
    expect(new Set(STARS.map((s) => s.id)).size).toBe(STARS.length);
  });

  it("keep faint outline stars past the magnitude limit", () => {
    const faint = "xamidimura"; // Scorpius, mag 3.0 - fainter than the 2.6 default
    const without = computeSky(JULY_NIGHT, ACCRA.lat, ACCRA.lon, OPTS);
    expect(without.stars.some((s) => s.id === faint)).toBe(false);

    const outlineStars = new Set(visibleAsterisms({}).flat());
    const withOutline = computeSky(JULY_NIGHT, ACCRA.lat, ACCRA.lon, { ...OPTS, outlineStars });
    expect(withOutline.stars.some((s) => s.id === faint)).toBe(true);
    // Every Scorpius corner is up, so the whole outline can draw.
    const up = new Set(withOutline.stars.map((s) => s.id));
    const scorpius = CONSTELLATIONS.find((c) => c.id === "scorpius")!;
    for (const [a, b] of scorpius.segments) expect(up.has(a) && up.has(b), `${a}-${b}`).toBe(true);
  });

  it("drop a hidden constellation's faint stars again", () => {
    const outlineStars = new Set(visibleAsterisms({ scorpius: false }).flat());
    const sky = computeSky(JULY_NIGHT, ACCRA.lat, ACCRA.lon, { ...OPTS, outlineStars });
    expect(sky.stars.some((s) => s.id === "xamidimura")).toBe(false);
  });
});
