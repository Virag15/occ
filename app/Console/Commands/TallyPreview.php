<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Models\Payment;
use App\Services\Tally\TallyClient;
use Illuminate\Console\Command;

class TallyPreview extends Command
{
    protected $signature = 'tally:preview
                            {type : sales-voucher | receipt-voucher}
                            {id   : Order ID for sales-voucher, Payment ID for receipt-voucher}';

    protected $description = 'Print the XML envelope that would be POSTed to Tally for a given order/payment — paste it into a Windows Tally for manual end-to-end testing.';

    public function handle(TallyClient $client): int
    {
        $type = $this->argument('type');
        $id = (int) $this->argument('id');

        if ($type === 'sales-voucher') {
            $order = Order::with('customer', 'items')->find($id);
            if (!$order) {
                $this->error("Order #{$id} not found.");
                return self::FAILURE;
            }

            $payload = [
                'order_code' => $order->order_code,
                'order_date' => $order->order_date?->toDateString() ?? now()->toDateString(),
                'customer_name' => $order->customer?->name ?? 'Unknown',
                'customer_tally_id' => $order->customer?->tally_id,
                'invoice_number' => $order->invoice_number,
                'line_items' => $order->items->map(fn ($i) => [
                    'name' => $i->product_name,
                    'qty' => (float) $i->qty_ordered,
                    'rate' => (float) ($i->unit_price ?? 0),
                    'tax_rate' => (float) ($i->tax_rate ?? 0),
                ])->all(),
            ];

            $this->showHeader($client);
            $this->line('');
            $this->info("--- XML envelope for Sales Voucher (order {$order->order_code}) ---");
            $this->line('');
            $this->line($client->previewSalesVoucherXml($payload));
            $this->line('');
            $this->comment('Copy the XML above and POST it to your Tally gateway (http://TALLY_HOST:9000) to test manually.');
            return self::SUCCESS;
        }

        if ($type === 'receipt-voucher') {
            $payment = Payment::with('order.customer')->find($id);
            if (!$payment) {
                $this->error("Payment #{$id} not found.");
                return self::FAILURE;
            }

            $payload = [
                'paid_on' => $payment->paid_on?->toDateString() ?? now()->toDateString(),
                'amount' => (float) $payment->amount,
                'mode' => $payment->mode,
                'reference' => $payment->reference,
                'order_code' => $payment->order?->order_code,
                'customer_name' => $payment->order?->customer?->name ?? 'Unknown',
                'customer_tally_id' => $payment->order?->customer?->tally_id,
            ];

            $this->showHeader($client);
            $this->line('');
            $this->info("--- XML envelope for Receipt Voucher (payment #{$payment->id}, ₹{$payment->amount}) ---");
            $this->line('');
            $this->line($client->previewReceiptVoucherXml($payload));
            $this->line('');
            $this->comment('Copy the XML above and POST it to your Tally gateway to test manually.');
            return self::SUCCESS;
        }

        $this->error("Unknown type '{$type}'. Use sales-voucher or receipt-voucher.");
        return self::FAILURE;
    }

    private function showHeader(TallyClient $client): void
    {
        $this->table(['Setting', 'Value'], collect($client->summary())->map(fn ($v, $k) => [$k, is_bool($v) ? ($v ? 'true' : 'false') : (string) $v])->values()->all());
    }
}
