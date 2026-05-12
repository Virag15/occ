<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Soft deletes on the five core entities the UI exposes a delete button for.
 * A typo in production should be recoverable — nothing falls off a cliff.
 *
 * Tables: orders, customers, products, transporters, returns (return_cases).
 * Audit logs, payments and shipments stay hard-deleted — they're tied to a
 * parent record's lifecycle and "soft restore one shipment" isn't meaningful.
 */
return new class extends Migration
{
    public function up(): void
    {
        foreach (['orders', 'customers', 'products', 'transporters', 'returns'] as $table) {
            if (!Schema::hasTable($table)) continue;
            if (Schema::hasColumn($table, 'deleted_at')) continue;
            Schema::table($table, function (Blueprint $t) {
                $t->softDeletes();
            });
        }
    }

    public function down(): void
    {
        foreach (['orders', 'customers', 'products', 'transporters', 'returns'] as $table) {
            if (!Schema::hasTable($table)) continue;
            if (!Schema::hasColumn($table, 'deleted_at')) continue;
            Schema::table($table, function (Blueprint $t) {
                $t->dropSoftDeletes();
            });
        }
    }
};
