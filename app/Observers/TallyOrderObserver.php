<?php

namespace App\Observers;

use App\Models\Order;
use App\Services\Tally\TallyClient;
use App\Services\Tally\TallySyncService;

/**
 * When an order transitions to a "sale-realised" state (delivered or closed),
 * auto-push the sales voucher to Tally. No-op if:
 *   - The order already has a tally_voucher_id (don't double-push)
 *   - Tally is disabled AND the user is in production (in demo mode we still
 *     run the push so the audit trail + sync logs show what would happen)
 */
class TallyOrderObserver
{
    public function updated(Order $order): void
    {
        if (! $order->wasChanged('status')) {
            return;
        }
        if ($order->tally_voucher_id) {
            return;
        } // already pushed

        if (! in_array($order->status, ['delivered', 'closed'], true)) {
            return;
        }

        try {
            $client = app(TallyClient::class);
            $svc = app(TallySyncService::class);
            // Push in demo mode too — that's the whole point of the test workflow
            $svc->pushSingleOrder($order);
        } catch (\Throwable $e) {
            // Swallow — never block the order update because Tally hiccuped.
            // The user can manually trigger a push from Settings → Integrations.
            \Log::warning('Tally auto-push failed for order '.$order->order_code.': '.$e->getMessage());
        }
    }
}
