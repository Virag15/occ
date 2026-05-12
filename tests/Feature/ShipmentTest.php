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
use Tests\TestCase;

class ShipmentTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private Order $order;

    private OrderItem $line;

    private Transporter $transporter;

    protected function setUp(): void
    {
        parent::setUp();
        $this->owner = User::factory()->create(['role' => 'owner']);
        $this->actingAs($this->owner);

        $customer = Customer::create(['tally_id' => 'C1', 'name' => 'Acme', 'status' => 'active']);
        $product = Product::create(['tally_id' => 'P1', 'name' => 'MCB 32A', 'unit' => 'NOS', 'is_active' => true]);
        $this->transporter = Transporter::create(['name' => 'VRL', 'status' => 'active']);

        $this->order = Order::create([
            'order_code' => 'ORD-T-1',
            'customer_id' => $customer->id,
            'order_date' => '2026-05-12',
            'status' => 'confirmed',
            'priority' => 'normal',
            'payment_status' => 'not_due',
            'order_value' => 0,
        ]);
        $this->line = $this->order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'qty_ordered' => 100,
            'unit_price' => 540,
            'tax_rate' => 18,
            'line_total' => 63720,
            'status' => 'pending',
        ]);
    }

    public function test_creates_shipment_and_increments_qty_packed(): void
    {
        $this->post("/orders/{$this->order->id}/shipments", [
            'transporter_id' => $this->transporter->id,
            'lr_number' => 'LR-001',
            'items' => [['order_item_id' => $this->line->id, 'qty' => 50]],
        ])->assertRedirect();

        $this->line->refresh();
        $this->assertEquals(50.0, (float) $this->line->qty_packed);
        $this->assertEquals('partially_packed', $this->line->status);
        $this->assertEquals(1, Shipment::count());
        $shipment = Shipment::first();
        $this->assertEquals('packed', $shipment->status);
        $this->assertStringStartsWith('SHP-', $shipment->shipment_code);
    }

    public function test_rejects_shipment_qty_exceeding_open(): void
    {
        $this->post("/orders/{$this->order->id}/shipments", [
            'items' => [['order_item_id' => $this->line->id, 'qty' => 150]],
        ])->assertSessionHasErrors('items');

        $this->line->refresh();
        $this->assertEquals(0.0, (float) $this->line->qty_packed);
        $this->assertEquals(0, Shipment::count());
    }

    public function test_advances_to_dispatched_and_increments_qty_dispatched(): void
    {
        // Ship the entire line so a full status transition is visible
        $this->post("/orders/{$this->order->id}/shipments", [
            'items' => [['order_item_id' => $this->line->id, 'qty' => 100]],
        ]);

        $shipment = Shipment::first();
        $this->patch("/shipments/{$shipment->id}/advance/dispatched")->assertRedirect();

        $shipment->refresh();
        $this->assertEquals('dispatched', $shipment->status);
        $this->assertNotNull($shipment->dispatch_date);

        $this->line->refresh();
        $this->assertEquals(100.0, (float) $this->line->qty_dispatched);
        $this->assertEquals('dispatched', $this->line->status);
    }

    public function test_advances_to_delivered_and_increments_qty_delivered(): void
    {
        $this->post("/orders/{$this->order->id}/shipments", [
            'items' => [['order_item_id' => $this->line->id, 'qty' => 100]],
        ]);
        $shipment = Shipment::first();
        $this->patch("/shipments/{$shipment->id}/advance/dispatched");
        $this->patch("/shipments/{$shipment->id}/advance/delivered");

        $this->line->refresh();
        $this->assertEquals(100.0, (float) $this->line->qty_delivered);
        $this->assertEquals('delivered', $this->line->status);
    }

    public function test_partial_shipment_keeps_line_partially_packed(): void
    {
        // Half-ship the line, advance to delivered: line should NOT be 'delivered' yet
        $this->post("/orders/{$this->order->id}/shipments", [
            'items' => [['order_item_id' => $this->line->id, 'qty' => 50]],
        ]);
        $shipment = Shipment::first();
        $this->patch("/shipments/{$shipment->id}/advance/dispatched");
        $this->patch("/shipments/{$shipment->id}/advance/delivered");

        $this->line->refresh();
        $this->assertEquals(50.0, (float) $this->line->qty_delivered);
        $this->assertEquals('partially_packed', $this->line->status);
    }

    public function test_two_shipments_accumulate_packed_quantity(): void
    {
        $this->post("/orders/{$this->order->id}/shipments", [
            'items' => [['order_item_id' => $this->line->id, 'qty' => 50]],
        ]);
        $this->post("/orders/{$this->order->id}/shipments", [
            'items' => [['order_item_id' => $this->line->id, 'qty' => 50]],
        ]);

        $this->line->refresh();
        $this->assertEquals(100.0, (float) $this->line->qty_packed);
        $this->assertEquals('packed', $this->line->status); // fully packed
        $this->assertEquals(2, Shipment::count());
    }

    public function test_destroy_refunds_quantities(): void
    {
        $this->post("/orders/{$this->order->id}/shipments", [
            'items' => [['order_item_id' => $this->line->id, 'qty' => 50]],
        ]);
        $shipment = Shipment::first();
        $this->patch("/shipments/{$shipment->id}/advance/dispatched");

        $this->delete("/shipments/{$shipment->id}");

        $this->line->refresh();
        $this->assertEquals(0.0, (float) $this->line->qty_packed);
        $this->assertEquals(0.0, (float) $this->line->qty_dispatched);
        $this->assertEquals(0, Shipment::count());
    }
}
