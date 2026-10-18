# Restart only the RTL-SDR decoder with the current location as its home
# position. The server runs this after the location moves far: dump1090 reads
# homepos once at start and drops every position more than 500 km from it.
# Does nothing unless the stick is the selected source.

. "$PSScriptRoot\common.ps1"

$s = Read-Settings
if ($s.source -ne 'radio' -or -not (Test-Path $DumpExe)) { exit 0 }

Stop-Dump1090
Start-Dump1090
