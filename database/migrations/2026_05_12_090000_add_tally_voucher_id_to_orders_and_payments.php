<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Tally's master voucher ID once the sales voucher is created over there.
            // Null while the order is still in flight; set after auto-push on delivered/closed.
            $table->string('tally_voucher_id', 80)->nullable()->after('payment_mode');
            $table->timestamp('tally_pushed_at')->nullable()->after('tally_voucher_id');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->string('tally_voucher_id', 80)->nullable()->after('reference');
            $table->timestamp('tally_pushed_at')->nullable()->after('tally_voucher_id');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['tally_voucher_id', 'tally_pushed_at']);
        });
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['tally_voucher_id', 'tally_pushed_at']);
        });
    }
};
