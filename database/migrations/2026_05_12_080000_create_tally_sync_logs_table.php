<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('tally_sync_logs', function (Blueprint $table) {
            $table->id();
            // 'customers' | 'products' | 'stock' | 'vouchers' | 'all'
            $table->string('entity_type', 30);
            // 'pull' (from Tally → OCC) | 'push' (from OCC → Tally)
            $table->string('direction', 10)->default('pull');
            // 'success' | 'partial' | 'failed' | 'running' | 'demo'
            $table->string('status', 20)->default('running');
            $table->integer('records_processed')->default(0);
            $table->integer('records_created')->default(0);
            $table->integer('records_updated')->default(0);
            $table->integer('records_failed')->default(0);
            $table->text('error_message')->nullable();
            // First few rows captured for debugging
            $table->json('sample_payload')->nullable();
            $table->timestamp('started_at');
            $table->timestamp('completed_at')->nullable();
            $table->foreignId('triggered_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['entity_type', 'started_at']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tally_sync_logs');
    }
};
