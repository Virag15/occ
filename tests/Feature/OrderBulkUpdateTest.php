<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Order;
use App\Models\Shipment;
use App\Models\Transporter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderBulkUpdateTest extends TestCase
{
    use RefreshDatabase;

    private Customer $customer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->customer = Customer::create(['tally_id' => 'C', 'name' => 'X', 'status' => 'active']);
    }

    private function makeOrder(string $code, string $priority = 'normal'): Order
    {
        return Order::create([
            'order_code' => $code, 'customer_id' => $this->customer->id, 'order_date' => '2026-05-12',
            'status' => 'new_order', 'priority' => $priority, 'payment_status' => 'pending', 'order_value' => 0,
        ]);
    }

    public function test_owner_can_bulk_set_priority(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'owner']));
        $a = $this->makeOrder('ORD-BU-A');
        $b = $this->makeOrder('ORD-BU-B');

        $this->patch(route('orders.bulk-update'), [
            'order_ids' => [$a->id, $b->id],
            'priority' => 'urgent',
        ])->assertRedirect();

        $this->assertSame('urgent', $a->fresh()->priority);
        $this->assertSame('urgent', $b->fresh()->priority);
    }

    public function test_warehouse_cannot_bulk_update(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'warehouse']));
        $a = $this->makeOrder('ORD-BU-C');

        $this->patch(route('orders.bulk-update'), [
            'order_ids' => [$a->id],
            'priority' => 'urgent',
        ])->assertForbidden();

        $this->assertSame('normal', $a->fresh()->priority);
    }

    public function test_empty_payload_returns_validation_error(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'manager']));
        $a = $this->makeOrder('ORD-BU-D');

        $this->patch(route('orders.bulk-update'), [
            'order_ids' => [$a->id],
        ])->assertSessionHasErrors('priority');
    }

    public function test_order_ids_array_is_capped(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'manager']));

        $this->patch(route('orders.bulk-update'), [
            'order_ids' => range(1, 501),
            'priority' => 'urgent',
        ])->assertSessionHasErrors('order_ids');
    }

    public function test_bulk_assigns_transporter_to_latest_shipment(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'manager']));
        $a = $this->makeOrder('ORD-BU-E');
        $shipment = Shipment::create([
            'shipment_code' => 'SHP-BU-1', 'order_id' => $a->id, 'status' => 'planning', 'created_by' => null,
        ]);
        $b = $this->makeOrder('ORD-BU-F'); // no shipment — should be skipped

        $t = Transporter::create(['transporter_code' => 'T-BU', 'name' => 'TestLogistics', 'status' => 'active']);

        $this->patch(route('orders.bulk-update'), [
            'order_ids' => [$a->id, $b->id],
            'transporter_id' => $t->id,
        ])->assertRedirect();

        $this->assertSame($t->id, $shipment->fresh()->transporter_id);
        // b had no shipment so no shipment was created
        $this->assertSame(0, $b->fresh()->shipments()->count());
    }
}
