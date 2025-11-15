!macro customInstall
  ; Check if app is running and warn user
  nsExec::ExecToStack 'tasklist /FI "IMAGENAME eq Kasa Speaker Controller.exe" /NH'
  Pop $0 ; exit code
  Pop $1 ; output

  StrCmp $1 "" install_continue
    MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION "Kasa Speaker Controller is currently running.$\n$\nClick OK to close it and continue installation, or Cancel to exit." IDOK force_close IDCANCEL install_abort

    force_close:
      nsExec::ExecToLog 'taskkill /F /IM "Kasa Speaker Controller.exe"'
      Sleep 2000
      Goto install_continue

    install_abort:
      Abort "Installation cancelled by user"

  install_continue:

  ; Ask about desktop shortcut
  MessageBox MB_YESNO|MB_ICONQUESTION "Would you like to create a Desktop shortcut?" IDYES create_desktop IDNO skip_desktop

  create_desktop:
    CreateShortCut "$DESKTOP\Kasa Speaker Controller.lnk" "$INSTDIR\Kasa Speaker Controller.exe"
    Goto desktop_done

  skip_desktop:
    ; Don't create desktop shortcut
    Goto desktop_done

  desktop_done:
!macroend

!macro customUninstall
  ; Prompt to keep settings
  MessageBox MB_YESNO|MB_ICONQUESTION "Do you want to keep your app settings and configuration?$\n$\nChoose YES to keep your Kasa strip IP address and preferences.$\nChoose NO to delete everything." IDYES keep_settings IDNO delete_all

  delete_all:
    ; Kill running instances
    nsExec::ExecToLog 'taskkill /F /IM "Kasa Speaker Controller.exe"'
    Sleep 1000

    ; Delete AppData folder (config, logs, etc.)
    RMDir /r "$APPDATA\kasa-speaker-controller"

    ; Delete LocalAppData folder (cache, temp files, etc.)
    RMDir /r "$LOCALAPPDATA\kasa-speaker-controller"

    ; Clean up Temp folder entries
    RMDir /r "$TEMP\kasa-speaker-controller"

    ; Clean up registry startup entries
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Kasa Speaker Controller"

    Goto uninstall_done

  keep_settings:
    ; Just kill the process, keep AppData
    nsExec::ExecToLog 'taskkill /F /IM "Kasa Speaker Controller.exe"'
    Sleep 1000

  uninstall_done:
!macroend
