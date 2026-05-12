<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shipments', function (Blueprint $table) {
            $table->id();
            $table->string('shipment_code', 20)->unique();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('transporter_id')->nullable()->constrained()->nullOnDelete();

            // Packing
            $table->string('packed_by')->nullable();
            $table->integer('number_of_boxes')->nullable();
            $table->decimal('parcel_weight_kg', 8, 2)->nullable();
            $table->timestamp('picking_slip_generated_at')->nullable();
            $table->timestamp('packing_slip_generated_at')->nullable();

            // Dispatch
            $table->date('pickup_scheduled_date')->nullable();
            $table->string('driver_name')->nullable();
            $table->string('driver_contact', 20)->nullable();
            $table->string('vehicle_number', 20)->nullable();
            $table->date('dispatch_date')->nullable();
            $table->string('lr_number', 50)->nullable()->index();
            $table->boolean('lr_shared_with_customer')->default(false);
            $table->timestamp('lr_shared_at')->nullable();
            $table->date('expected_delivery')->nullable();

            // Delivery
            $table->date('delivered_date')->nullable();
            $table->boolean('pod_received')->default(false);
            $table->boolean('triplicate_received')->default(false);
            $table->date('triplicate_received_date')->nullable();

            $table->string('status', 30)->default('planning'); // planning, picking, packing, packed, dispatched, in_transit, delivered, closed, cancelled
            $table->text('notes')->nullable();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('status');
            $table->index('dispatch_date');
        });

        Schema::create('shipment_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shipment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_item_id')->constrained()->restrictOnDelete();
            $table->decimal('qty', 14, 3);
            $table->timestamps();

            $table->index(['shipment_id', 'order_item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipment_items');
        Schema::dropIfExists('shipments');
    }
};
