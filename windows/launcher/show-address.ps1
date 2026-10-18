# Show the address to open the control panel from a phone on the same Wi-Fi.
. "$PSScriptRoot\common.ps1"

$s = Read-Settings
$urls = @(Get-LanAddresses | ForEach-Object { "http://${_}:$($s.port)/control" })
if ($urls.Count -eq 0) { $urls = @("http://localhost:$($s.port)/control") }
$source = if ($s.source -eq 'radio') { 'RTL-SDR stick' } else { 'free internet API' }
Show-Message ("Open the control panel on your phone (same network):`n`n" + ($urls -join "`n") +
  "`n`nData source: $source`nDisplay on this PC: http://localhost:$($s.port)/")
