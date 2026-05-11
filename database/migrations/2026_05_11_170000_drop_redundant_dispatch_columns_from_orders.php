<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 2.X.4 — drop dispatch/packing/delivery columns from `orders` that now
 * live on `shipments`. Order's lr_number / dispatch_date / delivered_date /
 * expected_delivery / transporter / transporter_id are now Eloquent accessors
 * that compute from the loaded shipments collection, so JSON-facing reads
 * remain backward-compatible.
 */
return new class extends Migration {
    public function up(): void
    {
        $driver = \Illuminate\Support\Facades\DB::getDriverName();

        // SQLite: turn FK enforcement off so dropping transporter_id doesn't fail
        // because of its referencing FK, and clear orphan indexes the drop touches.
        if ($driver === 'sqlite') {
            \Illuminate\Support\Facades\DB::statement('PRAGMA foreign_keys = OFF');
            foreach (['orders_dispatch_date_index', 'orders_lr_number_index'] as $idx) {
                try { \Illuminate\Support\Facades\DB::statement("DROP INDEX IF EXISTS {$idx}"); } catch (\Throwable $e) { /* ignore */ }
            }
        }

        // Drop only the columns that actually exist on this database. The list of
        // dropped columns is the canonical "removed" set; some may have been
        // already removed by a prior partial migration on this branch, so we
        // skip those quietly using the schema metadata.
        $columns = [
            // Dispatch / delivery — now per-shipment
            'transporter_id',
            'driver_name', 'driver_contact', 'vehicle_number',
            'dispatch_date', 'pickup_scheduled_date', 'expected_delivery',
            'lr_number', 'lr_shared_at', 'lr_photo_url',
            'delivered_date', 'pod_photo_url',
            'triplicate_received_date', 'triplicate_photo_url',
            // Packing — now per-shipment
            'packed_by', 'parcel_weight_kg', 'number_of_boxes', 'parcel_photo_url',
            'items_packed_count', 'packing_slip_generated',
        ];

        foreach ($columns as $column) {
            if (Schema::hasColumn('orders', $column)) {
                Schema::table('orders', function (Blueprint $table) use ($column) {
                    $table->dropColumn($column);
                });
            }
        }

        if ($driver === 'sqlite') {
            \Illuminate\Support\Facades\DB::statement('PRAGMA foreign_keys = ON');
        }
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Re-add columns in their original shapes. Dates/strings as nullable,
            // booleans default false. Reversal is best-effort — actual photo and
            // detail data won't come back, but the schema is restored.
            $table->boolean('packing_slip_generated')->default(false);
            $table->string('packed_by')->nullable();
            $table->integer('items_packed_count')->nullable();
            $table->decimal('parcel_weight_kg', 8, 2)->nullable();
            $table->integer('number_of_boxes')->nullable();
            $table->json('parcel_photo_url')->nullable();
            $table->date('pickup_scheduled_date')->nullable();
            $table->foreignId('transporter_id')->nullable()->constrained()->nullOnDelete();
            $table->string('driver_name')->nullable();
            $table->string('driver_contact', 20)->nullable();
            $table->string('vehicle_number', 20)->nullable();
            $table->date('dispatch_date')->nullable();
            $table->string('lr_number', 50)->nullable();
            $table->json('lr_photo_url')->nullable();
            $table->timestamp('lr_shared_at')->nullable();
            $table->date('expected_delivery')->nullable();
            $table->date('delivered_date')->nullable();
            $table->json('pod_photo_url')->nullable();
            $table->date('triplicate_received_date')->nullable();
            $table->json('triplicate_photo_url')->nullable();
        });
    }
};
