<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Order;
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
}
