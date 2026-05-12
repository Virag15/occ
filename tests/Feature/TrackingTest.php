<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TrackingTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_order_gets_a_tracking_uuid_automatically(): void
    {
        $c = Customer::create(['tally_id' => 'C', 'name' => 'X', 'status' => 'active']);
        $order = Order::create([
            'order_code' => 'ORD-TR-1', 'customer_id' => $c->id, 'order_date' => '2026-05-12',
            'status' => 'new_order', 'priority' => 'normal', 'payment_status' => 'not_due', 'order_value' => 0,
        ]);

        $this->assertNotNull($order->tracking_uuid);
        $this->assertMatchesRegularExpression('/^[0-9a-f-]{36}$/', $order->tracking_uuid);
    }

    public function test_public_tracking_route_serves_without_auth(): void
    {
        $c = Customer::create(['tally_id' => 'C', 'name' => 'X', 'status' => 'active']);
        $order = Order::create([
            'order_code' => 'ORD-TR-2', 'customer_id' => $c->id, 'order_date' => '2026-05-12',
            'status' => 'confirmed', 'priority' => 'normal', 'payment_status' => 'not_due', 'order_value' => 1000,
        ]);

        // No actingAs — this should work for the general public.
        $this->get(route('tracking.show', ['uuid' => $order->tracking_uuid]))->assertOk();
    }

    public function test_invalid_uuid_returns_404(): void
    {
        $this->get('/track/00000000-0000-0000-0000-000000000000')->assertNotFound();
    }

    public function test_route_pattern_rejects_non_uuid(): void
    {
        // The route regex blocks anything that isn't UUID-shaped, so this is a routing-level 404.
        $this->get('/track/abc')->assertNotFound();
    }
}
