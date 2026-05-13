<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ReturnCase;
use App\Models\Shipment;
use App\Models\Transporter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Exercise every Policy against every role for the create + update + delete
 * actions. Mirrors the RBAC matrix — these tests fail loudly if the policy
 * drifts from routes/web.php.
 */
class PolicyTest extends TestCase
{
    use RefreshDatabase;

    /** Build a user with the given role + a sample model of each entity. */
    private function actor(string $role): User
    {
        return User::factory()->create(['role' => $role]);
    }

    private function order(): Order
    {
        $c = Customer::create(['tally_id' => 'C', 'name' => 'X', 'status' => 'active']);

        return Order::create([
            'order_code' => 'ORD-P-'.uniqid(), 'customer_id' => $c->id, 'order_date' => '2026-05-12',
            'status' => 'new_order', 'priority' => 'normal', 'payment_status' => 'not_due', 'order_value' => 0,
        ]);
    }

    public function test_order_policy_matrix(): void
    {
        $order = $this->order();
        foreach (['owner', 'manager'] as $r) {
            $u = $this->actor($r);
            $this->assertTrue($u->can('create', Order::class));
            $this->assertTrue($u->can('update', $order));
            $this->assertTrue($u->can('delete', $order));
            $this->assertTrue($u->can('advanceStatus', $order));
        }
        // Warehouse can advance status but not create/update/delete the full row
        $w = $this->actor('warehouse');
        $this->assertFalse($w->can('create', Order::class));
        $this->assertFalse($w->can('update', $order));
        $this->assertTrue($w->can('advanceStatus', $order));

        $v = $this->actor('viewer');
        $this->assertTrue($v->can('view', $order));
        $this->assertFalse($v->can('create', Order::class));
        $this->assertFalse($v->can('advanceStatus', $order));
    }

    public function test_customer_policy_matrix(): void
    {
        $customer = Customer::create(['tally_id' => 'C2', 'name' => 'C2', 'status' => 'active']);
        foreach (['owner', 'manager', 'accounts'] as $r) {
            $u = $this->actor($r);
            $this->assertTrue($u->can('create', Customer::class), "{$r} should be able to create customer");
            $this->assertTrue($u->can('update', $customer));
        }
        foreach (['warehouse', 'viewer'] as $r) {
            $u = $this->actor($r);
            $this->assertFalse($u->can('create', Customer::class));
            $this->assertFalse($u->can('update', $customer));
            $this->assertTrue($u->can('view', $customer));
        }
    }

    public function test_product_and_transporter_policies_are_owner_manager_only(): void
    {
        $p = Product::create(['tally_id' => 'P', 'name' => 'P', 'unit' => 'pcs', 'status' => 'active']);
        $t = Transporter::create(['transporter_code' => 'T', 'name' => 'T', 'status' => 'active']);

        foreach (['owner', 'manager'] as $r) {
            $u = $this->actor($r);
            $this->assertTrue($u->can('update', $p));
            $this->assertTrue($u->can('update', $t));
        }
        foreach (['accounts', 'warehouse', 'viewer'] as $r) {
            $u = $this->actor($r);
            $this->assertFalse($u->can('update', $p));
            $this->assertFalse($u->can('update', $t));
        }
    }

    public function test_shipment_policy_includes_warehouse(): void
    {
        $order = $this->order();
        $s = Shipment::create([
            'shipment_code' => 'SHP-P-'.uniqid(), 'order_id' => $order->id, 'status' => 'planning', 'created_by' => null,
        ]);
        foreach (['owner', 'manager', 'warehouse'] as $r) {
            $u = $this->actor($r);
            $this->assertTrue($u->can('update', $s));
        }
        foreach (['accounts', 'viewer'] as $r) {
            $u = $this->actor($r);
            $this->assertFalse($u->can('update', $s));
        }
    }

    public function test_payment_policy_is_accounts_inclusive(): void
    {
        $order = $this->order();
        $p = Payment::create([
            'order_id' => $order->id, 'paid_on' => '2026-05-12', 'amount' => 100, 'mode' => 'upi',
        ]);
        foreach (['owner', 'manager', 'accounts'] as $r) {
            $u = $this->actor($r);
            $this->assertTrue($u->can('create', Payment::class));
            $this->assertTrue($u->can('delete', $p));
        }
        foreach (['warehouse', 'viewer'] as $r) {
            $u = $this->actor($r);
            $this->assertFalse($u->can('create', Payment::class));
            $this->assertFalse($u->can('delete', $p));
        }
    }

    public function test_return_case_policy_excludes_only_viewer(): void
    {
        $order = $this->order();
        $rc = ReturnCase::create([
            'case_code' => 'RET-P-'.uniqid(),
            'related_order_id' => $order->id,
            'customer_id' => $order->customer_id,
            'date_reported' => '2026-05-12',
            'case_status' => 'reported',
        ]);
        foreach (['owner', 'manager', 'accounts', 'warehouse'] as $r) {
            $u = $this->actor($r);
            $this->assertTrue($u->can('create', ReturnCase::class), "{$r} should be able to create returns");
            $this->assertTrue($u->can('update', $rc));
        }
        $v = $this->actor('viewer');
        $this->assertFalse($v->can('create', ReturnCase::class));
        $this->assertFalse($v->can('update', $rc));
    }

    public function test_user_policy_is_owner_only_with_self_delete_blocked(): void
    {
        $owner = $this->actor('owner');
        $other = User::factory()->create(['role' => 'manager']);

        $this->assertTrue($owner->can('create', User::class));
        $this->assertTrue($owner->can('update', $other));
        $this->assertTrue($owner->can('delete', $other));
        // Self-delete blocked at policy level
        $this->assertFalse($owner->can('delete', $owner));

        foreach (['manager', 'accounts', 'warehouse', 'viewer'] as $r) {
            $u = $this->actor($r);
            $this->assertFalse($u->can('viewAny', User::class), "{$r} should not see user list");
            $this->assertFalse($u->can('create', User::class));
            $this->assertFalse($u->can('update', $other));
        }
    }
}
