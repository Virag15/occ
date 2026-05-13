<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tenants — one row per MSME customer. The cornerstone of the multi-tenant
 * refactor: every data table gets a tenant_id column pointing here, and a
 * global Eloquent scope filters queries to the active tenant.
 *
 * Single-database, column-based tenancy. App-level isolation via global
 * scope + middleware. See app/Models/Tenant.php and app/Models/Concerns/
 * BelongsToTenant.php for the runtime side.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->id();
            // UUID is the *external* tenant identifier (storage paths,
            // bridge tokens, subdomains). The numeric id is for FK joins.
            $table->uuid('uuid')->unique();
            $table->string('name', 150);
            // Subdomain slug: future tenant.occ.in routing. Nullable while
            // we're path-routed; reserve the column shape early.
            $table->string('slug', 50)->unique()->nullable();
            // Lifecycle: trial → active → suspended → cancelled.
            // suspended = read-only (billing lapsed); cancelled = soft-deleted.
            $table->string('status', 20)->default('active');
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('suspended_at')->nullable();
            // Plan name is a free-form string for now ("starter" / "growth" /
            // "pro" / "custom"). Enforcement of quotas is a later phase.
            $table->string('plan', 30)->default('starter');
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenants');
    }
};
