<?php

namespace App\Services\Tally;

use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\StockItem;
use App\Models\TallySyncLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Orchestrates Tally → OCC syncs. Each entity-type method:
 *   - Opens a TallySyncLog row in 'running' state
 *   - Calls TallyClient to fetch payload
 *   - Upserts into the local table by tally_id
 *   - Closes the log with final counts + status
 *
 * Can be invoked from:
 *   - artisan tally:sync command (scheduled or manual)
 *   - The Integrations settings page "Sync now" button
 */
class TallySyncService
{
    public function __construct(protected TallyClient $client) {}

    public function syncAll(?int $triggeredBy = null): array
    {
        return [
            'customers' => $this->syncCustomers($triggeredBy),
            'products' => $this->syncProducts($triggeredBy),
            'stock' => $this->syncStock($triggeredBy),
            'sales_vouchers' => $this->syncSalesVouchers($triggeredBy),
            'purchase_vouchers' => $this->syncPurchaseVouchers($triggeredBy),
        ];
    }

    /**
     * Push a single order's sales voucher. Called from OrderObserver when an
     * order transitions to delivered/closed. No-op if already pushed.
     *
     * @return ?string The Tally voucher ID, or null on failure.
     */
    public function pushSingleOrder(Order $order): ?string
    {
        if ($order->tally_voucher_id) {
            return $order->tally_voucher_id;
        } // already pushed
        $order->loadMissing(['customer', 'items']);

        $res = $this->client->pushSalesVoucher([
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
        ]);

        if ($res['ok'] && $res['tally_id']) {
            $order->forceFill([
                'tally_voucher_id' => $res['tally_id'],
                'tally_pushed_at' => now(),
            ])->saveQuietly(); // skip observers — we don't want a recursive push
            AuditLog::record('tally_voucher_created', $order, [
                'voucher_id' => ['from' => null, 'to' => $res['tally_id']],
            ]);

            return $res['tally_id'];
        }

        return null;
    }

    /**
     * Push a single payment's receipt voucher. Called from PaymentObserver.
     *
     * @return ?string The Tally voucher ID, or null on failure.
     */
    public function pushSinglePayment(Payment $payment): ?string
    {
        if ($payment->tally_voucher_id) {
            return $payment->tally_voucher_id;
        }
        $payment->loadMissing('order.customer');

        $res = $this->client->pushReceiptVoucher([
            'paid_on' => $payment->paid_on?->toDateString() ?? now()->toDateString(),
            'amount' => (float) $payment->amount,
            'mode' => $payment->mode,
            'reference' => $payment->reference,
            'order_code' => $payment->order?->order_code,
            'customer_name' => $payment->order?->customer?->name ?? 'Unknown',
            'customer_tally_id' => $payment->order?->customer?->tally_id,
        ]);

        if ($res['ok'] && $res['tally_id']) {
            $payment->forceFill([
                'tally_voucher_id' => $res['tally_id'],
                'tally_pushed_at' => now(),
            ])->saveQuietly();
            AuditLog::record('tally_receipt_created', $payment, [
                'voucher_id' => ['from' => null, 'to' => $res['tally_id']],
            ]);

            return $res['tally_id'];
        }

        return null;
    }

    /**
     * Run both directions for a full reconciliation:
     *   1. Pull masters + stock from Tally
     *   2. Push pending OCC customers + orders + payments to Tally
     */
    public function reconcile(?int $triggeredBy = null): array
    {
        return [
            'pull' => $this->syncAll($triggeredBy),
            'push' => [
                'customers' => $this->pushCustomers($triggeredBy),
                'orders' => $this->pushOrders($triggeredBy),
                'payments' => $this->pushPayments($triggeredBy),
            ],
        ];
    }

    public function syncCustomers(?int $triggeredBy = null): TallySyncLog
    {
        return $this->runSync('customers', $triggeredBy, function () {
            $rows = $this->client->fetchCustomers();
            $created = $updated = 0;

            foreach ($rows as $row) {
                $existing = Customer::query()->where('tally_id', $row['tally_id'])->first();
                $payload = [
                    'tally_id' => $row['tally_id'],
                    'name' => $row['name'],
                    'gstin' => $row['gstin'] ?? null,
                    'billing_address' => $row['address'] ?? null,
                    'phone' => $row['phone'] ?? null,
                    'email' => $row['email'] ?? null,
                    'payment_terms' => $row['payment_terms'] ?? null,
                    'tally_synced_at' => now(),
                ];

                if ($existing) {
                    $existing->update($payload);
                    $updated++;
                } else {
                    Customer::create(array_merge($payload, [
                        'customer_code' => $this->generateCustomerCode(),
                        'status' => 'active',
                    ]));
                    $created++;
                }
            }

            return [
                'processed' => count($rows),
                'created' => $created,
                'updated' => $updated,
                'failed' => 0,
                'sample' => array_slice($rows, 0, 3),
            ];
        });
    }

