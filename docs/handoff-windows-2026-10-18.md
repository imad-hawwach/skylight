# Handoff - Skylight on Windows (2026-10-18)

Context for a Claude Code session continuing this work on the Windows PC. The
work so far was done on a Mac (session "GitHub Skylight project setup") and
moved here through the `windows-installer` branch of `imad-hawwach/skylight`
(a fork of `cpaczek/skylight`).

## Goal (owner: Imad)

Run Skylight on a **Windows desktop instead of a Raspberry Pi**, with his own
RTL-SDR stick, keeping the free internet API as an option. Location: **Accra,
Kotoka International (5.6052, -0.1668)**. Keep developing locally on this PC.

## Done on this branch

1. **Windows installer** (`windows/`, see `windows/README.md`)
   - `installer.nsi` - NSIS, per-user install to `%LOCALAPPDATA%\Programs\Skylight`
     (no admin). Pages: data source (RTL-SDR or free API, optional Zadig),
     location + startup (autostart, projector kiosk, firewall rule), sky layers.
     Silent: `/S /SOURCE= /LAT= /LON= /NAME= /AUTOSTART= /KIOSK= /SKY=`.
   - `launcher/*.ps1` - start/stop/switch source/show address; `configure.mjs`
     writes location + sky layers into `app\server\data\config.json`.
   - `build.sh` - builds web, bundles the server into one ESM file with esbuild,
     downloads node.exe 22.23.3, gvanem/Dump1090 v1.0.1 and Zadig 2.9 (SHA-256
     pinned), runs makensis. Written for macOS/Linux; on Windows run it from
     Git Bash (needs makensis: `winget install NSIS.NSIS`, add it to PATH).
   - `tools/make-icon.py` regenerates `skylight.ico`.
2. **12 more constellations** in `shared/src/stars.ts` (Southern Cross + Pointers,
   Scorpius, Sagittarius Teapot, Leo, Gemini, Taurus, Canis Major, Corvus, Lyra,
   Cygnus, Pegasus square, Aquila), star data from the d3-celestial Hipparcos
   catalog, each toggleable in /control.
3. **Outline fix:** `computeSky` takes `outlineStars` so the corner stars of the
   visible constellations survive `starMagLimit` (Megrez/Segin used to break
   the Big Dipper and Cassiopeia). Tests: `shared/test/constellations.test.ts`.

## Gotchas found

- **gvanem Dump1090 JSON field names:** `/data/aircraft.json` uses `altitude` /
  `speed` / `vert_rate` (Tar1090 style) unless the web page is the FlightAware
  web root, then `alt_baro` / `gs` / `geom_rate` (what the server reads). The
  launcher writes `dump1090\skylight.cfg` with `web-page = ...web_root-FlightAware`,
  plus `homepos` from config.json (an unset homepos opens a setup wizard) and
  `location = no`. Units on that endpoint are always feet/knots.
- dump1090 exits at startup if the stick can't be opened, so "dump1090 answers
  on :8080" means the WinUSB driver (Zadig) works.
- makensis on macOS aborts with `std::bad_alloc` without a UTF-8 locale.
- configure.mjs must get `--lon=-0.1668` (the `=` form); parseArgs treats a bare
  negative number as an option.
- PowerShell 5.1: scripts are ASCII-only; `$home` and `$args` are automatic
  variables - don't assign them.

## State of the installed copy (checked from the Mac, 17:30 UTC)

- Installed at `%LOCALAPPDATA%\Programs\Skylight`, running at
  `http://192.168.86.41:3000` (control: `/control`), source **radio**, all sky
  layers on, satellite labels on, `radiusMiles` 3.
- dump1090 running and serving :8080, but its `messages` counter stayed at **1**
  with 0 aircraft -> stick opened but hearing almost nothing (antenna placement?).
- **adsb.fi and adsb.lol show 0 aircraft within 250 nm of Accra** - no feeder
  coverage in Ghana, so the free-API option is effectively empty there. The
  stick is the real source.

## Next steps

1. Diagnose reception on this PC: `logs\dump1090.log`, `http://localhost:8080/`
   (dump1090's own map), gain (dump1090.cfg `gain = 31`; try auto/higher),
   antenna by a window / outdoors, check traffic at Kotoka on a flight tracker.
2. Raise `radiusMiles` (3 -> ~20) for Accra; maybe default it higher in the installer.
3. Installer: warn that the free API has no coverage in some regions (or check
   coverage at install time and suggest the stick).
4. Optional: feed the stick's data to adsb.fi / adsb.lol so Accra gets coverage.
5. Optional: GitHub Actions `windows-latest` smoke test (silent install, health check).

## Dev on Windows

```bash
git clone https://github.com/imad-hawwach/skylight && cd skylight
git checkout windows-installer
pnpm install --filter server --filter web --filter shared --filter .
pnpm exec vitest run shared server
DATA_SOURCE=radio pnpm dev     # Git Bash; or $env:DATA_SOURCE='radio'; pnpm dev in PowerShell
```

Stop the installed copy first (Start > Skylight > Stop Skylight) if the dev
server should use port 3000 or the stick - only one program can open the stick.
