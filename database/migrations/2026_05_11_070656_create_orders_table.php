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

            // Order-level aggregate flags. Manually maintained — not duplicates
            // of per-shipment data (which lives on the shipments table).
            $table->boolean('lr_shared_with_customer')->default(false);
            $table->boolean('pod_received')->default(false);
            $table->boolean('triplicate_received')->default(false);

            // Invoice + payment. amount_received / payment_received_date /
            // payment_mode are auto-recomputed from the payments table.
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
            $table->index('payment_due_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
