<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-tenant bridge agent tokens. Each tenant issues one or more tokens —
 * one per Windows PC that runs the bridge agent. Tokens are stored hashed
 * (sha256), the plaintext is shown to the user exactly once at creation
 * time and never persisted.
 *
 * Replaces the single shared BRIDGE_AGENT_TOKEN env var. After this lands,
 * the env var becomes a no-op; the cloud OCC authenticates every bridge
 * request against this table.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bridge_agent_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            // Human-readable label so the tenant owner can tell tokens
            // apart on the management UI ("Office PC", "Accounts PC").
            $table->string('name', 100);
            // sha256(plaintext_token) — hex string, 64 chars. We hash so
            // a DB read doesn't leak credentials. SHA-256 is fine here
            // (not a password — it's an opaque random secret).
            $table->string('token_hash', 64)->unique();
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'revoked_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bridge_agent_tokens');
    }
};
