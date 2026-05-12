<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\Transporter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SoftDeleteTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::factory()->create(['role' => 'owner']));
    }

    public function test_order_destroy_soft_deletes_and_can_be_restored(): void
    {
        $customer = Customer::create(['tally_id' => 'C', 'name' => 'Acme', 'status' => 'active']);
        $order = Order::create([
            'order_code' => 'ORD-SD-1', 'customer_id' => $customer->id, 'order_date' => '2026-05-12',
            'status' => 'new_order', 'priority' => 'normal', 'payment_status' => 'not_due', 'order_value' => 0,
        ]);

        $this->delete(route('orders.destroy', $order))->assertRedirect();

        // Default scope hides it; withTrashed still finds it
        $this->assertNull(Order::find($order->id));
        $this->assertNotNull(Order::withTrashed()->find($order->id));
        $this->assertNotNull(Order::withTrashed()->find($order->id)->deleted_at);
    }

    public function test_customer_product_transporter_soft_delete(): void
    {
        $c = Customer::create(['tally_id' => 'C1', 'name' => 'C1', 'status' => 'active']);
        $p = Product::create(['tally_id' => 'P1', 'name' => 'P1', 'unit' => 'pcs', 'status' => 'active']);
        $t = Transporter::create(['transporter_code' => 'T1', 'name' => 'T1', 'status' => 'active']);

        $c->delete();
        $p->delete();
        $t->delete();

        $this->assertNull(Customer::find($c->id));
        $this->assertNull(Product::find($p->id));
        $this->assertNull(Transporter::find($t->id));
        $this->assertNotNull(Customer::withTrashed()->find($c->id)->deleted_at);
        $this->assertNotNull(Product::withTrashed()->find($p->id)->deleted_at);
        $this->assertNotNull(Transporter::withTrashed()->find($t->id)->deleted_at);
    }
}
