<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('returns', function (Blueprint $table) {
            $table->id();
            $table->string('case_code', 20)->unique();
            $table->foreignId('related_order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->foreignId('customer_id')->constrained()->restrictOnDelete();
            $table->string('case_title')->nullable();
            $table->date('date_reported');
            $table->string('case_type', 50)->nullable();
            $table->string('brand', 100)->nullable();
            $table->text('item_description')->nullable();
            $table->integer('quantity_affected')->nullable();
            $table->decimal('value_at_risk', 12, 2)->nullable();
            $table->text('reason_detail')->nullable();
            $table->json('evidence_photo_urls')->nullable();
            $table->json('customer_communication_urls')->nullable();
            $table->string('reported_via', 20)->nullable();
            $table->string('severity', 20)->nullable();
            $table->string('case_status', 40)->default('reported');
            $table->string('resolution_type', 30)->nullable();
            $table->date('resolution_date')->nullable();
            $table->string('replacement_lr_number', 50)->nullable();
            $table->string('credit_note_number', 50)->nullable();
            $table->string('responsible_party', 40)->nullable();
            $table->text('internal_notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('case_status');
            $table->index('severity');
            $table->index('date_reported');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('returns');
    }
};
