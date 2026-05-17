<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Brand logos a tenant deals in (Schneider, Legrand, C&S, BCH, ...).
 * Uploaded once in Settings, auto-rendered as an "Authorised dealer for"
 * strip on quotation + invoice PDFs.
 *
 * Tenant-scoped: each MSME manages their own brand list. Stored on the
 * public disk under the tenant prefix.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('brand_logos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->cascadeOnDelete();
            $table->string('name', 80);
            $table->string('logo_path', 255);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['tenant_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('brand_logos');
    }
};
