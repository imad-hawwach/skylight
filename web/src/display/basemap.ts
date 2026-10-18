// Web map under the map projection — the Flightradar-style view.
//
// Standard 256 px Web Mercator tiles. Each tile is placed by projecting three
// of its corners through the same lat/lon -> screen transform the aircraft
// use (local meters, rotation, mirror), and drawn with the matching affine
// transform. So the map always lines up with the planes and runways, and
// rotation/mirror calibration applies to it for free. Over the radii Skylight
// uses (<= 100 mi) the flat local approximation and Mercator agree to well
// under a pixel per tile.
//
// While a tile loads, the nearest loaded ancestor tile is scaled in, so
// zooming or changing radius never flashes black.

import type { Basemap, Config, Point } from "@shared/index.js";

interface Style {
  url: (z: number, x: number, y: number) => string;
  maxZoom: number;
  attribution: string;
}

// Esri's public tile services need no API key (CARTO's now do).
const ESRI = (service: string): Style["url"] => (z, x, y) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/${service}/MapServer/tile/${z}/${y}/${x}`;

const STYLES: Record<Exclude<Basemap, "off">, Style> = {
  dark: {
    url: ESRI("Canvas/World_Dark_Gray_Base"),
    maxZoom: 16,
    attribution: "Esri, HERE, Garmin, © OpenStreetMap contributors",
  },
  streets: {
    url: ESRI("World_Street_Map"),
    maxZoom: 19,
    attribution: "Esri, HERE, Garmin, USGS, © OpenStreetMap contributors",
  },
  satellite: {
    url: ESRI("World_Imagery"),
    maxZoom: 18,
    attribution: "Esri, Maxar, Earthstar Geographics",
  },
};

/** Meters per pixel of a 256 px tile at zoom 0 on the equator. */
const MPP_Z0 = 156543.03392;
/** Upper bound on tiles per frame; above it we drop a zoom level. */
const MAX_TILES = 160;
/** Keep this many decoded tiles around (LRU). */
const CACHE_SIZE = 400;

interface Tile {
  img: HTMLImageElement;
  ready: boolean;
  failed: boolean;
  used: number;
}

const lonToX = (lon: number, n: number) => ((lon + 180) / 360) * n;
const latToY = (lat: number, n: number) => {
  const r = (Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n;
};
const xToLon = (x: number, n: number) => (x / n) * 360 - 180;
const yToLat = (y: number, n: number) =>
  (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;

export class BasemapLayer {
  private tiles = new Map<string, Tile>();
  private frame = 0;
  /** Called when a tile finishes loading (the renderer redraws every frame
   *  anyway; this exists for capped-fps setups that may want a nudge). */
  onTileLoad: (() => void) | null = null;

  /**
   * Draw the map for the current view. `toScreen` maps [lat, lon] to screen
   * pixels exactly as the aircraft are mapped; `viewRadiusM` is the ground
   * distance from the center to the farthest screen corner.
   */
  draw(
    ctx: CanvasRenderingContext2D,
    cfg: Config,
    toScreen: (ll: [number, number]) => Point,
    pxPerM: number,
    viewRadiusM: number,
    dpr: number,
  ): void {
    if (cfg.basemap === "off") return;
    const style = STYLES[cfg.basemap];
    this.frame++;

    const lat0 = cfg.centerLat;
    const cosLat = Math.cos((lat0 * Math.PI) / 180);
    // Tile zoom whose pixels best match ours (round up for crispness).
    let z = Math.ceil(Math.log2(MPP_Z0 * cosLat * pxPerM * dpr) - 0.25);
    z = Math.max(1, Math.min(style.maxZoom, z));

    const dLat = viewRadiusM / 110540;
    const dLon = viewRadiusM / (111320 * Math.max(cosLat, 0.05));
    let range = this.tileRange(z, lat0 + dLat, lat0 - dLat, cfg.centerLon - dLon, cfg.centerLon + dLon);
    while (z > 1 && (range.x1 - range.x0 + 1) * (range.y1 - range.y0 + 1) > MAX_TILES) {
      z--;
      range = this.tileRange(z, lat0 + dLat, lat0 - dLat, cfg.centerLon - dLon, cfg.centerLon + dLon);
    }

    const n = 2 ** z;
    for (let ty = range.y0; ty <= range.y1; ty++) {
      for (let tx = range.x0; tx <= range.x1; tx++) {
        const wx = ((tx % n) + n) % n; // wrap across the antimeridian
        this.drawTile(ctx, style, cfg.basemap, z, tx, ty, wx, toScreen);
      }
    }
    // Dim with one veil instead of drawing tiles translucent: their seam
    // overlap would otherwise show as faint grid lines.
    const shown = Math.max(0, Math.min(1, cfg.basemapOpacity)) * cfg.brightness;
    if (shown < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - shown;
      ctx.fillStyle = cfg.palette.bg;
      ctx.fillRect(0, 0, ctx.canvas.clientWidth, ctx.canvas.clientHeight);
      ctx.restore();
    }

    this.evict();
    this.drawAttribution(ctx, cfg, style.attribution);
  }

  private tileRange(z: number, north: number, south: number, west: number, east: number) {
    const n = 2 ** z;
    return {
      x0: Math.floor(lonToX(west, n)),
      x1: Math.floor(lonToX(east, n)),
      y0: Math.max(0, Math.floor(latToY(north, n))),
      y1: Math.min(n - 1, Math.floor(latToY(south, n))),
    };
  }

  private drawTile(
    ctx: CanvasRenderingContext2D,
    style: Style,
    styleId: string,
    z: number,
    tx: number,
    ty: number,
    wx: number,
    toScreen: (ll: [number, number]) => Point,
  ): void {
    const n = 2 ** z;
    // Screen corners of this tile: NW, NE, SW.
    const nw = toScreen([yToLat(ty, n), xToLon(tx, n)]);
    const ne = toScreen([yToLat(ty, n), xToLon(tx + 1, n)]);
    const sw = toScreen([yToLat(ty + 1, n), xToLon(tx, n)]);

    // Use this tile if loaded, else the nearest loaded ancestor's sub-square.
    let src: Tile | null = null;
    let sx = 0;
    let sy = 0;
    let sSize = 1;
    for (let up = 0; up <= Math.min(z, 6); up++) {
      const pz = z - up;
      const f = 2 ** up;
      const t = this.get(styleId, style, pz, Math.floor(wx / f), Math.floor(ty / f), up === 0);
      if (t?.ready) {
        src = t;
        sx = (wx % f) / f;
        sy = (ty % f) / f;
        sSize = 1 / f;
        break;
      }
    }
    if (!src) return;

    const iw = src.img.naturalWidth;
    const ih = src.img.naturalHeight;
    ctx.save();
    // Unit square -> tile's screen parallelogram.
    ctx.transform(ne.x - nw.x, ne.y - nw.y, sw.x - nw.x, sw.y - nw.y, nw.x, nw.y);
    // A hair of overlap hides antialiasing seams between neighbours.
    const pad = 0.6 / Math.max(1, Math.hypot(ne.x - nw.x, ne.y - nw.y));
    ctx.drawImage(src.img, sx * iw, sy * ih, sSize * iw, sSize * ih, -pad, -pad, 1 + 2 * pad, 1 + 2 * pad);
    ctx.restore();
  }

  /** Cached tile; starts a download only when `load` (the wanted zoom). */
  private get(
    styleId: string,
    style: Style,
    z: number,
    x: number,
    y: number,
    load: boolean,
  ): Tile | null {
    const key = `${styleId}/${z}/${x}/${y}`;
    let t = this.tiles.get(key);
    if (!t) {
      if (!load) return null;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.decoding = "async";
      const tile: Tile = { img, ready: false, failed: false, used: this.frame };
      img.onload = () => {
        tile.ready = true;
        this.onTileLoad?.();
      };
      img.onerror = () => {
        tile.failed = true;
      };
      img.src = style.url(z, x, y);
      this.tiles.set(key, tile);
      t = tile;
    }
    t.used = this.frame;
    return t;
  }

  private evict(): void {
    if (this.tiles.size <= CACHE_SIZE) return;
    const old = [...this.tiles.entries()].sort((a, b) => a[1].used - b[1].used);
    for (const [key, t] of old.slice(0, this.tiles.size - CACHE_SIZE)) {
      if (!t.ready && !t.failed) t.img.src = ""; // cancel an in-flight load
      this.tiles.delete(key);
    }
  }

  /** Tile providers require visible credit. Kept small and dim. */
  private drawAttribution(ctx: CanvasRenderingContext2D, cfg: Config, text: string): void {
    const canvas = ctx.canvas;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.save();
    ctx.font = `300 10px ${cfg.fonts.label}`;
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = `rgba(200,206,220,${0.45 * cfg.brightness})`;
    ctx.fillText(text, w - 8, h - 6);
    ctx.restore();
  }
}
