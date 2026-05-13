<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * The big multi-tenant retrofit. Adds tenant_id (nullable for now, FK to
 * tenants, indexed) to every table that holds tenant-owned data.
 *
 * Stays nullable in this phase so existing tests + factories don't blow up
 * en masse. P1.3 introduces the BelongsToTenant trait that auto-fills
 * tenant_id from the active tenant context, after which a follow-up
 * migration flips the column to NOT NULL.
 *
 * Backfill: any pre-existing rows (in the dev/prod database) are assigned
 * to the GC Communication tenant. In a fresh install or in tests there's
 * nothing to backfill.
 *
 * NOT tenant-scoped (deliberately omitted):
 *   tenants, migrations, cache*, jobs, job_batches, failed_jobs,
 *   sessions, password_reset_tokens — system / framework tables.
 */
return new class extends Migration
{
    /** Every table that holds tenant-owned data. */
    private array $tables = [
        'users',
        'customers',
        'products',
        'transporters',
        'stock_items',
        'orders',
        'order_items',
        'shipments',
        'shipment_items',
        'returns',
        'return_items',
        'payments',
        'communications',
        'audit_logs',
        'daily_reports',
        'saved_views',
        'company_settings',
        'tally_sync_logs',
        'tally_operations',
    ];

    public function up(): void
    {
        foreach ($this->tables as $table) {
            if (! Schema::hasTable($table)) {
                continue; // defensive — table might be added later
            }
            if (Schema::hasColumn($table, 'tenant_id')) {
                continue; // idempotent
            }
            Schema::table($table, function (Blueprint $t) {
                // Nullable for now. restrictOnDelete because we never want
                // to silently lose tenant-owned data when a tenant row is
                // hard-deleted — soft-delete is the only supported flow.
                $t->foreignId('tenant_id')
                    ->nullable()
                    ->after('id')
                    ->constrained('tenants')
                    ->restrictOnDelete();
                $t->index('tenant_id');
            });
        }

        // Backfill — if existing data is present, ensure the GC Communication
        // tenant exists and assign every row to it. Idempotent: a fresh DB
        // also creates the tenant here, which the seeder later sees via
        // firstOrCreate. Tests skip this because they don't run seeders.
        $hasExistingData = collect($this->tables)
            ->filter(fn ($t) => Schema::hasTable($t) && DB::table($t)->exists())
            ->isNotEmpty();

        if ($hasExistingData) {
            $tenantId = DB::table('tenants')->where('slug', 'gc-communication')->value('id');
            if (! $tenantId) {
                $tenantId = DB::table('tenants')->insertGetId([
                    'uuid' => (string) Str::uuid(),
                    'name' => 'GC Communication',
                    'slug' => 'gc-communication',
                    'status' => 'active',
                    'plan' => 'custom',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            foreach ($this->tables as $table) {
                if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'tenant_id')) {
                    continue;
                }
                DB::table($table)->whereNull('tenant_id')->update(['tenant_id' => $tenantId]);
            }
        }
    }

    public function down(): void
    {
        foreach (array_reverse($this->tables) as $table) {
            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'tenant_id')) {
                continue;
            }
            Schema::table($table, function (Blueprint $t) use ($table) {
                // Drop the explicit index first — on SQLite, dropping the
                // column doesn't auto-drop user-defined indexes referencing
                // it. dropConstrainedForeignId then handles FK + column.
                $t->dropIndex("{$table}_tenant_id_index");
                $t->dropConstrainedForeignId('tenant_id');
            });
        }
    }
};
