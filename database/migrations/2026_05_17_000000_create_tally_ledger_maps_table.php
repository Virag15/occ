<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-tenant map from OCC concepts → named Tally ledgers (M2).
 *
 * Every voucher OCC pushes must post to ledgers that already exist in
 * that tenant's TallyPrime company. Tally matches ledgers by NAME, so
 * this table holds the exact ledger names per tenant. Rate-keyed maps
 * (sales/purchase ledgers per GST rate) are JSON: {"18":"Sales - GST 18%"}.
 *
 * One row per tenant (tenant_id unique). Edited from
 * Settings → Tally mapping; values are picked from a live ledger pull
 * once M1 lands, free-typed until then.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tally_ledger_maps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();

            // {rate => ledger name}. e.g. {"18":"Sales - GST 18%","12":"Sales - GST 12%"}
            $table->json('sales_ledgers')->nullable();
            $table->json('purchase_ledgers')->nullable();

            // Output tax (on sales) — what we collect and owe.
            $table->string('output_cgst_ledger')->nullable();
            $table->string('output_sgst_ledger')->nullable();
            $table->string('output_igst_ledger')->nullable();

            // Input tax (on purchases) — ITC we can claim.
            $table->string('input_cgst_ledger')->nullable();
            $table->string('input_sgst_ledger')->nullable();
            $table->string('input_igst_ledger')->nullable();

            $table->string('round_off_ledger')->nullable();
            $table->string('discount_ledger')->nullable();
            $table->string('freight_ledger')->nullable();

            // Money in/out lands here on receipt/payment vouchers.
            $table->string('default_bank_ledger')->nullable();
            $table->string('cash_ledger')->nullable();

            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique('tenant_id'); // one map per tenant; also serves as the lookup index
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tally_ledger_maps');
    }
};
