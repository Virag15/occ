<?php

namespace App\Observers;

use App\Models\Order;
use App\Models\TallyOperation;
use App\Services\Tally\TallySyncService;

/**
 * When an order transitions to a "sale-realised" state (delivered or closed),
 * push the sales voucher to Tally.
 *
 * Two execution modes (selected by services.bridge.mode):
 *   - direct: in-process push via TallySyncService (works when OCC runs
 *     on the same PC as TallyPrime). Default.
 *   - queue:  enqueue a TallyOperation row; the bridge:agent running on
 *     the Windows PC will pick it up and execute against local Tally.
 *     Use this when OCC is cloud-hosted and Tally is on a separate box.
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
        }
        if (! in_array($order->status, ['delivered', 'closed'], true)) {
            return;
        }

        try {
            if (config('services.bridge.mode') === 'queue') {
                $this->enqueue($order);
            } else {
                app(TallySyncService::class)->pushSingleOrder($order);
            }
        } catch (\Throwable $e) {
            \Log::warning('Tally auto-push failed for order '.$order->order_code.': '.$e->getMessage());
        }
    }

    private function enqueue(Order $order): void
    {
        $order->load(['customer:id,name', 'items:id,order_id,product_name,qty_ordered,unit_price,tax_rate']);
        TallyOperation::create([
            'operation' => TallyOperation::OP_PUSH_SALES_VOUCHER,
            'payload' => [
                'order_code' => $order->order_code,
                'invoice_number' => $order->invoice_number,
                'order_date' => $order->order_date?->toDateString(),
                'customer_name' => $order->customer?->name,
                'line_items' => $order->items->map(fn ($i) => [
                    'name' => $i->product_name,
                    'qty' => (float) $i->qty_ordered,
                    'rate' => (float) ($i->unit_price ?? 0),
                    'tax_rate' => (float) ($i->tax_rate ?? 0),
                ])->all(),
            ],
            'related_type' => 'order',
            'related_id' => $order->id,
        ]);
    }
}
