@echo off
REM ─────────────────────────────────────────────────────────────────────
REM  OCC — First-run setup script
REM
REM  Run this ONCE on a new machine. It:
REM    1. Creates .env from the production example (if missing)
REM    2. Generates the APP_KEY
REM    3. Creates the SQLite database file
REM    4. Runs all migrations
REM    5. Builds the frontend assets
REM    6. Prompts you to create the first owner user
REM
REM  Requirements (must be on PATH before running this):
REM    - PHP 8.3+ (with sqlite, gd, intl, mbstring, fileinfo extensions)
REM    - Composer 2.x
REM    - Node 20+ and npm
REM
REM  Drop a portable PHP into windows\php\ and run install-deps.bat first
REM  if you don't want to install PHP system-wide.
REM ─────────────────────────────────────────────────────────────────────

setlocal enabledelayedexpansion

REM Move to the repo root (parent of this script)
cd /d "%~dp0\.."

echo.
echo === OCC setup starting ===
echo.

REM ───── 1. .env ─────────────────────────────────────────────────────
if not exist ".env" (
    echo Creating .env from .env.production.example...
    copy ".env.production.example" ".env" >nul
    REM Default to SQLite + local file storage for single-machine installs
    powershell -Command "(Get-Content .env) -replace '^APP_ENV=.*','APP_ENV=local' -replace '^APP_DEBUG=.*','APP_DEBUG=true' -replace '^APP_URL=.*','APP_URL=http://localhost:8000' -replace '^DB_CONNECTION=.*','DB_CONNECTION=sqlite' -replace '^DB_HOST=.*','# DB_HOST=127.0.0.1' -replace '^DB_PORT=.*','# DB_PORT=5432' -replace '^DB_DATABASE=.*','# DB_DATABASE=occ_production' -replace '^DB_USERNAME=.*','# DB_USERNAME=occ' -replace '^DB_PASSWORD=.*','# DB_PASSWORD=' -replace '^SESSION_DRIVER=.*','SESSION_DRIVER=file' -replace '^CACHE_STORE=.*','CACHE_STORE=file' -replace '^QUEUE_CONNECTION=.*','QUEUE_CONNECTION=sync' | Set-Content .env"
) else (
    echo .env already exists — keeping it.
)

REM ───── 2. APP_KEY ──────────────────────────────────────────────────
findstr /B "APP_KEY=base64:" .env >nul
if errorlevel 1 (
    echo Generating APP_KEY...
    php artisan key:generate --ansi --force
)

REM ───── 3. SQLite DB ────────────────────────────────────────────────
if not exist "database\database.sqlite" (
    echo Creating SQLite database file...
    if not exist "database" mkdir database
    type nul > "database\database.sqlite"
)

REM ───── 4. PHP dependencies ─────────────────────────────────────────
if not exist "vendor" (
    echo Installing PHP dependencies via Composer...
    composer install --no-dev --prefer-dist --no-progress --no-interaction
    if errorlevel 1 (
        echo.
        echo COMPOSER INSTALL FAILED. Check the error above.
        exit /b 1
    )
)

REM ───── 5. Migrations ───────────────────────────────────────────────
echo Running migrations...
php artisan migrate --force --no-interaction
if errorlevel 1 (
    echo.
    echo MIGRATIONS FAILED. Check the error above.
    exit /b 1
)

REM ───── 6. Frontend build ───────────────────────────────────────────
if not exist "node_modules" (
    echo Installing JS dependencies (this may take 3-5 minutes)...
    call npm ci --legacy-peer-deps
    if errorlevel 1 (
        echo NPM INSTALL FAILED. Check the error above.
        exit /b 1
    )
)

echo Building frontend assets...
call npm run build
if errorlevel 1 (
    echo BUILD FAILED. Check the error above.
    exit /b 1
)

REM ───── 7. Storage symlink ──────────────────────────────────────────
echo Linking public storage...
php artisan storage:link

REM ───── 8. Cache config for speed ───────────────────────────────────
php artisan config:cache
php artisan route:cache
php artisan view:cache

REM ───── 9. First user prompt ────────────────────────────────────────
echo.
echo === Setup complete! ===
echo.
echo Next: create the owner account by running:
echo.
echo     php artisan tinker
echo     ^>^>^> App\Models\User::create(['name'=^>'Your Name','email'=^>'you@example.com','password'=^>bcrypt('your-password'),'role'=^>'owner','email_verified_at'=^>now()]);
echo     ^>^>^> exit
echo.
echo Then double-click start.bat to launch OCC.
echo.

endlocal
