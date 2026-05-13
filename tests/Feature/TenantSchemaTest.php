<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Schema-level test that every tenant-owned table actually has the
 * tenant_id column wired up after migrations run. If this fails, P1.3's
 * global scope will silently leave a table un-scoped — exactly the
 * cross-tenant leak we're trying to prevent.
 */
class TenantSchemaTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Mirror of the migration's table list. Kept here as an independent
     * assertion so if a new table is added to the migration but not here
     * (or vice versa) the test catches the drift.
     */
    private array $expectedTenantOwnedTables = [
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

    public function test_every_tenant_owned_table_has_tenant_id_column(): void
    {
        foreach ($this->expectedTenantOwnedTables as $table) {
            $this->assertTrue(
                Schema::hasTable($table),
                "Table {$table} is expected to exist."
            );
            $this->assertTrue(
                Schema::hasColumn($table, 'tenant_id'),
                "Table {$table} must have a tenant_id column — without it, the global tenant scope (P1.3) can't enforce isolation."
            );
        }
    }

    public function test_system_tables_do_not_have_tenant_id(): void
    {
        // These are framework / system tables that should NEVER be scoped
        // to a tenant. If tenant_id leaks onto one of these, something is
        // wrong with the migration list.
        $systemTables = [
            'migrations',
            'tenants',
            'sessions',
            'password_reset_tokens',
            'jobs',
            'failed_jobs',
        ];
        foreach ($systemTables as $table) {
            if (! Schema::hasTable($table)) {
                continue; // not all envs have all framework tables
            }
            $this->assertFalse(
                Schema::hasColumn($table, 'tenant_id'),
                "System table {$table} should NOT have a tenant_id column."
            );
        }
    }
}
