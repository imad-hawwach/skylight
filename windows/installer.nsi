; Skylight for Windows - installer.
; Built by windows/build.sh (makensis runs on macOS/Linux/Windows):
;   makensis -DVERSION=0.1.0 -DSTAGE=build/stage -DOUTFILE=build/Skylight-Setup.exe installer.nsi
;
; Installs per-user (no admin) into %LOCALAPPDATA%\Programs\Skylight, because
; the server keeps its config next to itself. Two optional steps ask for admin
; on their own: the Windows Firewall rule (phone control panel) and Zadig (the
; USB driver for the RTL-SDR stick).
;
; Silent install: Skylight-Setup.exe /S [/SOURCE=radio|api] [/LAT=..] [/LON=..]
;   [/NAME=..] [/AUTOSTART=0|1] [/KIOSK=0|1] [/SKY=sun,moon,planets,stars,satellites,satlabels]
;   [/D=C:\path]   (defaults: api, no location, sky layers untouched)

Unicode true
SetCompressor /SOLID lzma

!ifndef VERSION
  !define VERSION "0.0.0"
!endif
!ifndef STAGE
  !define STAGE "build\stage"
!endif
!ifndef OUTFILE
  !define OUTFILE "build\Skylight-Setup.exe"
!endif

!define APP "Skylight"
!define UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\Skylight"
!define PS '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass'
!define FW_RULE "Skylight control panel"

Name "${APP}"
OutFile "${OUTFILE}"
InstallDir "$LOCALAPPDATA\Programs\Skylight"
InstallDirRegKey HKCU "${UNINST_KEY}" "InstallLocation"
RequestExecutionLevel user
BrandingText "${APP} ${VERSION}"
VIProductVersion "${VERSION}.0"
VIAddVersionKey "ProductName" "${APP}"
VIAddVersionKey "FileDescription" "${APP} installer"
VIAddVersionKey "ProductVersion" "${VERSION}"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "LegalCopyright" "MIT License"

!include "MUI2.nsh"
!include "nsDialogs.nsh"
!include "LogicLib.nsh"
!include "FileFunc.nsh"
!include "WordFunc.nsh"

!define MUI_ICON "skylight.ico"
!define MUI_UNICON "skylight.ico"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TEXT "Skylight projects the aircraft flying over you onto your ceiling in real time, with the sun, moon, stars and the ISS behind them.$\r$\n$\r$\nThis installs everything it needs (no separate Node.js), the dump1090 decoder for an RTL-SDR stick, and a full-screen display for your projector.$\r$\n$\r$\nPlug in the RTL-SDR stick before you continue if you have one."
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_TEXT "Start Skylight now"
!define MUI_FINISHPAGE_RUN_FUNCTION StartSkylight
!define MUI_FINISHPAGE_SHOWREADME
!define MUI_FINISHPAGE_SHOWREADME_TEXT "Show the phone control panel address"
!define MUI_FINISHPAGE_SHOWREADME_FUNCTION ShowAddress
!define MUI_FINISHPAGE_LINK "Build guide and help: skylightceiling.com"
!define MUI_FINISHPAGE_LINK_LOCATION "https://skylightceiling.com/build"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "${STAGE}\app\LICENSE"
Page custom SourcePage SourcePageLeave
Page custom OptionsPage OptionsPageLeave
Page custom SkyPage SkyPageLeave
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

; ---- choices (defaults are the silent-install defaults) ----
Var Source       ; radio | api
Var RunZadig     ; 1 = open Zadig after install
Var Lat
Var Lon
Var PlaceName
Var AutoStart
Var Kiosk
Var Firewall
Var Sky          ; comma list of layers to switch on; "" = leave the config alone
Var Upgrade      ; 1 = a previous install was found

; page controls
Var hRadio
Var hApi
Var hZadig
Var hLat
Var hLon
Var hName
Var hAutoStart
Var hKiosk
Var hFirewall
Var hSun
Var hMoon
Var hPlanets
Var hStars
Var hSats
Var hSatLabels

