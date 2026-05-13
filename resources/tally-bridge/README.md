# OCC ↔ Tally Bridge

Drop these three files inside your OCC installation folder — the same
folder that contains `setup.bat` and `start.bat`. They turn your Windows
PC into a Tally bridge: OCC pulls masters + stock + vouchers every 30
minutes, pushes new sales orders + receipts in near-real-time, and you
never have to type a customer/product/payment twice.

## Files

| File | What it does |
|---|---|
| `tally-bridge.bat` | Daemon. Double-click to start. Closes when you close the window. |
| `register-startup.bat` | One-time setup: makes the bridge launch automatically when Windows boots. |
| `unregister-startup.bat` | Reverse the above if you want manual control again. |

## One-time setup

1. **Configure TallyPrime to expose its data**
   - Open TallyPrime.
   - Press `F12` (Configure) → Advanced Configuration.
   - Enable **Tally.NET Server** (called **ODBC Server** on older Tally
     versions). Set Port to `9000`. Save.
   - Keep TallyPrime running. The bridge talks to it over
     `http://127.0.0.1:9000`.

2. **Tell OCC the bridge is live**
   - Open `.env` in your OCC folder.
   - Change `TALLY_ENABLED=false` → `TALLY_ENABLED=true`.
   - Save.

3. **Drop these files into the OCC folder** (the one with `setup.bat`).

4. **Run `register-startup.bat` once.** You'll see "Done." — the bridge
   now auto-runs on every boot.

5. **Start it manually for the first time**: double-click
   `tally-bridge.bat`. A small black window opens and stays open — that's
   the bridge running. Closing the window stops the bridge.

## Verifying it works

- Open OCC in your browser → **Settings → Integrations**.
- The Tally row should show **Connected** (green dot).
- Click **Sync now → Pull all**. You should see customer/product counts
  go up in OCC, matching what's in TallyPrime.

## Daily operation

The bridge runs `php artisan schedule:work` under the hood, so:

- Every **30 minutes**: pulls masters, stock, and recent vouchers.
- Every night at **02:00**: full reconcile (push our new orders +
  receipts back to Tally, pull anything Tally added externally).
- On every order delivery: OCC auto-pushes the sales voucher.
- On every payment recorded: OCC auto-pushes the receipt voucher.

The bridge window logs each tick. If TallyPrime is closed or the ODBC
port isn't responding, the bridge keeps retrying on the next tick and
recovers automatically when Tally comes back.

## Troubleshooting

| Symptom | Fix |
|---|---|
| "ERROR: artisan not found" | The bridge files aren't in the OCC folder. Move them next to `setup.bat`. |
| "ERROR: PHP not found on PATH" | Run `setup.bat` first, or reinstall PHP and tick "Add to PATH". |
| Bridge says "WARNING: Initial Tally ping failed" | TallyPrime isn't running, or the ODBC server isn't on port 9000. Fix Tally's F12 config. |
| OCC Settings → Integrations shows red dot | Same — check Tally is open + listening. Click **Ping** to retest. |
| Want to stop the bridge temporarily | Close the `tally-bridge.bat` window. To stop permanent auto-start, run `unregister-startup.bat`. |

## SmartScreen note

Windows may prompt "Windows protected your PC" the first time you
double-click any of these `.bat` files. Click **More info → Run anyway**,
or right-click the file → Properties → tick **Unblock**. None of the
scripts download anything — they only run local commands. The prompt
just appears because the files came from outside the PC.
