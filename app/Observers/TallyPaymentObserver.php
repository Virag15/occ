<?php

namespace App\Observers;

use App\Models\Payment;
use App\Services\Tally\TallySyncService;

class TallyPaymentObserver
{
    public function created(Payment $payment): void
    {
        if ($payment->tally_voucher_id) {
            return;
        }

        try {
            app(TallySyncService::class)->pushSinglePayment($payment);
        } catch (\Throwable $e) {
            \Log::warning('Tally auto-push failed for payment id='.$payment->id.': '.$e->getMessage());
        }
    }
}
