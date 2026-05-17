<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Declaration boilerplate and bank account-holder name — both print on
 * the quotation / invoice and are the same on every document, so they
 * live on company settings rather than per-quotation.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('company_settings', function (Blueprint $table) {
            $table->string('bank_account_holder', 150)->nullable()->after('bank_ifsc');
            $table->text('invoice_declaration')->nullable()->after('invoice_footer_note');
        });
    }

    public function down(): void
    {
        Schema::table('company_settings', function (Blueprint $table) {
            $table->dropColumn(['bank_account_holder', 'invoice_declaration']);
        });
    }
};