Function .onInit
  StrCpy $Source "api"
  StrCpy $RunZadig "0"
  StrCpy $Lat ""
  StrCpy $Lon ""
  StrCpy $PlaceName ""
  StrCpy $AutoStart "1"
  StrCpy $Kiosk "1"
  StrCpy $Firewall "0"
  StrCpy $Sky ""
  StrCpy $Upgrade "0"

  ; Interactive installs start from "I have a stick", Accra and a firewall rule.
  ${IfNot} ${Silent}
    StrCpy $Source "radio"
    StrCpy $RunZadig "1"
    StrCpy $Lat "5.6052"
    StrCpy $Lon "-0.1668"
    StrCpy $PlaceName "Kotoka International, Accra"
    StrCpy $Firewall "1"
    StrCpy $Sky "sun,moon,planets,stars,satellites"
  ${EndIf}

  ; A previous install's choices win over the defaults.
  ReadINIStr $R1 "$INSTDIR\skylight.ini" "skylight" "source"
  ${If} $R1 != ""
    StrCpy $Source $R1
    ; Upgrading: keep the location already set (blank = leave it alone).
    StrCpy $Lat ""
    StrCpy $Lon ""
    StrCpy $PlaceName ""
    StrCpy $RunZadig "0"
    StrCpy $Sky ""
    StrCpy $Upgrade "1"
  ${EndIf}

  ; Command-line flags (silent installs) win over both.
  ${GetParameters} $R0
  ClearErrors
  ${GetOptions} $R0 "/SOURCE=" $R1
  ${IfNot} ${Errors}
    StrCpy $Source $R1
  ${EndIf}
  ClearErrors
  ${GetOptions} $R0 "/LAT=" $R1
  ${IfNot} ${Errors}
    StrCpy $Lat $R1
  ${EndIf}
  ClearErrors
  ${GetOptions} $R0 "/LON=" $R1
  ${IfNot} ${Errors}
    StrCpy $Lon $R1
  ${EndIf}
  ClearErrors
  ${GetOptions} $R0 "/NAME=" $R1
  ${IfNot} ${Errors}
    StrCpy $PlaceName $R1
  ${EndIf}
  ClearErrors
  ${GetOptions} $R0 "/AUTOSTART=" $R1
  ${IfNot} ${Errors}
    StrCpy $AutoStart $R1
  ${EndIf}
  ClearErrors
  ${GetOptions} $R0 "/KIOSK=" $R1
  ${IfNot} ${Errors}
    StrCpy $Kiosk $R1
  ${EndIf}
  ClearErrors
  ${GetOptions} $R0 "/SKY=" $R1
  ${IfNot} ${Errors}
    StrCpy $Sky $R1
  ${EndIf}
FunctionEnd

; ---- page 1: where the aircraft come from ----
Function SourcePage
  !insertmacro MUI_HEADER_TEXT "Aircraft data" "Where should Skylight get the planes from? You can switch later from the Start menu."
  nsDialogs::Create 1018
  Pop $0

  ${NSD_CreateRadioButton} 0 0 100% 12u "My RTL-SDR stick (recommended)"
  Pop $hRadio
  ${NSD_CreateLabel} 12u 13u -12u 26u "Decodes the planes' own ADS-B broadcasts with the bundled dump1090 - live, no internet needed. The free internet feed fills gaps (e.g. aircraft on the ground)."
  Pop $0
  ${NSD_CreateCheckbox} 12u 40u -12u 24u "Set up the stick's USB driver now (opens Zadig - needed once per PC; skip if SDR software already works with this stick)"
  Pop $hZadig

  ${NSD_CreateRadioButton} 0 72u 100% 12u "Free internet API only (adsb.fi)"
  Pop $hApi
  ${NSD_CreateLabel} 12u 85u -12u 20u "No hardware. Planes come from a volunteer-run network over the internet, a few seconds behind real time."
  Pop $0

  ${NSD_OnClick} $hRadio SourceChanged
  ${NSD_OnClick} $hApi SourceChanged

  ${If} $Source == "api"
    ${NSD_Check} $hApi
  ${Else}
    ${NSD_Check} $hRadio
  ${EndIf}
  ${If} $RunZadig == "1"
    ${NSD_Check} $hZadig
  ${EndIf}
  Call SourceChanged
  nsDialogs::Show
FunctionEnd

Function SourceChanged
  ${NSD_GetState} $hRadio $0
  ${If} $0 == ${BST_CHECKED}
    EnableWindow $hZadig 1
  ${Else}
    EnableWindow $hZadig 0
  ${EndIf}
FunctionEnd

Function SourcePageLeave
  ${NSD_GetState} $hRadio $0
  ${If} $0 == ${BST_CHECKED}
    StrCpy $Source "radio"
  ${Else}
    StrCpy $Source "api"
  ${EndIf}
  ${NSD_GetState} $hZadig $0
  ${If} $0 == ${BST_CHECKED}
    StrCpy $RunZadig "1"
  ${Else}
    StrCpy $RunZadig "0"
  ${EndIf}
