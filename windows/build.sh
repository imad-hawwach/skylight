#!/usr/bin/env bash
# Build the Windows installer: windows/build/Skylight-Setup-<version>.exe
#
# Runs on macOS or Linux (or Git Bash on Windows). Needs: node + pnpm, makensis
# (brew install makensis / apt install nsis), curl, unzip, shasum or sha256sum.
#
# Bundles: the web build, the server as one file (esbuild), a Windows node.exe,
# Dump1090 for Windows (RTL-SDR decoder, MIT) and Zadig (WinUSB driver tool,
# GPLv3). Downloads are pinned and checked against SHA-256 below.
set -euo pipefail

NODE_VERSION=22.23.3
NODE_SHA256=2b0ff57b049cda1bbcea2240eec20467018713c1efe1f7360c2681859b90ed71
DUMP1090_URL=https://github.com/gvanem/Dump1090/releases/download/v1.0.1/Dump1090-for-Windows-1.0.1-x64.zip
DUMP1090_SHA256=d4ebc85c9f55a15026645d44438286cb88ab3fb962d44a8e627e906017e736cf
ZADIG_URL=https://github.com/pbatard/libwdi/releases/download/v1.5.1/zadig-2.9.exe
ZADIG_SHA256=4ecaa95df3da3621486a043aef8b3050b8bafe7c901402871e816229ef82039b

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/.." && pwd)"
BUILD="$HERE/build"
CACHE="$BUILD/cache"
STAGE="$BUILD/stage"

sha256() { if command -v sha256sum >/dev/null; then sha256sum "$1"; else shasum -a 256 "$1"; fi | cut -d' ' -f1; }

fetch() { # url sha256 dest
  local url=$1 want=$2 dest=$3
  if [[ ! -f "$dest" ]] || [[ "$(sha256 "$dest")" != "$want" ]]; then
    echo "  downloading $url"
    curl -fsSL --retry 3 -o "$dest.part" "$url"
    mv "$dest.part" "$dest"
  fi
  local got; got="$(sha256 "$dest")"
  if [[ "$got" != "$want" ]]; then
    echo "SHA-256 mismatch for $dest: got $got, want $want" >&2
    rm -f "$dest"; exit 1
  fi
}

for tool in pnpm makensis curl unzip; do
  command -v "$tool" >/dev/null || { echo "missing: $tool" >&2; exit 1; }
done

VERSION="$(node -p "require('$REPO/package.json').version")"
echo "Skylight $VERSION for Windows"

echo "[1/5] web + server"
cd "$REPO"
pnpm install --frozen-lockfile --filter server --filter web --filter shared --filter . >/dev/null
pnpm -F web build >/dev/null

rm -rf "$STAGE"
mkdir -p "$STAGE/app/server/dist" "$STAGE/app/server/data" "$CACHE"
# One ESM file; express is CommonJS, so give the bundle a real require().
pnpm exec esbuild server/src/index.ts --bundle --platform=node --format=esm \
  --target=node22 --tsconfig=server/tsconfig.json --log-level=warning \
  --banner:js="import { createRequire as __skylightRequire } from 'node:module'; const require = __skylightRequire(import.meta.url);" \
  --outfile="$STAGE/app/server/dist/server.mjs"
mkdir -p "$STAGE/app/web"
cp -R web/dist "$STAGE/app/web/dist"
cp LICENSE "$STAGE/app/LICENSE"

echo "[2/5] node $NODE_VERSION (win-x64)"
fetch "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-win-x64.zip" "$NODE_SHA256" "$CACHE/node-win-x64.zip"
mkdir -p "$STAGE/node"
unzip -q -o -j "$CACHE/node-win-x64.zip" "node-v$NODE_VERSION-win-x64/node.exe" "node-v$NODE_VERSION-win-x64/LICENSE" -d "$STAGE/node"

echo "[3/5] dump1090 for Windows"
fetch "$DUMP1090_URL" "$DUMP1090_SHA256" "$CACHE/dump1090.zip"
mkdir -p "$STAGE/dump1090"
unzip -q -o "$CACHE/dump1090.zip" -d "$STAGE/dump1090"
# Dev/analysis helpers we don't need on the PC.
rm -rf "$STAGE/dump1090/tools" "$STAGE/dump1090/port-8080.bat"

echo "[4/5] zadig"
mkdir -p "$STAGE/zadig"
fetch "$ZADIG_URL" "$ZADIG_SHA256" "$CACHE/zadig.exe"
cp "$CACHE/zadig.exe" "$STAGE/zadig/zadig.exe"

cp -R "$HERE/launcher" "$STAGE/launcher"

echo "[5/5] makensis"
OUT="$BUILD/Skylight-Setup-$VERSION.exe"
cd "$HERE"
# makensis aborts (std::bad_alloc) on macOS without a UTF-8 locale.
LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8 makensis -V2 -DVERSION="$VERSION" -DSTAGE="$STAGE" -DOUTFILE="$OUT" installer.nsi
echo "built $OUT ($(du -h "$OUT" | cut -f1))"
