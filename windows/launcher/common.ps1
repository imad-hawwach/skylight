# Shared paths and helpers for the Skylight Windows launcher scripts.
# Dot-source it: . "$PSScriptRoot\common.ps1"
#
# Install layout (see windows/installer.nsi):
#   <root>\node\node.exe              bundled Node runtime
#   <root>\app\server\dist\server.mjs bundled server (serves app\web\dist)
#   <root>\app\server\data\           config.json + caches
#   <root>\dump1090\                  Dump1090 for Windows (RTL-SDR decoder)
#   <root>\zadig\zadig.exe            WinUSB driver installer for the stick
#   <root>\skylight.ini               launcher settings (source, port, kiosk)
#   <root>\logs\                      server + decoder output

$ErrorActionPreference = 'Stop'

$Root         = Split-Path -Parent $PSScriptRoot
$IniPath      = Join-Path $Root 'skylight.ini'
$LogDir       = Join-Path $Root 'logs'
$KioskProfile = Join-Path $Root 'kiosk-profile'
$NodeExe      = Join-Path $Root 'node\node.exe'
$ServerJs     = Join-Path $Root 'app\server\dist\server.mjs'
$ConfigJson   = Join-Path $Root 'app\server\data\config.json'
$DumpDir      = Join-Path $Root 'dump1090'
$DumpExe      = Join-Path $DumpDir 'dump1090.exe'

function Read-Settings {
  $s = @{ source = 'api'; port = '3000'; kiosk = '1'; monitor = '0'; browser = 'auto' }
  if (Test-Path $IniPath) {
    foreach ($line in Get-Content $IniPath) {
      if ($line -match '^\s*([A-Za-z_]+)\s*=\s*(.*?)\s*$') { $s[$Matches[1].ToLower()] = $Matches[2] }
    }
  }
  return $s
}

# Set one key in skylight.ini, keeping every other line as it is.
function Write-Setting([string]$Key, [string]$Value) {
  $lines = @()
  if (Test-Path $IniPath) { $lines = @(Get-Content $IniPath) }
  if ($lines.Count -eq 0) { $lines = @('[skylight]') }
  $found = $false
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^\s*$Key\s*=") { $lines[$i] = "$Key=$Value"; $found = $true }
  }
  if (-not $found) { $lines += "$Key=$Value" }
  Set-Content -Path $IniPath -Value $lines -Encoding ASCII
}

# Everything this install started: node + dump1090 from the install folder,
# and the kiosk browser (recognised by its private profile folder).
function Get-SkylightProcesses {
  Get-CimInstance Win32_Process | Where-Object {
    ($_.ExecutablePath -and $_.ExecutablePath.StartsWith($Root, [StringComparison]::OrdinalIgnoreCase)) -or
    ($_.CommandLine -and $_.CommandLine.Contains($KioskProfile))
  }
}

function Show-Message([string]$Text, [string]$Icon = 'Information') {
  Add-Type -AssemblyName System.Windows.Forms
  [void][System.Windows.Forms.MessageBox]::Show($Text, 'Skylight', 'OK', $Icon)
}

# The display location lives in the server config (editable from the phone
# panel); dump1090 wants the same point as its home position.
function Get-HomePosition {
  try {
    $cfg = Get-Content $ConfigJson -Raw | ConvertFrom-Json
    if ($null -ne $cfg.centerLat -and $null -ne $cfg.centerLon) {
      $inv = [Globalization.CultureInfo]::InvariantCulture
      return ([double]$cfg.centerLat).ToString($inv) + ',' + ([double]$cfg.centerLon).ToString($inv)
    }
  } catch { }
  return '37.6213,-122.379' # server default (SFO)
}

# dump1090.cfg ships with homepos unset, which opens its setup wizard on first
# run, and asks the Windows Location API. Write a copy with our position, and
# with the FlightAware web root: dump1090 detects it and then names the
# aircraft.json fields alt_baro / gs / geom_rate (readsb style, what the server
# reads) instead of Tar1090's altitude / speed / vert_rate.
function Write-Dump1090Config {
  $src = Join-Path $DumpDir 'dump1090.cfg'
  $dst = Join-Path $DumpDir 'skylight.cfg'
  $homePos = Get-HomePosition
  $out = foreach ($line in Get-Content $src) {
    if ($line -match '^\s*homepos\s*=') { "homepos  = $homePos" }
    elseif ($line -match '^\s*location\s*=') { 'location = no' }
    elseif ($line -match '^\s*web-page\s*=') { 'web-page = %~dp0\web_root-FlightAware\index.html' }
    else { $line }
  }
  Set-Content -Path $dst -Value $out -Encoding ASCII
  return $dst
}

function Find-Browser([string]$Preference) {
  $chrome = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
  )
  $edge = @(
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
  )
  $order = switch ($Preference) { 'edge' { $edge + $chrome } default { $chrome + $edge } }
  foreach ($p in $order) { if ($p -and (Test-Path $p)) { return $p } }
  return $null
}

function Get-LanAddresses {
  try {
    Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
      Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.PrefixOrigin -ne 'WellKnown' } |
      Select-Object -ExpandProperty IPAddress
  } catch { @() }
}