    public function syncProducts(?int $triggeredBy = null): TallySyncLog
    {
        return $this->runSync('products', $triggeredBy, function () {
            $rows = $this->client->fetchProducts();
            $created = $updated = 0;

            foreach ($rows as $row) {
                $existing = Product::query()->where('tally_id', $row['tally_id'])->first();
                $payload = [
                    'tally_id' => $row['tally_id'],
                    'name' => $row['name'],
                    'sku' => $row['sku'] ?? null,
                    'unit' => $row['unit'] ?? null,
                    'gst_rate' => $row['gst_rate'] ?? null,
                    'mrp' => $row['mrp'] ?? null,
                    'hsn_code' => $row['hsn_code'] ?? null,
                    'tally_synced_at' => now(),
                    'is_active' => true,
                ];

                if ($existing) {
                    $existing->update($payload);
                    $updated++;
                } else {
                    Product::create($payload);
                    $created++;
                }
            }

            return [
                'processed' => count($rows),
                'created' => $created,
                'updated' => $updated,
                'failed' => 0,
                'sample' => array_slice($rows, 0, 3),
            ];
        });
    }

    public function syncSalesVouchers(?int $triggeredBy = null): TallySyncLog
    {
        return $this->runSync('sales_vouchers', $triggeredBy, function () {
            $rows = $this->client->fetchSalesVouchers();

            // We don't persist these yet — they show up in Customer/Product analytics
            // once we add a tally_vouchers table. For now just count + sample so the
            // sync log audit trail is right.
            return [
                'processed' => count($rows),
                'created' => count($rows),
                'updated' => 0,
                'failed' => 0,
                'sample' => array_slice($rows, 0, 3),
            ];
        });
    }

    public function syncPurchaseVouchers(?int $triggeredBy = null): TallySyncLog
    {
        return $this->runSync('purchase_vouchers', $triggeredBy, function () {
            $rows = $this->client->fetchPurchaseVouchers();

            return [
                'processed' => count($rows),
                'created' => count($rows),
                'updated' => 0,
                'failed' => 0,
                'sample' => array_slice($rows, 0, 3),
            ];
        });
    }

    public function syncStock(?int $triggeredBy = null): TallySyncLog
    {
        return $this->runSync('stock', $triggeredBy, function () {
            $rows = $this->client->fetchStock();
            $created = $updated = $failed = 0;

            foreach ($rows as $row) {
                $product = Product::query()->where('tally_id', $row['tally_id'])->first();
                if (! $product) {
                    $failed++;

                    continue;
                }

                $stock = StockItem::query()
                    ->where('product_id', $product->id)
                    ->where('godown_name', $row['godown'])
                    ->first();

                $payload = [
                    'product_id' => $product->id,
                    'godown_name' => $row['godown'],
                    'qty_closing' => $row['qty'],
                    'as_of_date' => $row['as_of_date'],
                    'tally_synced_at' => now(),
                ];

                if ($stock) {
                    $stock->update($payload);
                    $updated++;
                } else {
                    StockItem::create($payload);
                    $created++;
                }
            }

            return [
                'processed' => count($rows),
                'created' => $created,
                'updated' => $updated,
                'failed' => $failed,
                'sample' => array_slice($rows, 0, 3),
            ];
        });
    }

    // ─── PUSH direction: OCC → Tally ────────────────────────────────

    /**
     * Push any customer not yet present in Tally (no tally_id) up as a ledger.
     * Stores the returned tally_id back on the customer so future syncs match.
     */
    public function pushCustomers(?int $triggeredBy = null): TallySyncLog
    {
        return $this->runSync('customers', $triggeredBy, function () {
            // Only push customers that originated in OCC (no Tally id, or a DEV- placeholder from the seeder).
            // Customers with a TALLY- prefix already exist in Tally from a prior pull/push and are skipped.
            $customers = Customer::query()
                ->where(function ($q) {
                    $q->whereNull('tally_id')->orWhere('tally_id', 'like', 'DEV-%');
                })
                ->get();

            $created = $failed = 0;
            foreach ($customers as $c) {
                $res = $this->client->pushCustomer([
                    'tally_id' => $c->tally_id,
                    'name' => $c->name,
                    'gstin' => $c->gstin,
                    'address' => $c->billing_address,
                    'phone' => $c->phone,
                    'email' => $c->email,
                    'payment_terms' => $c->payment_terms,
                ]);
                if ($res['ok'] && $res['tally_id']) {
                    // If another customer already owns this tally_id (rare in production,
                    // common in demo mode where IDs are derived from name hash), skip.
                    $clash = Customer::query()
                        ->where('tally_id', $res['tally_id'])
                        ->where('id', '!=', $c->id)
                        ->exists();
                    if ($clash) {
                        $failed++;

                        continue;
                    }
                    $c->forceFill(['tally_id' => $res['tally_id'], 'tally_synced_at' => now()])->save();
                    $created++;
                } else {
                    $failed++;
                }
            }

            return [
                'processed' => $customers->count(),
                'created' => $created,
                'updated' => 0,
                'failed' => $failed,
                'sample' => $customers->take(3)->map(fn ($c) => ['name' => $c->name, 'gstin' => $c->gstin])->all(),
            ];
        }, direction: 'push');
    }

