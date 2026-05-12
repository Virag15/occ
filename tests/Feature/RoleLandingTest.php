<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleLandingTest extends TestCase
{
    use RefreshDatabase;

    public function test_warehouse_role_redirects_from_root_to_queue(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'warehouse']));
        $this->get('/')->assertRedirect('/warehouse');
    }

    public function test_accounts_role_redirects_from_root_to_tasks(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'accounts']));
        $this->get('/')->assertRedirect('/tasks');
    }

    public function test_owner_lands_on_dashboard(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'owner']));
        $this->get('/')->assertOk();
    }

    public function test_manager_lands_on_dashboard(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'manager']));
        $this->get('/')->assertOk();
    }
}
