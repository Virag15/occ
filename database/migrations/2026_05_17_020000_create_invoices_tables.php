<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tax invoices — same shape as quotations (so they share the PDF / preview
 * template) plus invoice specifics: an optional source quotation, an
 * invoice date and a due date. Tenant-scoped; items denormalise tenant_id.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->cascadeOnDelete();
            $table->string('invoice_code', 30);

            // Source quotation, if this invoice was converted from one.
            $table->foreignId('quotation_id')->nullable()->constrained('quotations')->nullOnDelete();

            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->string('customer_name', 150);
            $table->string('customer_company', 150)->nullable();
            $table->text('customer_address')->nullable();
            $table->string('customer_gstin', 20)->nullable();
            $table->string('customer_state', 60)->nullable();
            $table->string('customer_state_code', 4)->nullable();
            $table->string('customer_phone', 20)->nullable();
            $table->string('customer_email', 150)->nullable();

            $table->string('buyer_ref', 80)->nullable();
            $table->string('other_references', 120)->nullable();
            $table->string('dispatched_through', 80)->nullable();
            $table->string('destination', 80)->nullable();
            $table->string('payment_terms', 120)->nullable();
            $table->string('delivery_terms', 120)->nullable();

            $table->date('invoice_date');
            $table->date('due_date')->nullable();

            // draft → sent → paid | cancelled
            $table->string('status', 16)->default('draft')->index();

            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->boolean('hide_discount')->default(false);
            $table->decimal('subtotal', 14, 2)->default(0);
            $table->decimal('tax_total', 14, 2)->default(0);
            $table->decimal('total', 14, 2)->default(0);

            $table->text('notes')->nullable();
            $table->text('terms')->nullable();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'invoice_code']);
            $table->index(['tenant_id', 'status', 'invoice_date']);
        });

        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();

            $table->string('product_name', 255);
            $table->string('hsn_code', 20)->nullable();
            $table->decimal('qty', 12, 3)->default(1);
            $table->string('unit', 20)->nullable();
            $table->decimal('unit_price', 14, 2)->default(0);
            $table->decimal('discount_pct', 5, 2)->default(0);
            $table->decimal('tax_rate', 5, 2)->default(0);
            $table->decimal('line_total', 14, 2)->default(0);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['invoice_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_items');
        Schema::dropIfExists('invoices');
    }
};
