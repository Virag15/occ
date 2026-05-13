<?php

namespace App\Observers;

use App\Models\Payment;
use App\Models\TallyOperation;
use App\Services\Tally\TallySyncService;

/**
 * Auto-push receipt voucher to Tally on payment create. Same mode-switch
 * as TallyOrderObserver: direct in-process push vs enqueue-for-agent.
 */
class TallyPaymentObserver
{
    public function created(Payment $payment): void
    {
        if ($payment->tally_voucher_id) {
            return;
        }

        try {
            if (config('services.bridge.mode') === 'queue') {
                $this->enqueue($payment);
            } else {
                app(TallySyncService::class)->pushSinglePayment($payment);
            }
        } catch (\Throwable $e) {
            \Log::warning('Tally auto-push failed for payment id='.$payment->id.': '.$e->getMessage());
        }
    }

    private function enqueue(Payment $payment): void
    {
        $payment->load(['order:id,order_code', 'order.customer:id,name']);
        TallyOperation::create([
            'operation' => TallyOperation::OP_PUSH_RECEIPT,
            'payload' => [
                'customer_name' => $payment->order?->customer?->name,
                'amount' => (float) $payment->amount,
                'paid_on' => $payment->paid_on?->toDateString(),
                'mode' => $payment->mode,
                'reference' => $payment->reference,
                'order_code' => $payment->order?->order_code,
            ],
            'related_type' => 'payment',
            'related_id' => $payment->id,
        ]);
    }
}
