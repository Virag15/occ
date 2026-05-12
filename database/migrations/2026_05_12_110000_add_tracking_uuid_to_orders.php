<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Public tracking links (Phase 5.8). Each order gets an unguessable UUID we can
 * paste into WhatsApp messages so the customer can check status without logging in.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->uuid('tracking_uuid')->nullable()->unique()->after('order_code');
        });

        // Backfill existing rows
        DB::table('orders')->whereNull('tracking_uuid')->orderBy('id')->each(function ($row) {
            DB::table('orders')->where('id', $row->id)->update(['tracking_uuid' => (string) Str::uuid()]);
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('tracking_uuid');
        });
    }
};
