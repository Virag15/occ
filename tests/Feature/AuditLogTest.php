<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuditLogTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();
        $this->owner = User::factory()->create(['role' => 'owner', 'password' => Hash::make('password')]);
        $this->actingAs($this->owner);
    }

    public function test_logs_customer_create_update_delete(): void
    {
        AuditLog::query()->delete(); // clear factory noise

        $c = Customer::create(['tally_id' => 'X1', 'name' => 'Acme', 'status' => 'active']);
        $created = AuditLog::query()->where('entity_type', 'customer')->where('action', 'created')->first();
        $this->assertNotNull($created);
        $this->assertEquals($c->id, $created->entity_id);
        $this->assertEquals($this->owner->id, $created->user_id);

        $c->update(['name' => 'Acme Renamed']);
        $updated = AuditLog::query()->where('entity_type', 'customer')->where('action', 'updated')->first();
        $this->assertNotNull($updated);
        $this->assertEquals(['from' => 'Acme', 'to' => 'Acme Renamed'], $updated->changes['name']);

        $cId = $c->id;
        $c->delete();
        $deleted = AuditLog::query()->where('entity_type', 'customer')->where('action', 'deleted')->where('entity_id', $cId)->first();
        $this->assertNotNull($deleted);
    }

    public function test_logs_status_change_not_generic_updated_on_order(): void
    {
        AuditLog::query()->delete();
        $c = Customer::create(['tally_id' => 'X2', 'name' => 'Cust', 'status' => 'active']);
        $o = Order::create([
            'order_code' => 'ORD-1', 'customer_id' => $c->id, 'order_date' => '2026-05-12',
            'status' => 'new_order', 'priority' => 'normal', 'payment_status' => 'not_due',
        ]);

        AuditLog::query()->delete(); // clear "created" rows
        $o->update(['status' => 'confirmed']);

        $log = AuditLog::query()->where('entity_type', 'order')->latest('id')->first();
        $this->assertEquals('status_changed', $log->action);
        $this->assertEquals(['from' => 'new_order', 'to' => 'confirmed'], $log->changes['status']);
    }

    public function test_logs_login_event(): void
    {
        AuditLog::query()->delete();
        auth()->logout(); // start fresh

        $u = User::factory()->create([
            'email' => 'login-test@example.com',
            'password' => Hash::make('correct-horse-battery'),
            'role' => 'owner',
        ]);
        AuditLog::query()->delete(); // clear factory-create row

        $this->post('/login', ['email' => 'login-test@example.com', 'password' => 'correct-horse-battery']);

        $log = AuditLog::query()->where('action', 'login')->where('entity_id', $u->id)->first();
        $this->assertNotNull($log);
    }

    public function test_logs_failed_login(): void
    {
        AuditLog::query()->delete();
        auth()->logout();

        $this->post('/login', ['email' => 'nobody@example.com', 'password' => 'wrong']);

        $log = AuditLog::query()->where('action', 'login_failed')->first();
        $this->assertNotNull($log);
        $this->assertEquals('nobody@example.com', $log->changes['email']['to']);
    }

    public function test_password_changes_are_not_logged_as_a_diff(): void
    {
        AuditLog::query()->delete();
        $this->owner->update(['password' => Hash::make('newpassword123')]);

        // No 'updated' log should appear because password is in SKIP_FIELDS
        $log = AuditLog::query()->where('entity_type', 'user')->where('entity_id', $this->owner->id)->where('action', 'updated')->first();
        $this->assertNull($log);
    }

    public function test_role_change_logs_with_role_changed_action(): void
    {
        AuditLog::query()->delete();
        $u = User::factory()->create(['role' => 'viewer']);
        AuditLog::query()->delete();

        $u->update(['role' => 'manager']);

        $log = AuditLog::query()->where('entity_type', 'user')->where('entity_id', $u->id)->latest('id')->first();
        $this->assertEquals('role_changed', $log->action);
        $this->assertEquals(['from' => 'viewer', 'to' => 'manager'], $log->changes['role']);
    }

    public function test_product_crud_logs(): void
    {
        AuditLog::query()->delete();
        $p = Product::create(['tally_id' => 'P1', 'name' => 'Widget', 'is_active' => true]);
        $this->assertEquals(1, AuditLog::query()->where('entity_type', 'product')->where('action', 'created')->count());

        $p->update(['name' => 'Widget Pro']);
        $this->assertEquals(1, AuditLog::query()->where('entity_type', 'product')->where('action', 'updated')->count());
    }
}
