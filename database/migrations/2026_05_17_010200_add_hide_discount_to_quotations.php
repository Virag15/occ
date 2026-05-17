<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-quotation toggle to hide the discount column / line on the PDF and
 * preview. Discounts still apply to the figures — only the breakdown is
 * suppressed (some buyers shouldn't see the give-away).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotations', function (Blueprint $table) {
            $table->boolean('hide_discount')->default(false)->after('discount_amount');
        });
    }

    public function down(): void
    {
        Schema::table('quotations', function (Blueprint $table) {
            $table->dropColumn('hide_discount');
        });
    }
};
