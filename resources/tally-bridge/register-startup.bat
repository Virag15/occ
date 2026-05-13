@echo off
REM ─────────────────────────────────────────────────────────────────────
REM  Register the Tally bridge to auto-start when Windows boots.
REM
REM  Creates a shortcut in the user's Startup folder that launches
REM  tally-bridge.bat at login. After running this once, the bridge
REM  runs in the background whenever the PC boots — no need to
REM  double-click anything manually.
REM
REM  To un-register, run unregister-startup.bat.
REM ─────────────────────────────────────────────────────────────────────

setlocal

set BRIDGE=%~dp0tally-bridge.bat
set STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup

if not exist "%BRIDGE%" (
    echo ERROR: tally-bridge.bat not found next to this script.
    pause & exit /b 1
)

REM PowerShell shortcut creation — local-only, no internet, SmartScreen-safe.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$s = (New-Object -COM WScript.Shell).CreateShortcut('%STARTUP%\OCC Tally Bridge.lnk');" ^
    "$s.TargetPath = '%BRIDGE%';" ^
    "$s.WorkingDirectory = '%~dp0';" ^
    "$s.IconLocation = '%SystemRoot%\System32\shell32.dll,167';" ^
    "$s.Description = 'OCC ↔ Tally bridge daemon';" ^
    "$s.Save()"

if errorlevel 1 (
    echo Failed to create the shortcut. Check that you have write access
    echo to your Startup folder:
    echo   %STARTUP%
    pause & exit /b 1
)

echo.
echo Done. The Tally bridge will start automatically on next Windows boot.
echo Shortcut: %STARTUP%\OCC Tally Bridge.lnk
echo.
echo To start it right now without rebooting, double-click tally-bridge.bat.
echo To remove from startup, run unregister-startup.bat.
echo.
pause

endlocal
