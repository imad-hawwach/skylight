# Stop everything Skylight started: server, decoder and the kiosk display.
param([switch]$Quiet)

. "$PSScriptRoot\common.ps1"

$procs = @(Get-SkylightProcesses)
foreach ($p in $procs) {
  try { Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop } catch { }
}
if ($procs.Count -gt 0) { Start-Sleep -Milliseconds 500 }
if (-not $Quiet -and $procs.Count -eq 0) { Show-Message 'Skylight is not running.' }
