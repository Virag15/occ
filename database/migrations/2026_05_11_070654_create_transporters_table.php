<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('transporters', function (Blueprint $table) {
            $table->id();
            $table->string('transporter_code', 20)->unique()->nullable();
            $table->string('name');
            $table->string('contact_person')->nullable();
            $table->string('primary_phone', 20)->nullable();
            $table->string('secondary_phone', 20)->nullable();
            $table->string('whatsapp', 20)->nullable();
            $table->string('email')->nullable();
            $table->text('office_address')->nullable();
            $table->string('city', 100)->nullable();
            $table->string('gstin', 15)->nullable();

            $table->json('areas_served')->nullable();
            $table->json('vehicle_types')->nullable();
            $table->integer('avg_transit_days')->nullable();
            $table->decimal('cost_per_kg', 8, 2)->nullable();
            $table->tinyInteger('triplicate_reliability')->nullable();
            $table->string('payment_terms', 20)->nullable();

            $table->string('status', 20)->default('active');
            $table->date('onboarded_at')->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transporters');
    }
};
