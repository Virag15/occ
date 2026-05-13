@echo off
REM ─────────────────────────────────────────────────────────────────────
REM  Create the first owner account (one-time, after setup.bat).
REM  Prompts for name / email / password and creates the user with
REM  role=owner + email_verified_at=now so login works immediately.
REM ─────────────────────────────────────────────────────────────────────

cd /d "%~dp0\.."

set /p OCC_NAME=Your full name:
set /p OCC_EMAIL=Email:

REM Password input is echoed — Windows cmd doesn't have a portable
REM masked-input primitive without PowerShell. Acceptable for a
REM one-machine install.
set /p OCC_PASSWORD=Password (min 8 chars):

php artisan tinker --execute="\App\Models\User::create(['name'=>'%OCC_NAME%','email'=>'%OCC_EMAIL%','password'=>bcrypt('%OCC_PASSWORD%'),'role'=>'owner','email_verified_at'=>now()]); echo 'Owner created. Run start.bat to launch OCC.';"

pause
