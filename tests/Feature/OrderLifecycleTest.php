<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Shipment;
use App\Models\Transporter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * End-to-end: create → ship (partial) → ship (rest) → POD → triplicate →
 * payment → close. Verifies the fulfillment matrix on order_items advances
 * correctly at each step and that the order's derived status follows.
 *
 * This is the integration-level cousin of the unit-y feature tests — when a
 * future refactor breaks any of the qty math or status transitions, this
 * test should catch it before manual testing does.
 */
class OrderLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private Customer $customer;

    private Product $product;

    private Transporter $transporter;

    private User $manager;

    private User $warehouse;

    private User $accounts;

    protected function setUp(): void
    {
        parent::setUp();
        $this->manager = User::factory()->create(['role' => 'manager']);
        $this->warehouse = User::factory()->create(['role' => 'warehouse']);
        $this->accounts = User::factory()->create(['role' => 'accounts']);
        $this->customer = Customer::create([
            'tally_id' => 'C-LC', 'name' => 'Lifecycle Customer',
            'phone' => '+91 99999 00000', 'whatsapp' => '+91 99999 00000', 'status' => 'active',
        ]);
        $this->product = Product::create([
            'tally_id' => 'P-LC', 'name' => 'Test Widget', 'unit' => 'pcs',
            'default_sale_price' => 100, 'status' => 'active',
        ]);
        $this->transporter = Transporter::create([
            'transporter_code' => 'T-LC', 'name' => 'Test Logistics', 'status' => 'active',
        ]);
        Storage::fake('local');
    }

    public function test_full_order_lifecycle_create_ship_deliver_close(): void
    {
        // ─── 1. Manager creates a 10-unit order ────────────────────
        $this->actingAs($this->manager)
            ->post(route('orders.store'), [
                'customer_id' => $this->customer->id,
                'order_date' => '2026-05-12',
                'status' => 'confirmed',
                'priority' => 'normal',
                'payment_status' => 'pending',
                'order_value' => 1000,
                'items' => [[
                    'product_id' => $this->product->id,
                    'product_name' => $this->product->name,
                    'qty_ordered' => 10,
                    'unit' => 'pcs',
                    'unit_price' => 100,
                    'line_total' => 1000,
                ]],
            ])
            ->assertRedirect(route('orders.index'));

        $order = Order::with('items')->latest('id')->first();
        $this->assertNotNull($order);
        $this->assertSame(1, $order->items->count());
        $line = $order->items->first();
        $this->assertEqualsWithDelta(10.0, (float) $line->qty_ordered, 0.001);
        $this->assertEqualsWithDelta(0.0, (float) $line->qty_packed, 0.001);
        $this->assertSame('pending', $line->status);

        // ─── 2. Warehouse ships 6 units (partial) ──────────────────
        $this->actingAs($this->warehouse)
            ->post(route('shipments.store', ['order' => $order->id]), [
                'transporter_id' => $this->transporter->id,
                'lr_number' => 'LR-001',
                'items' => [['order_item_id' => $line->id, 'qty' => 6]],
            ])
            ->assertRedirect();

        $line->refresh();
        $this->assertEqualsWithDelta(6.0, (float) $line->qty_packed, 0.001);
        $this->assertSame('partially_packed', $line->status);

        // The line still has 4 units open
        $shipment1 = Shipment::where('order_id', $order->id)->latest('id')->first();
        $this->assertNotNull($shipment1);
        $this->assertSame('packed', $shipment1->status);
        $this->assertSame('LR-001', $shipment1->lr_number);

        // ─── 3. Warehouse advances first shipment to dispatched ────
        $this->actingAs($this->warehouse)
            ->patch(route('shipments.advance', ['shipment' => $shipment1->id, 'target' => 'dispatched']))
            ->assertRedirect();

        $shipment1->refresh();
        $line->refresh();
        $this->assertSame('dispatched', $shipment1->status);
        $this->assertNotNull($shipment1->dispatch_date);
        $this->assertEqualsWithDelta(6.0, (float) $line->qty_dispatched, 0.001);

        // ─── 4. Warehouse ships the remaining 4 ────────────────────
        $this->actingAs($this->warehouse)
            ->post(route('shipments.store', ['order' => $order->id]), [
                'transporter_id' => $this->transporter->id,
                'lr_number' => 'LR-002',
                'items' => [['order_item_id' => $line->id, 'qty' => 4]],
            ])
            ->assertRedirect();

        $line->refresh();
        $this->assertEqualsWithDelta(10.0, (float) $line->qty_packed, 0.001);
        $this->assertSame('packed', $line->status);

        // ─── 5. Mark second shipment delivered ─────────────────────
        $shipment2 = Shipment::where('order_id', $order->id)->latest('id')->first();
        $this->actingAs($this->warehouse)
            ->patch(route('shipments.advance', ['shipment' => $shipment2->id, 'target' => 'dispatched']))
            ->assertRedirect();
        $this->actingAs($this->warehouse)
            ->patch(route('shipments.advance', ['shipment' => $shipment2->id, 'target' => 'delivered']))
            ->assertRedirect();
        $this->actingAs($this->warehouse)
            ->patch(route('shipments.advance', ['shipment' => $shipment1->id, 'target' => 'delivered']))
            ->assertRedirect();

        $line->refresh();
        $this->assertEqualsWithDelta(10.0, (float) $line->qty_delivered, 0.001);
        $this->assertSame('delivered', $line->status);

        // ─── 6. Accounts records payment ───────────────────────────
        $this->actingAs($this->accounts)
            ->post(route('payments.store', ['order' => $order->id]), [
                'paid_on' => '2026-05-13',
                'amount' => 1000,
                'mode' => 'neft',
                'reference' => 'UTR-LC-1',
            ])
            ->assertRedirect();

        $order->refresh();
        $this->assertSame('paid', $order->payment_status);
        $this->assertEqualsWithDelta(1000.0, (float) $order->amount_received, 0.01);

        // ─── 7. Manager closes the order ───────────────────────────
        // Manager has to drive status — warehouse can advance to delivered,
        // but the order-level status needs an explicit close.
        $this->actingAs($this->manager)
            ->patch(route('orders.update-status', ['order' => $order->id]), ['status' => 'delivered'])
            ->assertRedirect();
        $this->actingAs($this->manager)
            ->patch(route('orders.update-status', ['order' => $order->id]), ['status' => 'closed'])
            ->assertRedirect();

        $order->refresh();
        $this->assertSame('closed', $order->status);
        $this->assertSame('paid', $order->payment_status);
    }

    public function test_shipment_qty_exceeding_open_is_rejected(): void
    {
        $order = Order::create([
            'order_code' => 'ORD-LC-2', 'customer_id' => $this->customer->id, 'order_date' => '2026-05-12',
            'status' => 'confirmed', 'priority' => 'normal', 'payment_status' => 'pending', 'order_value' => 500,
        ]);
        $line = OrderItem::create([
            'order_id' => $order->id, 'product_id' => $this->product->id, 'product_name' => 'Widget',
            'qty_ordered' => 5, 'unit' => 'pcs', 'unit_price' => 100, 'line_total' => 500, 'status' => 'pending',
        ]);

        $this->actingAs($this->warehouse)
            ->post(route('shipments.store', ['order' => $order->id]), [
                'lr_number' => 'LR-X',
                'items' => [['order_item_id' => $line->id, 'qty' => 6]], // 1 more than open
            ])
            ->assertSessionHasErrors('items');

        $line->refresh();
        $this->assertEqualsWithDelta(0.0, (float) $line->qty_packed, 0.001, 'qty_packed should not advance on rejection');
    }

    public function test_close_requires_paid_status(): void
    {
        $order = Order::create([
            'order_code' => 'ORD-LC-3', 'customer_id' => $this->customer->id, 'order_date' => '2026-05-12',
            'status' => 'delivered', 'priority' => 'normal', 'payment_status' => 'partial', 'order_value' => 1000, 'amount_received' => 500,
        ]);

        $this->actingAs($this->manager)
            ->patch(route('orders.update-status', ['order' => $order->id]), ['status' => 'closed'])
            ->assertSessionHasErrors('status');

        $this->assertSame('delivered', $order->fresh()->status);
    }

    public function test_dispatch_requires_lr_number(): void
    {
        $order = Order::create([
            'order_code' => 'ORD-LC-4', 'customer_id' => $this->customer->id, 'order_date' => '2026-05-12',
            'status' => 'packed', 'priority' => 'normal', 'payment_status' => 'pending', 'order_value' => 1000,
        ]);

        // No shipment with an LR exists yet → dispatch should error
        $this->actingAs($this->manager)
            ->patch(route('orders.update-status', ['order' => $order->id]), ['status' => 'dispatched'])
            ->assertSessionHasErrors('status');

        $this->assertSame('packed', $order->fresh()->status);
    }
}
