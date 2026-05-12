<?php

namespace App\Services\Tally;

use App\Models\AuditLog;
use App\Models\Customer;
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

    public function syncStock(?int $triggeredBy = null): TallySyncLog
    {
        return $this->runSync('stock', $triggeredBy, function () {
            $rows = $this->client->fetchStock();
            $created = $updated = $failed = 0;

            foreach ($rows as $row) {
                $product = Product::query()->where('tally_id', $row['tally_id'])->first();
                if (!$product) { $failed++; continue; }

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

    /**
     * Open a TallySyncLog row, run the callback, close the log with the result.
     * The callback should return ['processed', 'created', 'updated', 'failed', 'sample'].
     */
    private function runSync(string $entityType, ?int $triggeredBy, \Closure $work): TallySyncLog
    {
        $log = TallySyncLog::create([
            'entity_type' => $entityType,
            'direction' => 'pull',
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
        if (!$last) return 'GC-001';
        if (preg_match('/(\d+)$/', $last, $m)) {
            $next = (int) $m[1] + 1;
            return sprintf('GC-%03d', $next);
        }
        return 'GC-' . (Customer::count() + 1);
    }
}
