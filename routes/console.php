<?php

use App\Models\AuditLog;
use App\Models\IdempotencyKey;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// ─── Scheduled tasks ────────────────────────────────────────────────
// Cron entry on the server (per DEPLOYMENT.md):
//   * * * * * cd /path/to/occ && php artisan schedule:run >> /dev/null 2>&1

// Tally bridge: pull masters + stock + vouchers every 30 minutes. No-op when
// TALLY_ENABLED=false (the underlying client short-circuits). Overlap-safe via
// withoutOverlapping so a slow sync doesn't stack runs.
Schedule::command('tally:sync --type=all --direction=pull')
    ->everyThirtyMinutes()
    ->withoutOverlapping(20) // release lock if stuck >20 min
    ->runInBackground()
    ->onOneServer();

// Tally reconcile: deeper job, pulls *and* pushes deltas. Once nightly is enough.
Schedule::command('tally:sync --type=reconcile')
    ->dailyAt('02:00')
    ->withoutOverlapping(60)
    ->runInBackground()
    ->onOneServer();

// Payment reminders: D+1 then weekly cadence. Sends WhatsApp templates to
// overdue customers. No-op when WHATSAPP_ENABLED=false (still logs).
Schedule::command('reminders:send-payments')
    ->dailyAt('10:00')
    ->onOneServer();

// Audit log retention: trim entries older than 90 days. Audit log grows fast
// in normal operations; keeping it bounded keeps queries fast and storage
// predictable. Adjust days if compliance ever requires longer retention.
Schedule::call(function () {
    AuditLog::query()
        ->where('created_at', '<', now()->subDays(90))
        ->delete();
})->name('audit-log-prune')->dailyAt('03:30')->onOneServer();

// Idempotency keys are only useful for the lifetime of an offline-queue
// replay window. Keep 7 days for safety, then drop — the table would
// otherwise grow unbounded with one row per mutation.
Schedule::call(function () {
    IdempotencyKey::query()
        ->where('created_at', '<', now()->subDays(7))
        ->delete();
})->name('idempotency-key-prune')->dailyAt('03:40')->onOneServer();
