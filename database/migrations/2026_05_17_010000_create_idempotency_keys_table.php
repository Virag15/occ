<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Server-side idempotency (M7-B). The PWA offline queue replays queued
 * mutations on reconnect; without this a flaky network ⇒ duplicate
 * orders / vouchers / payments. Every replay carries the same
 * client-generated Idempotency-Key; the first request that wins records
 * its final response here and every subsequent replay is served that
 * stored response instead of re-running the controller.
 *
 * Pruned by a scheduled command (rows are short-lived).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('idempotency_keys', function (Blueprint $table) {
            $table->id();
            // Client-generated (UUIDv4) — globally unique on its own.
            $table->string('key', 100)->unique();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('method', 10);
            $table->string('path', 255);
            // 'processing' while the first request is in flight, 'completed'
            // once its response is captured.
            $table->string('status', 12)->default('processing');
            $table->unsignedSmallInteger('response_status')->nullable();
            $table->json('response_headers')->nullable();
            $table->longText('response_body')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('idempotency_keys');
    }
};
