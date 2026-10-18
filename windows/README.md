# Skylight for Windows

A one-file installer (`Skylight-Setup-<version>.exe`) for running Skylight on a
Windows 10/11 PC with the projector as a second screen, instead of a Raspberry Pi.
It bundles everything: Node.js, the server and display, the dump1090 decoder
for an RTL-SDR stick, and Zadig for the stick's USB driver. No admin rights
needed except for two optional steps that ask on their own (the firewall rule
and Zadig).

## Installing

1. Plug in the RTL-SDR stick (if you have one) and connect the projector.
2. Run `Skylight-Setup-<version>.exe`. Windows SmartScreen may warn because the
   installer isn't code-signed: **More info → Run anyway**.
3. Choose the aircraft source:
   - **My RTL-SDR stick** - live decoding with the bundled
     [Dump1090 for Windows](https://github.com/gvanem/Dump1090). The free
     internet feed still fills gaps (e.g. aircraft on the ground).
   - **Free internet API only** - [adsb.fi](https://adsb.fi), no hardware.
4. Enter your location, pick the sky layers (sun, moon, planets, stars and
   constellations, satellites/ISS) and the startup options.
5. With the stick option, Zadig opens: pick **Bulk-In, Interface (Interface 0)**
   (or RTL2832U / RTL2838UHIDIR; tick *Options → List All Devices* if it isn't
   listed), keep **WinUSB**, click **Install Driver**. Once per PC.

Skylight then opens full-screen on the projector (the first screen that isn't
your main one). **Alt+F4** closes the display; the server keeps running.

## Using it

Start menu → **Skylight**:

| Shortcut | Does |
|---|---|
| Skylight | Start (or restart) the server, decoder and projector display |
| Stop Skylight | Stop all of it |
| Use RTL-SDR stick / Use free internet API | Switch the aircraft source and restart |
| Phone control panel address | Shows `http://<this-pc>:3000/control` for your phone |
| Install RTL-SDR USB driver (Zadig) | Redo the driver step |
| Settings (skylight.ini) | `source`, `port`, `kiosk` (0/1), `monitor` (0 = auto, or 1, 2...), `browser` (auto/chrome/edge) |
| Logs | `server.log`, `dump1090.log` and their error logs |

Everything else - location, sky layers, each constellation, star density,
theme, calibration - is in the phone control panel and saves itself.

Installed per user in `%LOCALAPPDATA%\Programs\Skylight`; the config is in
`app\server\data\config.json` there. Uninstall from *Settings → Apps*.

**Not included:** the optional sky-camera tracker (PTZ camera auto-filming). It
needs the Pi/Linux setup.

## Troubleshooting

- **No planes with the stick:** open `http://localhost:8080/` - dump1090's own
  map. Empty map → driver (rerun Zadig) or antenna; `logs\dump1090.log` says
  which. Make sure no other SDR program has the stick open.
- **Display on the wrong screen:** set `monitor=2` (or `1`) in skylight.ini and
  start Skylight again.
- **Phone can't reach the control panel:** the PC and phone must be on the same
  network, and the network set to *Private* in Windows (the firewall rule only
  opens port 3000 on private networks).

## Building the installer

On macOS or Linux (needs node + pnpm, `makensis`, curl, unzip):

```bash
windows/build.sh
```

Output: `windows/build/Skylight-Setup-<version>.exe`. The script builds the
web app, bundles the server into one file with esbuild, and downloads a
Windows `node.exe`, Dump1090 for Windows and Zadig at pinned versions checked
against SHA-256. `windows/tools/make-icon.py` regenerates `skylight.ico`.

Silent install (for scripting):
`Skylight-Setup.exe /S /SOURCE=radio /LAT=5.6052 /LON=-0.1668 /NAME="Accra" /SKY=sun,moon,planets,stars,satellites`
