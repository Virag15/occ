<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Regression guard for the silent-500 recursion bug.
 *
 * The User model uses BelongsToTenant → TenantScope. The session guard
 * resolves the authed user via User::find($id), which applies the scope.
 * If the scope calls Auth::user() (triggering resolution) instead of
 * Auth::hasUser() (already-resolved check), every real session-auth
 * request recurses into a stack blow-out: an empty HTTP 500 with no
 * catchable exception.
 *
 * These tests deliberately DO NOT use actingAs() — actingAs() pre-loads
 * the user object and never exercises the guard's DB resolution path,
 * which is exactly why the original test suite stayed green while the
 * live app was unusable. We log in through the real form so the next
 * request resolves the user from the session like a browser does.
 */
class SessionAuthResolutionTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(array $overrides = []): User
    {
        return User::factory()->create(array_merge([
            'email' => 'real@occ.in',
            'password' => Hash::make('secret-pass'),
            'role' => 'owner',
        ], $overrides));
    }

    private function login(string $email = 'real@occ.in', string $password = 'secret-pass'): void
    {
        $this->post('/login', ['email' => $email, 'password' => $password])
            ->assertRedirect(); // 302 to /dashboard
    }

    public function test_session_auth_resolves_without_recursion_for_tenant_user(): void
    {
        $tenant = Tenant::create(['name' => 'Recur Co.', 'slug' => 'recur']);
        $this->makeUser(['tenant_id' => $tenant->id]);

        $this->login();

        // The guard now resolves the user from the DB on this request.
        // Pre-fix this recursed → empty 500. Must be a clean 200.
        $this->get('/dashboard')->assertOk();
        $this->get('/quotations')->assertOk();
        $this->get('/customers')->assertOk();
    }

    public function test_session_auth_resolves_for_user_with_null_tenant(): void
    {
        // The seeded founder (virag) has tenant_id = NULL — the exact
        // account that surfaced the bug in the live app.
        $this->makeUser(['tenant_id' => null]);

        $this->login();

        $this->get('/dashboard')->assertOk();
        $this->get('/settings/branding')->assertOk();
    }

    public function test_user_lookup_is_not_tenant_scoped_during_auth(): void
    {
        // A user must be findable by id regardless of tenant — the tenant
        // is derived FROM the user, not a precondition to load it.
        $tenant = Tenant::create(['name' => 'T', 'slug' => 't']);
        $u = $this->makeUser(['tenant_id' => $tenant->id]);

        // With NO active tenant context and no resolved user, finding the
        // user by id must still work (no scope applied).
        app(TenantContext::class)->clear();
        $found = User::find($u->id);
        $this->assertNotNull($found);
        $this->assertSame($u->id, $found->id);
    }

    public function test_post_login_lands_on_dashboard_not_a_blank_page(): void
    {
        $tenant = Tenant::create(['name' => 'Land Co.', 'slug' => 'land']);
        $this->makeUser(['tenant_id' => $tenant->id]);

        $this->post('/login', ['email' => 'real@occ.in', 'password' => 'secret-pass'])
            ->assertRedirect('/dashboard');

        // Following the redirect must produce a real Inertia dashboard,
        // never the white-modal / empty body.
        $this->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn ($p) => $p->component('Dashboard'));
    }

    public function test_logout_then_protected_route_redirects_to_login(): void
    {
        $tenant = Tenant::create(['name' => 'Out Co.', 'slug' => 'out']);
        $this->makeUser(['tenant_id' => $tenant->id]);
        $this->login();
        $this->get('/dashboard')->assertOk();

        $this->post('/logout')->assertRedirect('/login');

        // Session cleared — guest hitting a protected route bounces to login,
        // and the guard resolution for "no user" must not recurse either.
        $this->get('/dashboard')->assertRedirect('/login');
    }
}
