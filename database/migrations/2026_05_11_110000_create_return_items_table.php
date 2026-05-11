<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('return_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('return_id')->constrained('returns')->cascadeOnDelete();
            $table->foreignId('order_item_id')->constrained()->restrictOnDelete();
            $table->decimal('qty_returned', 14, 3);
            $table->string('condition', 30);
            $table->text('reason')->nullable();
            $table->foreignId('replacement_order_item_id')->nullable()->constrained('order_items')->nullOnDelete();
            $table->timestamps();

            $table->index('return_id');
            $table->index('order_item_id');
        });

        // Track who moved the case + when, so the timeline on Return Show is rich
        Schema::table('returns', function (Blueprint $table) {
            $table->timestamp('inspection_started_at')->nullable()->after('case_status');
            $table->foreignId('inspected_by')->nullable()->after('inspection_started_at')->constrained('users')->nullOnDelete();
            $table->foreignId('resolved_by')->nullable()->after('resolution_date')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('returns', function (Blueprint $table) {
            $table->dropConstrainedForeignId('inspected_by');
            $table->dropConstrainedForeignId('resolved_by');
            $table->dropColumn('inspection_started_at');
        });
        Schema::dropIfExists('return_items');
    }
};
