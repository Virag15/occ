<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tally tax-invoice parity fields for quotations: buyer place-of-supply
 * (state + 2-digit code, which drives the CGST/SGST vs IGST split) and
 * the dispatch / reference block Tally prints on its voucher.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotations', function (Blueprint $table) {
            $table->string('customer_state', 60)->nullable()->after('customer_gstin');
            $table->string('customer_state_code', 4)->nullable()->after('customer_state');
            $table->string('buyer_ref', 80)->nullable()->after('customer_email');
            $table->string('other_references', 120)->nullable()->after('buyer_ref');
            $table->string('dispatched_through', 80)->nullable()->after('other_references');
            $table->string('destination', 80)->nullable()->after('dispatched_through');
            $table->string('payment_terms', 120)->nullable()->after('destination');
            $table->string('delivery_terms', 120)->nullable()->after('payment_terms');
        });
    }

    public function down(): void
    {
        Schema::table('quotations', function (Blueprint $table) {
            $table->dropColumn([
                'customer_state', 'customer_state_code', 'buyer_ref',
                'other_references', 'dispatched_through', 'destination',
                'payment_terms', 'delivery_terms',
            ]);
        });
    }
};
