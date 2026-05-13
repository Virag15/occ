<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Queue table for cloud-OCC ↔ local-Tally communication.
 *
 * When TALLY_MODE=queue, observers (TallyOrderObserver, TallyPaymentObserver,
 * Customer sync jobs) enqueue rows here instead of calling TallyClient directly.
 * A `bridge:agent` process running on the Windows PC next to TallyPrime
 * claims pending rows over the API, executes against the local Tally
 * instance, and POSTs results back.
 *
 * When TALLY_MODE=direct (default), the existing in-process push paths run
 * unchanged — used when OCC runs on the same PC as Tally.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tally_operations', function (Blueprint $table) {
            $table->id();
            $table->string('operation', 50);
            $table->json('payload');
            $table->string('status', 16)->default('pending')->index();
            // Lease tracking — when the agent picks a row, it stamps these
            // so multiple agents (or a stuck agent + a healthy one) can't
            // double-process. Lease expires after a few minutes if not done.
            $table->string('claimed_by', 100)->nullable();
            $table->timestamp('claimed_at')->nullable();
            $table->timestamp('lease_expires_at')->nullable();
            $table->json('result')->nullable();
            $table->string('error_message', 500)->nullable();
            $table->unsignedTinyInteger('attempts')->default(0);
            // Loose link back to whatever triggered the op (an Order, a
            // Payment, a Customer). Polymorphic so we don't need a wide
            // shape of nullable FKs.
            $table->string('related_type', 50)->nullable();
            $table->unsignedBigInteger('related_id')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['related_type', 'related_id']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tally_operations');
    }
};
