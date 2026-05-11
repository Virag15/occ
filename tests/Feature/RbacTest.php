<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RbacTest extends TestCase
{
    use RefreshDatabase;

    public function test_blocks_warehouse_from_users_and_audit(): void
    {
        $warehouse = User::factory()->create(['role' => 'warehouse']);
        $this->actingAs($warehouse);

        $this->get('/users')->assertForbidden();
        $this->get('/audit-logs')->assertForbidden();
    }

    public function test_blocks_accounts_from_users(): void
    {
        $accounts = User::factory()->create(['role' => 'accounts']);
        $this->actingAs($accounts);

        $this->get('/users')->assertForbidden();
    }

    public function test_allows_owner_full_access(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $this->actingAs($owner);

        $this->get('/users')->assertOk();
        $this->get('/audit-logs')->assertOk();
    }

    public function test_allows_manager_full_access(): void
    {
        $manager = User::factory()->create(['role' => 'manager']);
        $this->actingAs($manager);

        $this->get('/users')->assertOk();
        $this->get('/audit-logs')->assertOk();
    }

    public function test_prevents_self_deletion(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $this->actingAs($owner);

        $this->delete("/users/{$owner->id}")->assertSessionHasErrors('user');
        $this->assertNotNull(User::find($owner->id));
    }
}
