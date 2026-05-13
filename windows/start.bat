@echo off
REM ─────────────────────────────────────────────────────────────────────
REM  OCC — Launcher
REM
REM  Double-click to:
REM    1. Boot the Laravel dev server on http://localhost:8000
REM    2. Open the default browser to that URL
REM    3. Keep this window open — closing it stops the server
REM
REM  If you haven't run setup.bat yet, do that first.
REM ─────────────────────────────────────────────────────────────────────

cd /d "%~dp0\.."

REM Sanity check: bail with a clear message if setup hasn't run.
if not exist ".env" (
    echo.
    echo ERROR: .env not found. Run setup.bat first.
    echo.
    pause
    exit /b 1
)
if not exist "vendor" (
    echo.
    echo ERROR: vendor\ not found. Run setup.bat first.
    echo.
    pause
    exit /b 1
)
if not exist "public\build\manifest.json" (
    if not exist "public\hot" (
        echo.
        echo ERROR: frontend assets not built. Run setup.bat first.
        echo.
        pause
        exit /b 1
    )
)

REM Open browser after a 2-second delay so the server has time to bind.
start "" /b cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:8000"

echo.
echo === OCC running at http://localhost:8000 ===
echo.
echo Close this window to stop OCC.
echo.

REM Bind to 127.0.0.1 only — single-machine install, no LAN exposure.
php artisan serve --host=127.0.0.1 --port=8000
