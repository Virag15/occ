<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Post-multi-tenant routing: `/` is the guest marketing page and
 * redirects authed users to `/dashboard` (the Inertia app). The
 * role-based landing (warehouse → queue, accounts → tasks) lives
 * inside DashboardController and now fires from `/dashboard`.
 */
class RoleLandingTest extends TestCase
{
    use RefreshDatabase;

    public function test_root_redirects_authed_user_to_dashboard(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'owner']));
        $this->get('/')->assertRedirect('/dashboard');
    }

    public function test_warehouse_role_redirects_from_dashboard_to_queue(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'warehouse']));
        $this->get('/dashboard')->assertRedirect('/warehouse');
    }

    public function test_accounts_role_redirects_from_dashboard_to_tasks(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'accounts']));
        $this->get('/dashboard')->assertRedirect('/tasks');
    }

    public function test_owner_lands_on_dashboard(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'owner']));
        $this->get('/dashboard')->assertOk();
    }

    public function test_manager_lands_on_dashboard(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'manager']));
        $this->get('/dashboard')->assertOk();
    }

    public function test_guest_at_root_sees_marketing_not_a_redirect(): void
    {
        $this->get('/')->assertOk();
    }
}
