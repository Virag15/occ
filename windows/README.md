# OCC — Windows Install (Portable)

One-machine install for running OCC against real GC Communication data
without any cloud hosting. The whole thing lives on a single Windows PC,
data in a SQLite file on the same machine.

## What you get

- A self-contained OCC install on the PC where TallyPrime already runs
- All data in `database\database.sqlite` — backup = copy that one file
- No internet required after setup (Tally + WhatsApp + OCR stay in
  demo mode by default; flip the env flags once you have those accounts)
- One double-click to launch (`start.bat`)
- One double-click to stop (close the launcher window)

## Prerequisites

These need to be on the system `PATH` *before* you run `setup.bat`:

| Tool | Version | Download |
|---|---|---|
| **PHP** | 8.3+ with `sqlite`, `gd`, `intl`, `mbstring`, `fileinfo`, `dom`, `xml` | https://windows.php.net/download (the "Thread Safe" build) |
| **Composer** | 2.x | https://getcomposer.org/Composer-Setup.exe |
| **Node.js** | 20+ | https://nodejs.org/en/download (LTS) |

After installing each, open a new Command Prompt and verify:
```
php -v
composer -V
node -v
```
All three should print version numbers. If any errors, fix the `PATH`
before continuing.

## First-time setup

1. Extract / clone OCC anywhere — e.g. `C:\OCC\`.
2. Double-click **`windows\setup.bat`**.
   It will:
   - Copy `.env.production.example` → `.env` (with SQLite + local file
     defaults baked in)
   - Generate the app key
   - Install PHP + JS dependencies
   - Create the SQLite database file
   - Run migrations
   - Build the frontend assets
   - Cache config/routes/views for speed
3. Double-click **`windows\create-owner.bat`** and follow the prompts to
   create your first owner account.

This whole flow takes 5–10 minutes on first run. Subsequent launches are
instant.

## Daily use

- **Launch:** double-click `windows\start.bat`. The browser opens to
  http://localhost:8000.
- **Stop:** close the launcher window.

## Where things live

- **Database:** `database\database.sqlite` — back this up regularly.
- **Uploaded evidence (POD, triplicate, LR photos):** `storage\app\private\orders\…` — backup along with the DB.
- **Logs:** `storage\logs\laravel.log` — rotated daily.
- **PDFs generated on the fly:** none stored; regenerated each time.

A weekly script that zips `database\database.sqlite` + `storage\app\private\`
to OneDrive / Google Drive is a sensible backup strategy. The repo
doesn't ship one because the right destination depends on what cloud
storage you already use.

## Tally hookup on the same machine

When OCC and TallyPrime run on the same PC:

1. In TallyPrime: `F12 → Configuration → Advanced Configuration → enable ODBC server` + set port `9000`.
2. Edit `.env`, set `TALLY_ENABLED=true`, `TALLY_HOST=127.0.0.1`, `TALLY_PORT=9000`.
3. Restart OCC (close + reopen `start.bat`).
4. Settings → Integrations → click "Ping". Should respond OK.

Sync runs on a 30-minute cron in production, but on a single Windows PC
you'd kick it off from the Settings page when needed:
```
php artisan tally:sync --type=all --direction=pull
```
Or run the schedule:work loop in a second cmd window:
```
php artisan schedule:work
```

## Updating to a new OCC version

```
git pull
composer install --no-dev
npm ci --legacy-peer-deps
npm run build
php artisan migrate --force
php artisan config:cache route:cache view:cache
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| `setup.bat` says "php not found" | Reinstall PHP and make sure to check "Add to PATH" |
| Browser shows "This site can't be reached" | The launcher window must stay open; if it closed, double-click `start.bat` again |
| "SQLSTATE general error 1: no such table" | Run `php artisan migrate --force` |
| Vite assets missing / blank page | Run `npm run build` again |
| Want to reset everything | Delete `database\database.sqlite`, `vendor\`, `node_modules\`, `public\build\`, then re-run `setup.bat` |

## What this *isn't*

This is a single-PC install — good for one location with a few users on
the same machine. If GC Communication grows to multiple branches or
needs concurrent access from many machines:

- Move to the cloud deploy in `DEPLOYMENT.md`
- Migrate the SQLite file to Postgres (`php artisan db:dump` → restore)
- Point all branches at the cloud URL
