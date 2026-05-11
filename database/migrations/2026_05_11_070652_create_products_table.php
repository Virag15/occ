<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();

            $table->string('tally_id')->unique();
            $table->string('tally_guid')->nullable();
            $table->timestamp('tally_synced_at')->nullable();

            $table->string('sku', 100)->nullable()->index();
            $table->string('name');
            $table->string('brand', 100)->nullable()->index();
            $table->string('category', 100)->nullable();
            $table->text('description')->nullable();

            $table->string('hsn_code', 20)->nullable();
            $table->string('unit', 20)->nullable();
            $table->decimal('gst_rate', 5, 2)->nullable();
            $table->decimal('mrp', 12, 2)->nullable();
            $table->decimal('default_sale_price', 12, 2)->nullable();
            $table->decimal('default_purchase_price', 12, 2)->nullable();

            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
