<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderLineItemsTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private Customer $customer;

    private Product $product;

    private Product $product2;

    protected function setUp(): void
    {
        parent::setUp();
        $this->owner = User::factory()->create(['role' => 'owner']);
        $this->customer = Customer::create([
            'tally_id' => 'TEST-CUST-1',
            'name' => 'Acme Switchgear',
            'status' => 'active',
        ]);
        $this->product = Product::create([
            'tally_id' => 'TEST-PROD-1',
            'name' => 'C&S MCB 32A',
            'sku' => 'CS-MCB-32A',
            'unit' => 'NOS',
            'default_sale_price' => 540,
            'gst_rate' => 18,
            'is_active' => true,
        ]);
        $this->product2 = Product::create([
            'tally_id' => 'TEST-PROD-2',
            'name' => 'BCH Contactor 32A',
            'unit' => 'NOS',
            'default_sale_price' => 1450,
            'gst_rate' => 18,
            'is_active' => true,
        ]);
    }

    public function test_creates_an_order_with_line_items_and_derives_order_value(): void
    {
        $this->actingAs($this->owner);

        $payload = [
            'customer_id' => $this->customer->id,
            'order_date' => '2026-05-12',
            'status' => 'new_order',
            'priority' => 'normal',
            'payment_status' => 'not_due',
            'items' => [
                ['product_id' => $this->product->id, 'product_name' => $this->product->name, 'qty_ordered' => 100, 'unit_price' => 540, 'tax_rate' => 18, 'line_total' => 63720],
                ['product_id' => $this->product2->id, 'product_name' => $this->product2->name, 'qty_ordered' => 10, 'unit_price' => 1450, 'tax_rate' => 18, 'line_total' => 17110],
            ],
        ];

        $response = $this->post('/orders', $payload);
        $response->assertRedirect('/orders');

        $order = Order::query()->latest('id')->first();
        $this->assertNotNull($order);
        $this->assertCount(2, $order->items);
        $this->assertEquals(63720.0 + 17110.0, (float) $order->order_value);

        $firstItem = $order->items->first();
        $this->assertEquals($this->product->id, $firstItem->product_id);
        $this->assertEquals(100.0, (float) $firstItem->qty_ordered);
        $this->assertEquals('pending', $firstItem->status);
    }

    public function test_snapshots_product_name_on_line_item(): void
    {
        $this->actingAs($this->owner);

        $this->post('/orders', [
            'customer_id' => $this->customer->id,
            'order_date' => '2026-05-12',
            'status' => 'new_order',
            'priority' => 'normal',
            'payment_status' => 'not_due',
            'items' => [
                ['product_id' => $this->product->id, 'product_name' => 'C&S MCB 32A', 'qty_ordered' => 5, 'unit_price' => 540, 'tax_rate' => 18, 'line_total' => 3186],
            ],
        ]);

        $order = Order::latest('id')->first();
        $item = $order->items->first();
        $this->assertEquals('C&S MCB 32A', $item->product_name);

        $this->product->update(['name' => 'Renamed product']);
        $this->assertEquals('C&S MCB 32A', $item->fresh()->product_name);
    }

    public function test_replaces_line_items_on_update(): void
    {
        $this->actingAs($this->owner);

        $order = Order::create([
            'order_code' => 'ORD-2026-9001',
            'customer_id' => $this->customer->id,
            'order_date' => '2026-05-12',
            'status' => 'confirmed',
            'priority' => 'normal',
            'payment_status' => 'not_due',
            'order_value' => 0,
        ]);
        $existing = $order->items()->create([
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'qty_ordered' => 50,
            'unit_price' => 540,
            'tax_rate' => 18,
            'line_total' => 31860,
            'status' => 'pending',
        ]);

        $this->patch("/orders/{$order->id}", [
            'customer_id' => $this->customer->id,
            'order_date' => '2026-05-12',
            'status' => 'confirmed',
            'priority' => 'normal',
            'payment_status' => 'not_due',
            'items' => [
                ['id' => $existing->id, 'product_id' => $this->product->id, 'product_name' => $this->product->name, 'qty_ordered' => 75, 'unit_price' => 540, 'tax_rate' => 18, 'line_total' => 47790],
                ['product_id' => $this->product2->id, 'product_name' => $this->product2->name, 'qty_ordered' => 5, 'unit_price' => 1450, 'tax_rate' => 18, 'line_total' => 8555],
            ],
        ]);

        $order->refresh()->load('items');
        $this->assertCount(2, $order->items);

        $kept = OrderItem::find($existing->id);
        $this->assertNotNull($kept);
        $this->assertEquals(75.0, (float) $kept->qty_ordered);
    }

    public function test_order_item_derive_status_reflects_progress(): void
    {
        $item = new OrderItem(['qty_ordered' => 100, 'qty_packed' => 0, 'qty_dispatched' => 0, 'qty_delivered' => 0, 'qty_cancelled' => 0]);
        $this->assertEquals('pending', $item->deriveStatus());

        $item->qty_packed = 40;
        $this->assertEquals('partially_packed', $item->deriveStatus());

        $item->qty_packed = 100;
        $this->assertEquals('packed', $item->deriveStatus());

        $item->qty_dispatched = 100;
        $this->assertEquals('dispatched', $item->deriveStatus());

        $item->qty_delivered = 100;
        $this->assertEquals('delivered', $item->deriveStatus());

        $item2 = new OrderItem(['qty_ordered' => 100, 'qty_cancelled' => 100]);
        $this->assertEquals('cancelled', $item2->deriveStatus());
    }

    public function test_open_qty_reflects_remaining(): void
    {
        $item = new OrderItem([
            'qty_ordered' => 100, 'qty_packed' => 40, 'qty_cancelled' => 10,
        ]);
        $this->assertEquals(50.0, $item->open_qty);
    }
}
