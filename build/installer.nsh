; ─────────────────────────────────────────────────────────────────────────
; Attensi Time Tracker — custom NSIS hooks
;
; preInit  : detect a previous installation and let the user pick between
;            "Update" (default — preserve %APPDATA%\Attensi Time Tracker)
;            and "Fresh install" (delete previous app + user data after a
;            confirmation dialog).
;
; The variable `Attensi.FreshInstall` is set to "1" when the user chose to
; wipe data; preInstall then nukes the app data folder before files are
; written.
;
; Notes:
; - electron-builder injects its own uninstaller logic. We keep this script
;   focused on data migration; it does not attempt to spawn the previous
;   uninstaller.
; - Quoted paths are required because "Attensi Time Tracker" has a space.
; ─────────────────────────────────────────────────────────────────────────

Var Attensi.FreshInstall
Var Attensi.PrevDir

!macro customInit
  StrCpy $Attensi.FreshInstall "0"
  StrCpy $Attensi.PrevDir ""

  ; electron-builder writes the install dir under HKCU when perMachine is false.
  ReadRegStr $Attensi.PrevDir HKCU "Software\${PRODUCT_NAME}" "InstallLocation"
  ${If} $Attensi.PrevDir == ""
    ReadRegStr $Attensi.PrevDir HKLM "Software\${PRODUCT_NAME}" "InstallLocation"
  ${EndIf}

  ${If} $Attensi.PrevDir != ""
    MessageBox MB_YESNOCANCEL|MB_ICONQUESTION \
      "An existing install of ${PRODUCT_NAME} was found at:$\r$\n  $Attensi.PrevDir$\r$\n$\r$\nClick YES to update (your data is preserved).$\r$\nClick NO for a fresh install (your data and the previous app folder will be deleted).$\r$\nClick CANCEL to abort." \
      /SD IDYES \
      IDYES Attensi.Update IDNO Attensi.Fresh
    Abort

    Attensi.Fresh:
      MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION \
        "This will permanently delete:$\r$\n  $Attensi.PrevDir$\r$\n  $APPDATA\${PRODUCT_NAME}$\r$\n$\r$\nContinue?" \
        /SD IDOK \
        IDOK Attensi.FreshConfirmed
      Abort
      Attensi.FreshConfirmed:
        StrCpy $Attensi.FreshInstall "1"
        Goto Attensi.InitDone

    Attensi.Update:
      ; Default electron-builder behavior already preserves user data.
      Goto Attensi.InitDone
  ${EndIf}

  Attensi.InitDone:
!macroend

!macro customInstall
  ${If} $Attensi.FreshInstall == "1"
    ; Wipe user data before the new install lays down a clean profile.
    RMDir /r "$APPDATA\${PRODUCT_NAME}"
    ; Clean the previous install folder too, in case the unpack dir changed.
    ${If} $Attensi.PrevDir != ""
      RMDir /r "$Attensi.PrevDir"
    ${EndIf}
  ${EndIf}
!macroend