    /**
     * Push orders that are dispatched / delivered / closed and don't yet have
     * a Tally voucher (we'd track this with an `external_tally_id` column on
     * orders in a follow-up; for now we push everything in those statuses).
     */
    public function pushOrders(?int $triggeredBy = null): TallySyncLog
    {
        return $this->runSync('vouchers', $triggeredBy, function () {
            $orders = Order::query()
                ->whereIn('status', ['dispatched', 'delivered', 'closed'])
                ->with('customer', 'items')
                ->get();

            $created = $failed = 0;
            foreach ($orders as $o) {
                $res = $this->client->pushSalesVoucher([
                    'order_code' => $o->order_code,
                    'order_date' => $o->order_date?->toDateString() ?? now()->toDateString(),
                    'customer_name' => $o->customer?->name ?? 'Unknown',
                    'customer_tally_id' => $o->customer?->tally_id,
                    'invoice_number' => $o->invoice_number,
                    'line_items' => $o->items->map(fn ($i) => [
                        'name' => $i->product_name,
                        'qty' => (float) $i->qty_ordered,
                        'rate' => (float) ($i->unit_price ?? 0),
                        'tax_rate' => (float) ($i->tax_rate ?? 0),
                    ])->all(),
                ]);
                if ($res['ok']) {
                    $created++;
                } else {
                    $failed++;
                }
            }

            return [
                'processed' => $orders->count(),
                'created' => $created,
                'updated' => 0,
                'failed' => $failed,
                'sample' => $orders->take(3)->map(fn ($o) => ['order_code' => $o->order_code, 'value' => $o->order_value])->all(),
            ];
        }, direction: 'push');
    }

    /**
     * Push every payment recorded in OCC to Tally as a receipt voucher.
     */
    public function pushPayments(?int $triggeredBy = null): TallySyncLog
    {
        return $this->runSync('vouchers', $triggeredBy, function () {
            $payments = Payment::query()
                ->with('order.customer')
                ->get();

            $created = $failed = 0;
            foreach ($payments as $p) {
                $res = $this->client->pushReceiptVoucher([
                    'paid_on' => $p->paid_on?->toDateString() ?? now()->toDateString(),
                    'amount' => (float) $p->amount,
                    'mode' => $p->mode,
                    'reference' => $p->reference,
                    'order_code' => $p->order?->order_code,
                    'customer_name' => $p->order?->customer?->name ?? 'Unknown',
                    'customer_tally_id' => $p->order?->customer?->tally_id,
                ]);
                if ($res['ok']) {
                    $created++;
                } else {
                    $failed++;
                }
            }

            return [
                'processed' => $payments->count(),
                'created' => $created,
                'updated' => 0,
                'failed' => $failed,
                'sample' => $payments->take(3)->map(fn ($p) => ['amount' => $p->amount, 'mode' => $p->mode])->all(),
            ];
        }, direction: 'push');
    }

    /**
     * Open a TallySyncLog row, run the callback, close the log with the result.
     * The callback should return ['processed', 'created', 'updated', 'failed', 'sample'].
     */
    private function runSync(string $entityType, ?int $triggeredBy, \Closure $work, string $direction = 'pull'): TallySyncLog
    {
        $log = TallySyncLog::create([
            'entity_type' => $entityType,
            'direction' => $direction,
            'status' => 'running',
            'started_at' => now(),
            'triggered_by' => $triggeredBy ?? Auth::id(),
        ]);

        try {
            $result = $work();
            $log->update([
                'status' => $this->client->isEnabled() ? ($result['failed'] > 0 ? 'partial' : 'success') : 'demo',
                'records_processed' => $result['processed'],
                'records_created' => $result['created'],
                'records_updated' => $result['updated'],
                'records_failed' => $result['failed'],
                'sample_payload' => $result['sample'] ?? null,
                'completed_at' => now(),
            ]);

            AuditLog::record('tally_sync_completed', $log, [
                'entity_type' => ['from' => null, 'to' => $entityType],
                'created' => ['from' => null, 'to' => (string) $result['created']],
                'updated' => ['from' => null, 'to' => (string) $result['updated']],
            ]);
        } catch (Throwable $e) {
            $log->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'completed_at' => now(),
            ]);
            AuditLog::record('tally_sync_failed', $log, [
                'entity_type' => ['from' => null, 'to' => $entityType],
                'error' => ['from' => null, 'to' => $e->getMessage()],
            ]);
        }

        return $log->fresh();
    }

    private function generateCustomerCode(): string
    {
        $last = DB::table('customers')->orderByDesc('id')->value('customer_code');
        if (! $last) {
            return 'GC-001';
        }
        if (preg_match('/(\d+)$/', $last, $m)) {
            $next = (int) $m[1] + 1;

            return sprintf('GC-%03d', $next);
        }

        return 'GC-'.(Customer::count() + 1);
    }
}
