<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Transporters were missing the Tally sync trio (tally_id / tally_guid /
 * tally_synced_at) that customers + products already have. In Tally,
 * transporters are ledgers under the "Sundry Creditors" or a custom
 * group; OCC's bridge needs to map our local row to that ledger by
 * Tally's GUID so updates round-trip correctly.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transporters', function (Blueprint $table) {
            if (! Schema::hasColumn('transporters', 'tally_id')) {
                $table->string('tally_id', 100)->nullable()->unique()->after('id');
            }
            if (! Schema::hasColumn('transporters', 'tally_guid')) {
                $table->string('tally_guid', 100)->nullable()->after('tally_id');
            }
            if (! Schema::hasColumn('transporters', 'tally_synced_at')) {
                $table->timestamp('tally_synced_at')->nullable()->after('tally_guid');
            }
        });
    }

    public function down(): void
    {
        Schema::table('transporters', function (Blueprint $table) {
            $table->dropColumn(['tally_id', 'tally_guid', 'tally_synced_at']);
        });
    }
};
