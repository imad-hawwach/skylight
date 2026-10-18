# Switch where aircraft come from, then restart Skylight.
#   radio - your RTL-SDR stick via the bundled dump1090 (free API fills gaps)
#   api   - the free adsb.fi internet feed only, no hardware
param([Parameter(Mandatory = $true)][ValidateSet('radio', 'api')][string]$Source)

. "$PSScriptRoot\common.ps1"

if ($Source -eq 'radio' -and -not (Test-Path $DumpExe)) {
  Show-Message "dump1090 isn't installed. Re-run the Skylight installer and choose the RTL-SDR option." 'Warning'
  exit 1
}
Write-Setting 'source' $Source
& "$PSScriptRoot\start-skylight.ps1"
$label = if ($Source -eq 'radio') { 'your RTL-SDR stick' } else { 'the free internet API (adsb.fi)' }
Show-Message "Skylight now uses $label."
