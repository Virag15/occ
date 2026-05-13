@echo off
REM ─────────────────────────────────────────────────────────────────────
REM  OCC — First-run setup script (Windows)
REM
REM  Run this ONCE on a new machine. Idempotent — running it twice is safe.
REM
REM  Steps it performs (each is skipped if already done):
REM    1. Verify required tools are on PATH (PHP, Composer, Node, npm)
REM    2. Copy .env.production.example → .env with local-friendly defaults
REM    3. Generate APP_KEY
REM    4. Create the SQLite database file
REM    5. composer install --no-dev (with retry on network failure)
REM    6. php artisan migrate --force
REM    7. npm ci + npm run build (with retry)
REM    8. php artisan storage:link + config/route/view cache
REM    9. Prompt to run create-owner.bat next
REM
REM  NOTE on SmartScreen / Antivirus:
REM    .bat files downloaded from the internet may be tagged with a
REM    "Zone.Identifier" marker. If Windows blocks this script:
REM      • Right-click → Properties → tick "Unblock" → OK, OR
REM      • Open PowerShell as admin and run:
REM          Unblock-File -Path "%~f0"
REM    This script does NOT download anything itself — all network access
REM    goes through Composer and npm using their normal HTTPS, which
REM    SmartScreen treats as safe.
REM ─────────────────────────────────────────────────────────────────────

setlocal enabledelayedexpansion

REM Move to the repo root (parent of this script)
cd /d "%~dp0\.."

echo.
echo ===================================================================
echo   OCC SETUP
echo ===================================================================
echo.

REM ───── 1. Verify required tools ────────────────────────────────────
echo [1/9] Checking prerequisites...

set MISSING=0
where php >nul 2>&1 || (echo   - PHP not found on PATH & set MISSING=1)
where composer >nul 2>&1 || (echo   - Composer not found on PATH & set MISSING=1)
where node >nul 2>&1 || (echo   - Node not found on PATH & set MISSING=1)
where npm >nul 2>&1 || (echo   - npm not found on PATH & set MISSING=1)

if "%MISSING%"=="1" (
    echo.
    echo One or more tools are missing. Install:
    echo   PHP 8.4+    https://windows.php.net/download
    echo   Composer 2  https://getcomposer.org/Composer-Setup.exe
    echo   Node 20+    https://nodejs.org
    echo Then open a fresh Command Prompt and re-run setup.bat.
    echo.
    pause
    exit /b 1
)

REM Verify PHP version is 8.4 or higher (Laravel requires it per composer.json).
for /f "tokens=*" %%v in ('php -r "echo PHP_VERSION;"') do set PHP_VERSION=%%v
echo   PHP %PHP_VERSION% detected.
php -r "exit(version_compare(PHP_VERSION,'8.4.0','>=') ? 0 : 1);"
if errorlevel 1 (
    echo.
    echo ERROR: OCC requires PHP 8.4 or higher (detected %PHP_VERSION%).
    echo Upgrade from https://windows.php.net/download and retry.
    echo.
    pause
    exit /b 1
)

REM ───── 2. .env ─────────────────────────────────────────────────────
echo [2/9] Setting up .env...

if not exist ".env" (
    if not exist ".env.production.example" (
        echo ERROR: .env.production.example missing. Repo is incomplete.
        pause
        exit /b 1
    )
    copy ".env.production.example" ".env" >nul
    REM Default to SQLite + local file storage for single-machine installs.
    REM PowerShell here only edits a local file — no network, SmartScreen-safe.
    powershell -NoProfile -ExecutionPolicy Bypass -Command "(Get-Content .env) -replace '^APP_ENV=.*','APP_ENV=local' -replace '^APP_DEBUG=.*','APP_DEBUG=true' -replace '^APP_URL=.*','APP_URL=http://localhost:8000' -replace '^DB_CONNECTION=.*','DB_CONNECTION=sqlite' -replace '^SESSION_DRIVER=.*','SESSION_DRIVER=file' -replace '^CACHE_STORE=.*','CACHE_STORE=file' -replace '^QUEUE_CONNECTION=.*','QUEUE_CONNECTION=sync' -replace '^BROADCAST_CONNECTION=.*','BROADCAST_CONNECTION=log' | Set-Content .env"
    echo   .env created with SQLite + local file defaults.
) else (
    echo   .env already exists, keeping it.
)

REM ───── 3. APP_KEY ──────────────────────────────────────────────────
echo [3/9] Generating APP_KEY (if missing)...
findstr /B "APP_KEY=base64:" .env >nul
if errorlevel 1 (
    php artisan key:generate --ansi --force
) else (
    echo   APP_KEY already present.
)

REM ───── 4. SQLite DB ────────────────────────────────────────────────
echo [4/9] Creating SQLite database file...
if not exist "database\database.sqlite" (
    if not exist "database" mkdir database
    type nul > "database\database.sqlite"
    echo   database\database.sqlite created.
) else (
    echo   database\database.sqlite already exists.
)

REM ───── 5. PHP dependencies (with one retry on transient failures) ──
echo [5/9] Installing PHP dependencies (this can take a few minutes)...
if exist "vendor" (
    echo   vendor\ exists, skipping. Delete vendor\ to force reinstall.
    goto composer_done
)

composer install --no-dev --prefer-dist --no-progress --no-interaction
if errorlevel 1 (
    echo   First attempt failed; clearing cache and retrying once...
    composer clear-cache >nul 2>&1
    composer install --no-dev --prefer-dist --no-progress --no-interaction
    if errorlevel 1 (
        echo.
        echo COMPOSER INSTALL FAILED. Common causes:
        echo   - No internet, or firewall blocking https://packagist.org
        echo   - Antivirus blocking composer.phar
        echo   - PHP missing 'zip' or 'curl' extension
        echo Run "composer diagnose" to inspect.
        echo.
        pause
        exit /b 1
    )
)

:composer_done

REM ───── 6. Migrations ───────────────────────────────────────────────
echo [6/9] Running migrations...
php artisan migrate --force --no-interaction
if errorlevel 1 (
    echo.
    echo MIGRATIONS FAILED. Inspect output above. The DB file may be
    echo write-protected, or a previous run left it in a broken state.
    pause
    exit /b 1
)

REM ───── 7. JS deps + frontend build (with one retry) ────────────────
echo [7/9] Installing JS dependencies (3-5 minutes first time)...
if exist "node_modules" (
    echo   node_modules\ exists, skipping install. Delete to force.
    goto js_done
)

call npm ci --legacy-peer-deps
if errorlevel 1 (
    echo   npm ci failed; retrying once...
    call npm ci --legacy-peer-deps
    if errorlevel 1 (
        echo.
        echo NPM INSTALL FAILED. Check internet + npm registry access:
        echo   npm config get registry
        echo Should print https://registry.npmjs.org/
        echo.
        pause
        exit /b 1
    )
)

:js_done

echo   Building frontend assets...
call npm run build
if errorlevel 1 (
    echo BUILD FAILED. Check the error above.
    pause
    exit /b 1
)

REM ───── 8. Caches ───────────────────────────────────────────────────
echo [8/9] Linking storage + caching config...
php artisan storage:link >nul 2>&1
php artisan config:cache
php artisan route:cache
php artisan view:cache

REM ───── 9. Done ─────────────────────────────────────────────────────
echo.
echo ===================================================================
echo   SETUP COMPLETE
echo ===================================================================
echo.
echo Next step: create your owner account by double-clicking
echo   windows\create-owner.bat
echo.
echo Then launch OCC with windows\start.bat (it opens your browser).
echo.

endlocal
pause
