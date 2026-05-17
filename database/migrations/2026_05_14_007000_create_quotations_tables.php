<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Standalone quotations — created WITHOUT first creating an order.
 * A quotation can optionally reference an existing Customer, or carry
 * ad-hoc customer details typed inline (common: a prospect who isn't
 * in the system yet).
 *
 * Tenant-scoped. quotation_items denormalises tenant_id so the global
 * scope protects line items directly, not only via the parent.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quotations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->cascadeOnDelete();
            $table->string('quotation_code', 30);

            // Optional link to a real Customer; otherwise the inline fields
            // below carry the buyer details for a prospect.
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->string('customer_name', 150);
            $table->string('customer_company', 150)->nullable();
            $table->text('customer_address')->nullable();
            $table->string('customer_gstin', 20)->nullable();
            $table->string('customer_phone', 20)->nullable();
            $table->string('customer_email', 150)->nullable();

            $table->date('quotation_date');
            $table->date('valid_until')->nullable();

            // draft → sent → accepted | rejected | expired
            $table->string('status', 16)->default('draft')->index();

            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('subtotal', 14, 2)->default(0);
            $table->decimal('tax_total', 14, 2)->default(0);
            $table->decimal('total', 14, 2)->default(0);

            $table->text('notes')->nullable();
            $table->text('terms')->nullable();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'quotation_code']);
            $table->index(['tenant_id', 'status', 'quotation_date']);
        });

        Schema::create('quotation_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quotation_id')->constrained('quotations')->cascadeOnDelete();
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

            $table->index(['quotation_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quotation_items');
        Schema::dropIfExists('quotations');
    }
};
