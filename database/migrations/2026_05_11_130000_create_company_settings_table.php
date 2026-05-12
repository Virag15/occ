<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('company_settings', function (Blueprint $table) {
            $table->id();
            $table->string('logo_path')->nullable();

            $table->string('company_name');
            $table->string('legal_name')->nullable();
            $table->text('address_line_1')->nullable();
            $table->text('address_line_2')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('state_code', 2)->nullable(); // GST state code for IGST/CGST split
            $table->string('pincode', 10)->nullable();
            $table->string('country')->default('India');

            $table->string('gstin', 20)->nullable();
            $table->string('pan', 12)->nullable();
            $table->string('cin', 30)->nullable();

            $table->string('phone', 30)->nullable();
            $table->string('email')->nullable();
            $table->string('website')->nullable();

            // Bank details (for the "pay to" block on the invoice)
            $table->string('bank_name')->nullable();
            $table->string('bank_branch')->nullable();
            $table->string('bank_account_number', 30)->nullable();
            $table->string('bank_ifsc', 15)->nullable();
            $table->string('upi_id', 50)->nullable();

            $table->string('signatory_name')->nullable();
            $table->string('signatory_designation')->nullable();
            $table->text('terms_and_conditions')->nullable();
            $table->text('invoice_footer_note')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_settings');
    }
};
