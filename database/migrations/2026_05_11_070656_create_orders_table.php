<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_code', 20)->unique();
            $table->foreignId('customer_id')->constrained()->restrictOnDelete();
            $table->date('order_date');
            $table->string('order_source', 20)->nullable();
            $table->json('brands')->nullable();
            $table->decimal('order_value', 12, 2)->nullable();
            $table->string('status', 30)->default('new_order');
            $table->string('priority', 20)->default('normal');

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
            $table->string('lr_number', 50)->nullable()->index();
            $table->json('lr_photo_url')->nullable();
            $table->boolean('lr_shared_with_customer')->default(false);
            $table->timestamp('lr_shared_at')->nullable();
            $table->date('expected_delivery')->nullable();

            $table->date('delivered_date')->nullable();
            $table->boolean('pod_received')->default(false);
            $table->json('pod_photo_url')->nullable();
            $table->boolean('triplicate_received')->default(false);
            $table->date('triplicate_received_date')->nullable();
            $table->json('triplicate_photo_url')->nullable();

            $table->string('invoice_number', 50)->nullable();
            $table->date('invoice_date')->nullable();
            $table->string('payment_terms', 20)->nullable();
            $table->date('payment_due_date')->nullable();
            $table->string('payment_status', 20)->default('not_due');
            $table->decimal('amount_received', 12, 2)->default(0);
            $table->date('payment_received_date')->nullable();
            $table->string('payment_mode', 20)->nullable();

            $table->text('internal_notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('status');
            $table->index('payment_status');
            $table->index('dispatch_date');
            $table->index('payment_due_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
