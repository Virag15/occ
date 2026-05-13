@echo off
REM ─────────────────────────────────────────────────────────────────────
REM  Remove the Tally bridge from Windows auto-start.
REM  Counterpart to register-startup.bat.
REM ─────────────────────────────────────────────────────────────────────

set SHORTCUT=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\OCC Tally Bridge.lnk

if exist "%SHORTCUT%" (
    del "%SHORTCUT%"
    echo Removed: %SHORTCUT%
) else (
    echo Already absent (no shortcut at %SHORTCUT%).
)

echo.
pause