FunctionEnd

; ---- page 2: location and startup ----
Function OptionsPage
  !insertmacro MUI_HEADER_TEXT "Location and startup" "Where you are looking up from, and how Skylight starts."
  nsDialogs::Create 1018
  Pop $0

  ${NSD_CreateLabel} 0 0 100% 20u "Your location (decimal degrees). Leave blank to set it later from the phone control panel, where you can also search a city or airport."
  Pop $0
  ${NSD_CreateLabel} 0 24u 50u 12u "Latitude"
  Pop $0
  ${NSD_CreateText} 52u 22u 70u 12u $Lat
  Pop $hLat
  ${NSD_CreateLabel} 132u 24u 50u 12u "Longitude"
  Pop $0
  ${NSD_CreateText} 184u 22u 70u 12u $Lon
  Pop $hLon
  ${NSD_CreateLabel} 0 40u 50u 12u "Place name"
  Pop $0
  ${NSD_CreateText} 52u 38u 202u 12u $PlaceName
  Pop $hName

  ${NSD_CreateCheckbox} 0 62u 100% 12u "Start Skylight when I sign in to Windows"
  Pop $hAutoStart
  ${NSD_CreateCheckbox} 0 76u 100% 24u "Open the display full-screen on the projector (the second screen if there is one; press Alt+F4 to close it)"
  Pop $hKiosk
  ${NSD_CreateCheckbox} 0 102u 100% 24u "Allow the phone control panel through Windows Firewall (port 3000, private networks; asks for admin)"
  Pop $hFirewall

  ${If} $AutoStart == "1"
    ${NSD_Check} $hAutoStart
  ${EndIf}
  ${If} $Kiosk == "1"
    ${NSD_Check} $hKiosk
  ${EndIf}
  ${If} $Firewall == "1"
    ${NSD_Check} $hFirewall
  ${EndIf}
  nsDialogs::Show
FunctionEnd

Function OptionsPageLeave
  ${NSD_GetText} $hLat $Lat
  ${NSD_GetText} $hLon $Lon
  ${NSD_GetText} $hName $PlaceName
  ${NSD_GetState} $hAutoStart $0
  ${If} $0 == ${BST_CHECKED}
    StrCpy $AutoStart "1"
  ${Else}
    StrCpy $AutoStart "0"
  ${EndIf}
  ${NSD_GetState} $hKiosk $0
  ${If} $0 == ${BST_CHECKED}
    StrCpy $Kiosk "1"
  ${Else}
    StrCpy $Kiosk "0"
  ${EndIf}
  ${NSD_GetState} $hFirewall $0
  ${If} $0 == ${BST_CHECKED}
    StrCpy $Firewall "1"
  ${Else}
    StrCpy $Firewall "0"
  ${EndIf}
FunctionEnd

