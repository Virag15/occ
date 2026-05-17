<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Shipment;
use App\Models\StockItem;
use App\Models\Tenant;
use App\Models\Transporter;
use App\Models\User;
use App\Observers\AuditObserver;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        AuditObserver::$enabled = false;

        $this->seedTenants();
        $this->seedUsers();
        $this->seedTransporters();
        $this->seedTallyMirrors();
        $this->seedOrders();

        AuditObserver::$enabled = true;
    }

    /**
     * Seed the first tenant — GC Communication itself. All pre-existing data
     * (customers, orders, etc.) belongs to this tenant. New tenants get
     * provisioned via the leads pipeline; this seeder only sets up tenant #1.
     */
    private function seedTenants(): void
    {
        Tenant::firstOrCreate(
            ['name' => 'GC Communication'],
            [
                'slug' => 'gc-communication',
                'status' => Tenant::STATUS_ACTIVE,
                'plan' => 'custom',
            ],
        );
    }

    private function seedOrders(): void
    {
        if (Order::query()->exists()) {
            return;
        }

        $customerIds = Customer::query()->pluck('id')->all();
        $transporterIds = Transporter::query()->pluck('id')->all();
        if (empty($customerIds) || empty($transporterIds)) {
            return;
        }

        $samples = [
            ['status' => 'new_order',          'payment_status' => 'not_due', 'priority' => 'normal',  'value' => 75000,  'brands' => ['C&S Electric'],            'days_ago' => 0],
            ['status' => 'confirmed',          'payment_status' => 'not_due', 'priority' => 'high',    'value' => 215000, 'brands' => ['BCH Electric', 'Luker'],   'days_ago' => 1],
            ['status' => 'packing',            'payment_status' => 'pending', 'priority' => 'normal',  'value' => 138000, 'brands' => ['C&S Electric'],            'days_ago' => 2],
            ['status' => 'ready_for_dispatch', 'payment_status' => 'pending', 'priority' => 'urgent',  'value' => 412000, 'brands' => ['BCH Electric'],            'days_ago' => 3],
            ['status' => 'dispatched',         'payment_status' => 'pending', 'priority' => 'normal',  'value' => 95000,  'brands' => ['Kaycee'],                  'days_ago' => 5, 'lr' => 'LR-2026-00451'],
            ['status' => 'delivered',          'payment_status' => 'partial', 'priority' => 'normal',  'value' => 188000, 'brands' => ['Luker'],                   'days_ago' => 10, 'lr' => 'LR-2026-00432'],
            ['status' => 'closed',             'payment_status' => 'paid',    'priority' => 'normal',  'value' => 62000,  'brands' => ['Suraj'],                   'days_ago' => 21, 'lr' => 'LR-2026-00398'],
            ['status' => 'on_hold',            'payment_status' => 'not_due', 'priority' => 'low',     'value' => 31000,  'brands' => ['C&S Electric'],            'days_ago' => 7],
        ];

        $products = Product::query()->get();
        if ($products->isEmpty()) {
            return;
        }

        $year = now()->year;
        foreach ($samples as $i => $s) {
            $orderDate = now()->subDays($s['days_ago']);
            $order = Order::create([
                'order_code' => sprintf('ORD-%d-%04d', $year, $i + 1),
                'customer_id' => $customerIds[$i % count($customerIds)],
                'order_date' => $orderDate->toDateString(),
                'order_source' => 'whatsapp',
                'brands' => $s['brands'],
                'order_value' => $s['value'],
                'status' => $s['status'],
                'priority' => $s['priority'],
                'payment_status' => $s['payment_status'],
                'payment_terms' => '30_days',
                'lr_shared_with_customer' => isset($s['lr']),
            ]);

            // For dispatched / delivered / closed orders, also seed a corresponding shipment
            // so the order's accessors (transporter / lr_number / dispatch_date / delivered_date)
            // have something to return.
            if (in_array($s['status'], ['dispatched', 'delivered', 'closed'], true)) {
                Shipment::create([
                    'shipment_code' => Shipment::generateCode(),
                    'order_id' => $order->id,
                    'transporter_id' => $transporterIds[$i % count($transporterIds)],
                    'status' => $s['status'] === 'closed' ? 'closed' : ($s['status'] === 'delivered' ? 'delivered' : 'dispatched'),
                    'lr_number' => $s['lr'] ?? null,
                    'lr_shared_with_customer' => isset($s['lr']),
                    'dispatch_date' => $orderDate->copy()->addDay()->toDateString(),
                    'delivered_date' => in_array($s['status'], ['delivered', 'closed'], true) ? $orderDate->copy()->addDays(3)->toDateString() : null,
                ]);
            }

            // Each order gets 1–3 line items so fulfillment scenarios are testable.
            $lineCount = ($i % 3) + 1;
            $picked = $products->random(min($lineCount, $products->count()));
            $orderTotal = 0;
            foreach ($picked as $j => $p) {
                $qty = (int) [10, 25, 50, 100][($i + $j) % 4];
                $unitPrice = (float) ($p->default_sale_price ?: $p->mrp ?: 100);
                $tax = (float) ($p->gst_rate ?: 18);
                $lineSubtotal = $qty * $unitPrice;
                $lineTotal = round($lineSubtotal + ($lineSubtotal * $tax / 100), 2);
                $orderTotal += $lineTotal;

                // Set fulfillment quantities based on order status
                $qtyPacked = 0;
                $qtyDispatched = 0;
                $qtyDelivered = 0;
                $lineStatus = 'pending';
                if (in_array($s['status'], ['packed', 'ready_for_dispatch'], true)) {
                    $qtyPacked = $qty;
                    $lineStatus = 'packed';
                } elseif ($s['status'] === 'dispatched') {
                    $qtyPacked = $qty;
                    $qtyDispatched = $qty;
                    $lineStatus = 'dispatched';
                } elseif (in_array($s['status'], ['delivered', 'closed'], true)) {
                    $qtyPacked = $qty;
                    $qtyDispatched = $qty;
                    $qtyDelivered = $qty;
                    $lineStatus = 'delivered';
                } elseif ($s['status'] === 'packing') {
                    // partial pack
                    $qtyPacked = (int) floor($qty * 0.5);
                    $lineStatus = $qtyPacked > 0 ? 'partially_packed' : 'pending';
                }

                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $p->id,
                    'product_name' => $p->name,
                    'qty_ordered' => $qty,
                    'qty_packed' => $qtyPacked,
                    'qty_dispatched' => $qtyDispatched,
                    'qty_delivered' => $qtyDelivered,
                    'unit' => $p->unit,
                    'unit_price' => $unitPrice,
                    'tax_rate' => $tax,
                    'line_total' => $lineTotal,
                    'status' => $lineStatus,
                ]);
            }

            // Override order_value with computed line sum
            $order->update(['order_value' => $orderTotal]);
        }
    }

    private function seedUsers(): void
    {
        // Link the founder to the GC Communication tenant (seedTenants
        // runs first). A null tenant_id is valid but means an owner sees
        // ALL tenants' data via the scope fallback — not what we want for
        // the primary GC account.
        $gcTenantId = Tenant::where('slug', 'gc-communication')->value('id');

        $virag = User::firstOrCreate(
            ['email' => 'virag@deltasystem.in'],
            [
                'name' => 'Virag Bora',
                'password' => Hash::make('password'),
                'role' => 'owner',
                'density_preference' => 'comfortable',
                'email_verified_at' => now(),
                'is_platform_admin' => true,
            ],
        );

        if ($gcTenantId && $virag->tenant_id !== $gcTenantId) {
            $virag->forceFill(['tenant_id' => $gcTenantId])->save();
        }
    }

    private function seedTransporters(): void
    {
        $rows = [
            ['name' => 'VRL Logistics', 'city' => 'Nashik', 'avg_transit_days' => 2, 'triplicate_reliability' => 5, 'areas_served' => ['maharashtra', 'gujarat']],
            ['name' => 'Gati-KWE', 'city' => 'Nashik', 'avg_transit_days' => 3, 'triplicate_reliability' => 4, 'areas_served' => ['pan_india']],
            ['name' => 'TCI Express', 'city' => 'Mumbai', 'avg_transit_days' => 2, 'triplicate_reliability' => 4, 'areas_served' => ['maharashtra', 'gujarat', 'mp']],
            ['name' => 'Safexpress', 'city' => 'Nashik', 'avg_transit_days' => 3, 'triplicate_reliability' => 5, 'areas_served' => ['pan_india']],
            ['name' => 'Local Tempo Service', 'city' => 'Nashik', 'avg_transit_days' => 1, 'triplicate_reliability' => 3, 'areas_served' => ['maharashtra']],
        ];

        foreach ($rows as $i => $row) {
            Transporter::firstOrCreate(
                ['name' => $row['name']],
                $row + [
                    'transporter_code' => sprintf('TRP-%03d', $i + 1),
                    'status' => 'active',
                    'payment_terms' => 'monthly',
                ],
            );
        }
    }

    private function seedTallyMirrors(): void
    {
        // Placeholder customers/products marked with DEV- tally_ids so they're easy
        // to wipe when the real Tally bridge starts pushing data.
        $customers = [
            ['name' => 'Sharma Electricals', 'city' => 'Nashik', 'customer_type' => 'dealer'],
            ['name' => 'Patel Switchgears', 'city' => 'Surat', 'customer_type' => 'dealer'],
            ['name' => 'BuildPro Contractors', 'city' => 'Pune', 'customer_type' => 'contractor'],
            ['name' => 'MSEB Tender Cell', 'city' => 'Mumbai', 'customer_type' => 'government'],
            ['name' => 'Krishna Engineering', 'city' => 'Indore', 'customer_type' => 'oem'],
        ];

        foreach ($customers as $i => $c) {
            Customer::firstOrCreate(
                ['tally_id' => sprintf('DEV-CUST-%03d', $i + 1)],
                $c + [
                    'customer_code' => sprintf('GC-%03d', $i + 1),
                    'payment_terms' => '30_days',
                    'brand_preferences' => ['C&S Electric', 'BCH Electric'],
                    'status' => 'active',
                    'state' => 'Maharashtra',
                ],
            );
        }

        $products = [
            ['name' => 'C&S MCB 6A SP', 'brand' => 'C&S Electric', 'sku' => 'CS-MCB-6A', 'unit' => 'NOS', 'mrp' => 180],
            ['name' => 'C&S MCB 32A DP', 'brand' => 'C&S Electric', 'sku' => 'CS-MCB-32A', 'unit' => 'NOS', 'mrp' => 540],
            ['name' => 'BCH Contactor 32A', 'brand' => 'BCH Electric', 'sku' => 'BCH-CTR-32A', 'unit' => 'NOS', 'mrp' => 1450],
            ['name' => 'Luker Distribution Board 8-way', 'brand' => 'Luker', 'sku' => 'LK-DB-8W', 'unit' => 'NOS', 'mrp' => 2200],
            ['name' => 'Kaycee Selector Switch', 'brand' => 'Kaycee', 'sku' => 'KC-SS-3P', 'unit' => 'NOS', 'mrp' => 320],
        ];

        // qty_on_hand and min/reorder thresholds for the dev sample, including one negative case
        $stockProfiles = [
            ['qty' => 240,  'min' => 50,  'reorder' => 100, 'reason' => null],
            ['qty' => 18,   'min' => 30,  'reorder' => 60,  'reason' => null],  // below min
            ['qty' => 75,   'min' => 25,  'reorder' => 50,  'reason' => null],
            ['qty' => 4,    'min' => 6,   'reorder' => 12,  'reason' => null],  // below min
            ['qty' => -12,  'min' => 10,  'reorder' => 20,  'reason' => 'Overbooked against ORD-2026-0004 (412k order pending stock-in from C&S Electric, ETA 3 days)'],
        ];

        foreach ($products as $i => $p) {
            $stock = $stockProfiles[$i] ?? ['qty' => 0, 'min' => null, 'reorder' => null, 'reason' => null];

            $product = Product::firstOrCreate(
                ['tally_id' => sprintf('DEV-PROD-%03d', $i + 1)],
                $p + [
                    'hsn_code' => '8536',
                    'gst_rate' => 18.00,
                    'default_sale_price' => $p['mrp'] * 0.85,
                    'default_purchase_price' => $p['mrp'] * 0.62,
                    'min_order_level' => $stock['min'],
                    'reorder_level' => $stock['reorder'],
                    'negative_stock_reason' => $stock['reason'],
                    'is_active' => true,
                ],
            );

            StockItem::firstOrCreate(
                ['product_id' => $product->id, 'godown_name' => 'Main'],
                [
                    'qty_opening' => $stock['qty'],
                    'qty_inward' => 0,
                    'qty_outward' => 0,
                    'qty_closing' => $stock['qty'],
                    'as_of_date' => now()->toDateString(),
                ],
            );
        }
    }
}
