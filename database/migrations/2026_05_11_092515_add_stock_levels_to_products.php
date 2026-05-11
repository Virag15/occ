<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('min_order_level', 14, 3)->nullable()->after('default_purchase_price');
            $table->decimal('reorder_level', 14, 3)->nullable()->after('min_order_level');
            $table->text('negative_stock_reason')->nullable()->after('reorder_level');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['min_order_level', 'reorder_level', 'negative_stock_reason']);
        });
    }
};
