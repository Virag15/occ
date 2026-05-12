<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            // Per-line percentage discount. Applied to gross BEFORE tax — GST-compliant.
            $table->decimal('discount_pct', 5, 2)->default(0)->after('unit_price');
        });

        Schema::table('orders', function (Blueprint $table) {
            // Flat order-level trade discount in ₹. Applied to the post-tax grand total.
            // Not GST-relevant (it's a cash/trade discount, not a line-level discount).
            $table->decimal('discount_amount', 12, 2)->default(0)->after('order_value');
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('discount_pct');
        });
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('discount_amount');
        });
    }
};
