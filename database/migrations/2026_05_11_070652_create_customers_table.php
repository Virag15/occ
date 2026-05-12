<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();

            $table->string('tally_id')->unique();
            $table->string('tally_guid')->nullable();
            $table->timestamp('tally_synced_at')->nullable();

            $table->string('customer_code', 20)->unique()->nullable();
            $table->string('name');
            $table->string('company')->nullable();
            $table->string('gstin', 15)->unique()->nullable();
            $table->string('contact_person')->nullable();
            $table->string('phone', 20)->nullable();
            $table->string('whatsapp', 20)->nullable();
            $table->string('email')->nullable();
            $table->text('billing_address')->nullable();
            $table->text('delivery_address')->nullable();
            $table->string('city', 100)->nullable();
            $table->string('state', 100)->nullable();

            $table->string('payment_terms', 20)->nullable();
            $table->decimal('credit_limit', 12, 2)->nullable();
            $table->json('brand_preferences')->nullable();
            $table->string('customer_type', 50)->nullable();
            $table->string('status', 20)->default('active');
            $table->date('onboarded_at')->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index('status');
            $table->index('customer_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
