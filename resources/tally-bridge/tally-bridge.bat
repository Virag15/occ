@echo off
REM ─────────────────────────────────────────────────────────────────────
REM  OCC ↔ Tally Bridge — daemon launcher
REM
REM  Drop this file inside your OCC installation folder (the same folder
REM  that contains setup.bat). Double-click to start the bridge. It does
REM  two things:
REM
REM    1. Pings TallyPrime every 60 seconds at http://127.0.0.1:9000
REM       (where TallyPrime's ODBC server lives). Reports up/down to the
REM       OCC log.
REM    2. Runs `php artisan schedule:work` so the every-30-min Tally
REM       pull + nightly reconcile actually fire.
REM
REM  Tally configuration on this PC (one-time):
REM    Open TallyPrime → F12 (Configure) → Advanced Configuration
REM    → enable "Tally.NET Server" (or "ODBC Server" on older versions)
REM    → set Port: 9000 → save.
REM  Then in OCC's .env: TALLY_ENABLED=true (default is false).
REM
REM  Close this window to stop the bridge. Re-open it to resume.
REM ─────────────────────────────────────────────────────────────────────

setlocal

REM Hop to OCC root (parent of this file, since users typically drop it
REM straight into the OCC folder; if it lives somewhere else, edit the
REM next line to point at the OCC root).
cd /d "%~dp0"

if not exist "artisan" (
    echo.
    echo ERROR: artisan not found in %CD%.
    echo Move tally-bridge.bat into your OCC installation folder
    echo ^(the folder that contains setup.bat^) and try again.
    echo.
    pause
    exit /b 1
)

where php >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: PHP not found on PATH. Run setup.bat first, or reinstall
    echo PHP with the "Add to PATH" option ticked.
    echo.
    pause
    exit /b 1
)

echo.
echo ===================================================================
echo   OCC ↔ Tally Bridge
echo ===================================================================
echo.
echo Watching TallyPrime at http://127.0.0.1:9000
echo Schedule worker running (Tally pulls every 30 min).
echo.
echo Close this window to stop the bridge.
echo.

REM A quick connection check up front so the user sees right away if
REM Tally isn't listening on 9000.
php artisan tally:sync --check
if errorlevel 1 (
    echo.
    echo WARNING: Initial Tally ping failed. The bridge will keep running
    echo and retry on each scheduled tick — fix Tally's ODBC server then
    echo this will recover automatically.
    echo.
)

REM schedule:work blocks here until the window is closed. It re-runs
REM the schedule every minute (Laravel's default), so the every-30-min
REM tally:sync fires automatically.
php artisan schedule:work

endlocal
