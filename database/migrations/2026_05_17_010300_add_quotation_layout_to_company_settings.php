<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Document masthead layout: 'classic' (logo left, title right — the
 * default) or 'banner' (logo + identity centred on top). One brand-level
 * choice, reused by quotations and the upcoming invoice template.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('company_settings', function (Blueprint $table) {
            $table->string('quotation_layout', 16)->default('classic')->after('invoice_declaration');
        });
    }

    public function down(): void
    {
        Schema::table('company_settings', function (Blueprint $table) {
            $table->dropColumn('quotation_layout');
        });
    }
};
