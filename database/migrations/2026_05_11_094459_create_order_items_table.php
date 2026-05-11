<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->string('product_name');

            $table->decimal('qty_ordered', 14, 3);
            $table->decimal('qty_packed', 14, 3)->default(0);
            $table->decimal('qty_dispatched', 14, 3)->default(0);
            $table->decimal('qty_delivered', 14, 3)->default(0);
            $table->decimal('qty_cancelled', 14, 3)->default(0);
            $table->decimal('qty_returned', 14, 3)->default(0);

            $table->string('unit', 20)->nullable();
            $table->decimal('unit_price', 12, 2)->nullable();
            $table->decimal('tax_rate', 5, 2)->nullable();
            $table->decimal('line_total', 14, 2)->nullable();

            $table->string('status', 30)->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('order_id');
            $table->index('product_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
