<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * One-shot migration: moves files from the pre-P1.4c paths (orders/{id}/...,
 * company/...) into the new tenant-scoped paths (tenants/{uuid}/...).
 *
 * Use this once per environment after deploying P1.4c. Idempotent — re-runs
 * skip files already in the new location.
 *
 *   php artisan tenants:migrate-storage
 *   php artisan tenants:migrate-storage --tenant=gc-communication
 *   php artisan tenants:migrate-storage --dry-run
 *
 * On a fresh single-tenant install (only GC Communication exists) this moves
 * every legacy file under the GC tenant prefix. For multi-tenant deployments
 * the --tenant flag pins which tenant owns the legacy data.
 */
class MigrateTenantStorage extends Command
{
    protected $signature = 'tenants:migrate-storage
                            {--tenant=gc-communication : slug of the tenant that owns legacy unprefixed files}
                            {--dry-run : list files that would be moved, do not actually move}';

    protected $description = 'Move legacy non-tenant-prefixed files into the active tenant\'s storage prefix.';

    public function handle(): int
    {
        $slug = (string) $this->option('tenant');
        $dryRun = (bool) $this->option('dry-run');

        $tenant = Tenant::where('slug', $slug)->first();
        if (! $tenant) {
            $this->error("Tenant with slug={$slug} not found. Pass --tenant=<slug> for a different one.");

            return self::FAILURE;
        }

        $this->info("Migrating legacy files to tenant '{$tenant->name}' (uuid={$tenant->uuid})".($dryRun ? ' [DRY RUN]' : ''));

        // Private disk: orders/{id}/... → tenants/{uuid}/orders/{id}/...
        $localMoved = $this->migrateDir('local', 'orders', "{$tenant->storagePrefix()}/orders", $dryRun);
        // Public disk: company/... → tenants/{uuid}/company/...
        $publicMoved = $this->migrateDir('public', 'company', "{$tenant->storagePrefix()}/company", $dryRun);

        $this->info("Done. Private disk: {$localMoved} files. Public disk: {$publicMoved} files.");

        return self::SUCCESS;
    }

    /**
     * Recursively move every file under $from to the same relative path under
     * $to on the given disk. Skips files already at the destination.
     */
    private function migrateDir(string $disk, string $from, string $to, bool $dryRun): int
    {
        $storage = Storage::disk($disk);
        if (! $storage->exists($from)) {
            $this->line("  - {$disk}:{$from}/  (not present, skipped)");

            return 0;
        }

        $moved = 0;
        foreach ($storage->allFiles($from) as $sourcePath) {
            // Compute the destination by replacing the from-prefix with the to-prefix
            $relative = substr($sourcePath, strlen($from) + 1); // strip "orders/" or "company/"
            $destPath = "{$to}/{$relative}";

            if ($storage->exists($destPath)) {
                $this->line("  - {$disk}:{$sourcePath}  (destination already exists, skipped)");

                continue;
            }

            $this->line("  - {$disk}:{$sourcePath}  →  {$destPath}");
            if (! $dryRun) {
                $storage->move($sourcePath, $destPath);
            }
            $moved++;
        }

        return $moved;
    }
}
