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

## Session 2 - on the Windows PC (2026-10-18 evening)

Repo now lives at `C:\dev\skylight` on the PC. Installed copy upgraded from
this branch's build; settings kept.

### Built

- **Radar layout** - Projection is now `Sky | Map | Radar`. Radar = map
  projection over a web map (`basemap`: dark / streets / satellite, plus
  `basemapOpacity`), Flightradar-style; the sky layer is hidden while it shows.
  `web/src/display/basemap.ts`: Web Mercator tiles placed through the same
  lat/lon -> screen transform as the aircraft, so rotation/mirror/radius apply.
  Checked against Kotoka's runway on satellite imagery and live SFO traffic.
  Tiles are **Esri** (no key) - CARTO now needs an API key ("API KEY REQUIRED"
  on every tile). One dimming veil instead of translucent tiles (no seams).
- **Airport autocomplete** - `GET /api/airports/search?q=` (code, name or
  city; OurAirports, bigger airports first; `server/src/airports.ts`) and an
  `AirportSearch` dropdown in the control panel's Location and Runways fields.
  Picking under Location centers there and imports the runways.
- **dump1090 follows the location** - `server/src/radio-home.ts`: when the
  location settles > 50 km from where the decoder started, the server runs
  `launcher\restart-dump1090.ps1` (path passed in `SKYLIGHT_DUMP1090_RESTART`
  by start-skylight.ps1), which rewrites `skylight.cfg` and restarts only
  dump1090. Tested Accra -> CDG -> Accra on the installed copy.
- **build.sh on Windows** - finds makensis in the NSIS folder, passes Windows
  paths (`cygpath -m`) to node and makensis. NSIS 3.13 installed via winget.

### Found

- **Reception (next step 1):** stick, WinUSB driver and dump1090 all work.
  Gain sweep (20 / 31 / 40 / 49.6 dB / AGC, 90 s each): higher gain made the
  same nearby aircraft louder but never added new ones; AGC clipped. Keep 31.
  The antenna is the limit: departures to the south/east (THY3KA) come through
  well, arrivals from the north (a BA flight) weren't heard at all.
- **"Hears planes, shows none" after a location change:** dump1090 reads
  `homepos` once at start and drops every position > 500 km from it ("CPR:
  global distance check failed ... actual 4839 km" in `dump1090\dump1090.log`).
  Fixed by the restart above. Its log prints `F flag: even` for every frame -
  a logging quirk only; the raw frames alternate even/odd and decode fine.
- **No aircraft at CDG:** `planetariumMode` had been switched on (hides all
  aircraft, server status "Aircraft display disabled").
- Display minimizes when the projector is reconnected; Start > Skylight puts
  it back. `skylight.ini` has `monitor=2` (projector, 1920x1080 right of the
  3440x1440 main screen). Mirror off / rotation 0 for the wall; turn Mirror
  back on for the ceiling.
- Running `dump1090.exe --test ...` while the real one runs can knock the
  stick off it ("A device which does not exist was specified") - don't.

### Dev gotchas on this PC

- Claude's "No folder" scratch workspace sits under a virtualized path that
  breaks vite/esbuild on Windows - work in a short real path like `C:\dev`.
- Clone with `-c core.longpaths=true`.

## Next steps

1. Antenna: higher, outdoors, clear view to the north; then compare the
   message rate (it was ~4-15/min in the evening, hundreds with a nearby jet).
2. Raise `radiusMiles` for Accra (30-40 mi to see arrivals early); maybe
   default it higher in the installer.
3. Installer: warn that the free API has no coverage in some regions (or check
   coverage at install time and suggest the stick).
4. Optional: runways are faint over the satellite map - consider brighter
   runway lines in Radar mode.
5. Optional: feed the stick's data to adsb.fi / adsb.lol so Accra gets coverage.
6. Optional: GitHub Actions `windows-latest` smoke test (silent install, health check).

## Dev on Windows

```bash
git -c core.longpaths=true clone https://github.com/imad-hawwach/skylight && cd skylight
git checkout windows-installer
pnpm install --filter server --filter web --filter shared --filter .
pnpm exec vitest run shared server
DATA_SOURCE=radio pnpm dev     # Git Bash; or $env:DATA_SOURCE='radio'; pnpm dev in PowerShell
```

Stop the installed copy first (Start > Skylight > Stop Skylight) if the dev
server should use port 3000 or the stick - only one program can open the stick.
