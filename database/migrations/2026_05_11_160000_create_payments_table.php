<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->date('paid_on');
            $table->decimal('amount', 14, 2);
            $table->string('mode', 20); // neft, rtgs, upi, cheque, cash
            $table->string('reference', 100)->nullable(); // txn id, UTR, cheque no
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('order_id');
            $table->index('paid_on');
        });

        // Migrate existing single-payment data (orders.amount_received) into payment rows
        // so the orders that were already partially paid don't lose history when we
        // switch to derived sum-of-payments.
        $now = now();
        DB::table('orders')
            ->where('amount_received', '>', 0)
            ->orderBy('id')
            ->chunk(200, function ($rows) use ($now) {
                $batch = [];
                foreach ($rows as $o) {
                    $batch[] = [
                        'order_id' => $o->id,
                        'paid_on' => $o->payment_received_date ?? $o->order_date ?? $now->toDateString(),
                        'amount' => $o->amount_received,
                        'mode' => $o->payment_mode ?? 'neft',
                        'reference' => 'LEGACY',
                        'notes' => 'Imported from orders.amount_received during 2.X.5 migration',
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
                if (! empty($batch)) {
                    DB::table('payments')->insert($batch);
                }
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
