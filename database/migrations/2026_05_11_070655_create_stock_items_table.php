<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('stock_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('godown_name')->default('Main');

            $table->decimal('qty_opening', 14, 3)->default(0);
            $table->decimal('qty_inward', 14, 3)->default(0);
            $table->decimal('qty_outward', 14, 3)->default(0);
            $table->decimal('qty_closing', 14, 3)->default(0);

            $table->date('as_of_date')->nullable();
            $table->timestamp('tally_synced_at')->nullable();
            $table->timestamps();

            $table->unique(['product_id', 'godown_name']);
            $table->index('as_of_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_items');
    }
};
