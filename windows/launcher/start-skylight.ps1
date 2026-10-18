# Start Skylight: the RTL-SDR decoder (radio mode), the server, and the
# full-screen display on the projector. Safe to run again - it restarts.
param(
  [switch]$NoKiosk,  # start the server only (used by the installer's silent mode)
  [switch]$Quiet     # no message boxes
)

. "$PSScriptRoot\common.ps1"

$s = Read-Settings
$port = [int]$s.port

& "$PSScriptRoot\stop-skylight.ps1" -Quiet
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

if ($s.source -eq 'radio') {
  if (Test-Path $DumpExe) {
    $cfg = Write-Dump1090Config
    # --net serves /data/aircraft.json on localhost:8080 - the server's default radio URL.
    Start-Process -FilePath $DumpExe -ArgumentList @('--config', "`"$cfg`"", '--net') `
      -WorkingDirectory $DumpDir -WindowStyle Hidden `
      -RedirectStandardOutput (Join-Path $LogDir 'dump1090.log') `
      -RedirectStandardError (Join-Path $LogDir 'dump1090-error.log')
  } elseif (-not $Quiet) {
    Show-Message "Radio mode is selected but dump1090 isn't installed.`nRe-run the Skylight installer, or switch to the free internet API from the Start menu." 'Warning'
  }
}

# Started processes inherit these.
$env:DATA_SOURCE = $s.source
$env:PORT        = "$port"
$env:HOST        = '0.0.0.0'
$env:NODE_ENV    = 'production'
# On radio, also merge the free API so landing aircraft and gaps stay filled.
if (-not $env:SUPPLEMENT_API) { $env:SUPPLEMENT_API = '1' }

Start-Process -FilePath $NodeExe -ArgumentList "`"$ServerJs`"" `
  -WorkingDirectory (Split-Path $ServerJs) -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $LogDir 'server.log') `
  -RedirectStandardError (Join-Path $LogDir 'server-error.log')

# Wait for the server before pointing a browser at it.
$up = $false
for ($i = 0; $i -lt 60 -and -not $up; $i++) {
  try {
    $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 "http://127.0.0.1:$port/api/health"
    $up = $r.StatusCode -eq 200
  } catch { Start-Sleep -Milliseconds 500 }
}
if (-not $up) {
  if (-not $Quiet) {
    $tail = ''
    $err = Join-Path $LogDir 'server-error.log'
    if (Test-Path $err) { $tail = (Get-Content $err -Tail 8) -join "`n" }
    Show-Message "Skylight's server didn't start.`n`n$tail`n`nLogs: $LogDir" 'Error'
  }
  exit 1
}

if ($s.kiosk -eq '1' -and -not $NoKiosk) {
  $browser = Find-Browser $s.browser
  if (-not $browser) {
    Start-Process "http://localhost:$port/"
  } else {
    # Projector screen: monitor=N picks the Nth screen; 0 picks the first
    # screen that isn't the main one (the projector), else the main screen.
    Add-Type -AssemblyName System.Windows.Forms
    $screens = [System.Windows.Forms.Screen]::AllScreens
    $n = 0; [void][int]::TryParse($s.monitor, [ref]$n)
    if ($n -ge 1 -and $n -le $screens.Count) { $screen = $screens[$n - 1] }
    else {
      $screen = $screens | Where-Object { -not $_.Primary } | Select-Object -First 1
      if (-not $screen) { $screen = [System.Windows.Forms.Screen]::PrimaryScreen }
    }
    $x = $screen.Bounds.X + 50; $y = $screen.Bounds.Y + 50

    $browserArgs = @(
      '--kiosk', "--user-data-dir=`"$KioskProfile`"", "--window-position=$x,$y",
      '--no-first-run', '--no-default-browser-check', '--disable-session-crashed-bubble',
      '--noerrdialogs', '--disable-features=Translate', '--autoplay-policy=no-user-gesture-required'
    )
    if ($browser -like '*msedge.exe') { $browserArgs += '--edge-kiosk-type=fullscreen' }
    $browserArgs += "http://localhost:$port/"
    Start-Process -FilePath $browser -ArgumentList $browserArgs
  }
}
