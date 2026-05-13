<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Leads — sales pipeline for OCC itself. One row per inbound enquiry
 * from /contact, a WhatsApp message, a phone call we logged, or any
 * other source. Not tenant-scoped: these belong to the OCC platform,
 * not to any customer tenant. (When a lead converts and pays, we
 * provision them a tenant and stamp converted_tenant_id.)
 *
 * Status flow (P2.3 builds the kanban):
 *   new → contacted → demo_done → quote_sent → paid → provisioned
 *                                                  ↘ lost
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leads', function (Blueprint $table) {
            $table->id();

            // What the form / phone log captured.
            $table->string('name', 100);
            $table->string('business_name', 150);
            $table->string('phone', 20);
            $table->string('email', 150)->nullable();
            $table->string('current_software', 30)->nullable();
            $table->string('orders_per_month', 30)->nullable();
            $table->text('notes')->nullable();

            // Where the lead came from. 'contact_form' / 'whatsapp' /
            // 'phone' / 'referral' / 'event' / 'other'.
            $table->string('source', 30)->default('contact_form');

            // Sales pipeline. See class doc for the flow.
            $table->string('status', 20)->default('new')->index();

            // Who on the OCC team owns the follow-up.
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();

            // Filled when the lead pays + their tenant is provisioned.
            $table->foreignId('converted_tenant_id')->nullable()->constrained('tenants')->nullOnDelete();

            // Marketing attribution — populated from query string if present.
            $table->string('utm_source', 50)->nullable();
            $table->string('utm_medium', 50)->nullable();
            $table->string('utm_campaign', 80)->nullable();

            // Request-context capture for spam analysis + diagnostics.
            $table->string('referrer', 255)->nullable();
            $table->string('ip', 45)->nullable();
            $table->string('user_agent', 255)->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leads');
    }
};