; ---- page 3: sky layers (first install only; upgrades keep the phone panel's choices) ----
!macro SkyBox HANDLE Y LABEL LAYER
  ${NSD_CreateCheckbox} 0 ${Y} 100% 12u "${LABEL}"
  Pop ${HANDLE}
  ClearErrors
  ${WordFind} ",$Sky," ",${LAYER}," "E*" $0 ; how many times it's listed; error if none
  ${IfNot} ${Errors}
    ${NSD_Check} ${HANDLE}
  ${EndIf}
!macroend

!macro SkyRead HANDLE LAYER
  ${NSD_GetState} ${HANDLE} $0
  ${If} $0 == ${BST_CHECKED}
    StrCpy $Sky "$Sky${LAYER},"
  ${EndIf}
!macroend

Function SkyPage
  ${If} $Upgrade == "1"
    Abort
  ${EndIf}
  !insertmacro MUI_HEADER_TEXT "Sky layers" "What to draw behind the planes, at their true positions for your location and time."
  nsDialogs::Create 1018
  Pop $0

  !insertmacro SkyBox $hSun 0 "Sun" "sun"
  !insertmacro SkyBox $hMoon 14u "Moon (with its phase)" "moon"
  !insertmacro SkyBox $hPlanets 28u "Planets (Venus, Jupiter, Mars, Saturn, Mercury)" "planets"
  !insertmacro SkyBox $hStars 42u "Bright stars and constellations (Orion, Southern Cross, Scorpius, Leo and more)" "stars"
  !insertmacro SkyBox $hSats 56u "Satellites passing overhead, including the ISS" "satellites"
  !insertmacro SkyBox $hSatLabels 70u "Name every satellite (busier; the ISS is always named)" "satlabels"

  ${NSD_CreateLabel} 0 92u 100% 30u "All of these, each constellation, star density and labels can be changed any time from the phone control panel (Sky section)."
  Pop $0
  nsDialogs::Show
FunctionEnd

Function SkyPageLeave
  StrCpy $Sky ""
  !insertmacro SkyRead $hSun "sun"
  !insertmacro SkyRead $hMoon "moon"
  !insertmacro SkyRead $hPlanets "planets"
  !insertmacro SkyRead $hStars "stars"
  !insertmacro SkyRead $hSats "satellites"
  !insertmacro SkyRead $hSatLabels "satlabels"
  ; Nothing ticked still has to reach configure.mjs (as "all off").
  ${If} $Sky == ""
    StrCpy $Sky "none"
  ${EndIf}
FunctionEnd

; ---- install ----
!macro PsShortcut LINK SCRIPT ARGS DESC
  CreateShortCut "${LINK}" "$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" \
    '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\launcher\${SCRIPT}" ${ARGS}' \
    "$INSTDIR\skylight.ico" 0 SW_SHOWMINIMIZED "" "${DESC}"
!macroend

Section "Skylight" SecMain
  SectionIn RO

  ; Upgrading over a running copy: stop it so its files can be replaced.
  ${If} ${FileExists} "$INSTDIR\launcher\stop-skylight.ps1"
    DetailPrint "Stopping the running Skylight..."
    nsExec::Exec '${PS} -File "$INSTDIR\launcher\stop-skylight.ps1" -Quiet'
    Pop $0
  ${EndIf}

  SetOutPath "$INSTDIR"
  File "skylight.ico"
  File /r "${STAGE}\node"
  File /r "${STAGE}\launcher"
  File /r "${STAGE}\zadig"
  ; Old app files out, kept config/caches in (app\server\data).
  RMDir /r "$INSTDIR\app\web"
  RMDir /r "$INSTDIR\app\server\dist"
  File /r "${STAGE}\app"
  ; dump1090 keeps its aircraft database + logs next to itself; overwrite the program only.
  File /r "${STAGE}\dump1090"
  CreateDirectory "$INSTDIR\logs"

  ; Launcher settings.
  WriteINIStr "$INSTDIR\skylight.ini" "skylight" "source" "$Source"
  WriteINIStr "$INSTDIR\skylight.ini" "skylight" "kiosk" "$Kiosk"
  ReadINIStr $0 "$INSTDIR\skylight.ini" "skylight" "port"
  ${If} $0 == ""
    WriteINIStr "$INSTDIR\skylight.ini" "skylight" "port" "3000"
  ${EndIf}
  ReadINIStr $0 "$INSTDIR\skylight.ini" "skylight" "monitor"
  ${If} $0 == ""
    WriteINIStr "$INSTDIR\skylight.ini" "skylight" "monitor" "0"
  ${EndIf}
  ReadINIStr $0 "$INSTDIR\skylight.ini" "skylight" "browser"
  ${If} $0 == ""
    WriteINIStr "$INSTDIR\skylight.ini" "skylight" "browser" "auto"
  ${EndIf}

  ; Location into the server config.
  DetailPrint "Saving your location and sky layers..."
  StrCpy $1 ""
  ${If} $Sky != ""
    StrCpy $1 '--sky="$Sky"'
  ${EndIf}
  nsExec::ExecToLog '"$INSTDIR\node\node.exe" "$INSTDIR\launcher\configure.mjs" --lat="$Lat" --lon="$Lon" --name="$PlaceName" $1'
  Pop $0
  ${If} $0 != "0"
  ${AndIfNot} ${Silent}
    MessageBox MB_ICONEXCLAMATION "The location wasn't saved (it didn't look like latitude/longitude). Set it from the phone control panel after install."
  ${EndIf}

  ; Shortcuts.
  CreateDirectory "$SMPROGRAMS\Skylight"
  !insertmacro PsShortcut "$SMPROGRAMS\Skylight\Skylight.lnk" "start-skylight.ps1" "" "Start Skylight"
  !insertmacro PsShortcut "$SMPROGRAMS\Skylight\Stop Skylight.lnk" "stop-skylight.ps1" "" "Stop Skylight"
  !insertmacro PsShortcut "$SMPROGRAMS\Skylight\Use RTL-SDR stick.lnk" "set-source.ps1" "-Source radio" "Get planes from your RTL-SDR stick"
  !insertmacro PsShortcut "$SMPROGRAMS\Skylight\Use free internet API.lnk" "set-source.ps1" "-Source api" "Get planes from the free adsb.fi feed"
  !insertmacro PsShortcut "$SMPROGRAMS\Skylight\Phone control panel address.lnk" "show-address.ps1" "" "Show the control panel address for your phone"
  CreateShortCut "$SMPROGRAMS\Skylight\Install RTL-SDR USB driver (Zadig).lnk" "$INSTDIR\zadig\zadig.exe"
  CreateShortCut "$SMPROGRAMS\Skylight\Logs.lnk" "$INSTDIR\logs"
  CreateShortCut "$SMPROGRAMS\Skylight\Settings (skylight.ini).lnk" "notepad.exe" '"$INSTDIR\skylight.ini"'
  CreateShortCut "$SMPROGRAMS\Skylight\Uninstall Skylight.lnk" "$INSTDIR\Uninstall.exe"
  !insertmacro PsShortcut "$DESKTOP\Skylight.lnk" "start-skylight.ps1" "" "Start Skylight"

  Delete "$SMSTARTUP\Skylight.lnk"
  ${If} $AutoStart == "1"
    !insertmacro PsShortcut "$SMSTARTUP\Skylight.lnk" "start-skylight.ps1" "-Quiet" "Start Skylight"
  ${EndIf}

  ; Uninstaller + Apps & features entry.
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayName" "${APP}"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNINST_KEY}" "Publisher" "Skylight"
  WriteRegStr HKCU "${UNINST_KEY}" "URLInfoAbout" "https://skylightceiling.com"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayIcon" "$INSTDIR\skylight.ico"
  WriteRegStr HKCU "${UNINST_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINST_KEY}" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegStr HKCU "${UNINST_KEY}" "QuietUninstallString" '"$INSTDIR\Uninstall.exe" /S'
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoRepair" 1
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKCU "${UNINST_KEY}" "EstimatedSize" "$0"

  ; Admin-only extras, each behind its own UAC prompt.
  ${If} $Firewall == "1"
    DetailPrint "Adding the Windows Firewall rule (asks for admin)..."
    ExecShellWait "runas" "$SYSDIR\netsh.exe" 'advfirewall firewall delete rule name="${FW_RULE}"' SW_HIDE
    ExecShellWait "runas" "$SYSDIR\netsh.exe" 'advfirewall firewall add rule name="${FW_RULE}" dir=in action=allow protocol=TCP localport=3000 profile=private,domain' SW_HIDE
    WriteINIStr "$INSTDIR\skylight.ini" "skylight" "firewall" "1"
  ${EndIf}

  ${If} $Source == "radio"
  ${AndIf} $RunZadig == "1"
  ${AndIfNot} ${Silent}
    MessageBox MB_OKCANCEL|MB_ICONINFORMATION "Next, Zadig installs the USB driver for your RTL-SDR stick:$\r$\n$\r$\n1. Make sure the stick is plugged in.$\r$\n2. Pick $\"Bulk-In, Interface (Interface 0)$\" (or RTL2832U / RTL2838UHIDIR) in the list. If it isn't there, tick Options > List All Devices.$\r$\n3. Leave the target driver as WinUSB and click Install Driver (or Replace Driver).$\r$\n4. Close Zadig when it says the driver was installed.$\r$\n$\r$\nNever pick your keyboard, mouse or another device. You can run this again later from Start > Skylight." IDCANCEL skipZadig
      ExecShellWait "open" "$INSTDIR\zadig\zadig.exe"
    skipZadig:
  ${EndIf}
SectionEnd

Function StartSkylight
  Exec '${PS} -WindowStyle Hidden -File "$INSTDIR\launcher\start-skylight.ps1"'
FunctionEnd

Function ShowAddress
  Exec '${PS} -WindowStyle Hidden -File "$INSTDIR\launcher\show-address.ps1"'
FunctionEnd

; ---- uninstall ----
Section "Uninstall"
  nsExec::Exec '${PS} -File "$INSTDIR\launcher\stop-skylight.ps1" -Quiet'
  Pop $0

  ReadINIStr $0 "$INSTDIR\skylight.ini" "skylight" "firewall"
  ${If} $0 == "1"
    ExecShellWait "runas" "$SYSDIR\netsh.exe" 'advfirewall firewall delete rule name="${FW_RULE}"' SW_HIDE
  ${EndIf}

  Delete "$SMSTARTUP\Skylight.lnk"
  Delete "$DESKTOP\Skylight.lnk"
  RMDir /r "$SMPROGRAMS\Skylight"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "${UNINST_KEY}"
SectionEnd
