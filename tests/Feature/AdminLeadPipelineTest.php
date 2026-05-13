<?php

namespace Tests\Feature;

use App\Models\Lead;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Platform-admin sales pipeline at /admin/leads. Only users with
 * is_platform_admin=true can access. Tenant owners (role='owner') do
 * NOT inherit access — that's a different permission axis.
 */
class AdminLeadPipelineTest extends TestCase
{
    use RefreshDatabase;

    private User $platformAdmin;

    private User $tenantOwner;

    protected function setUp(): void
    {
        parent::setUp();
        $this->platformAdmin = User::factory()->create([
            'is_platform_admin' => true,
            'role' => 'owner',
        ]);
        $this->tenantOwner = User::factory()->create([
            'is_platform_admin' => false,
            'role' => 'owner',
        ]);
    }

    // ─── Access control ───────────────────────────────────────────────

    public function test_unauthenticated_cannot_reach_admin_leads(): void
    {
        $this->get('/admin/leads')->assertRedirect('/login');
    }

    public function test_tenant_owner_is_forbidden_from_admin_leads(): void
    {
        // A tenant owner with role=owner but no platform_admin flag
        // must NOT be able to see other tenants' leads.
        $this->actingAs($this->tenantOwner)
            ->get('/admin/leads')
            ->assertForbidden();
    }

    public function test_platform_admin_can_access_admin_leads(): void
    {
        $this->actingAs($this->platformAdmin)
            ->get('/admin/leads')
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p->component('Admin/Leads/Index'));
    }

    public function test_update_route_is_also_platform_admin_gated(): void
    {
        $lead = Lead::create([
            'name' => 'A', 'business_name' => 'B', 'phone' => '+91 0',
        ]);

        $this->actingAs($this->tenantOwner)
            ->patch("/admin/leads/{$lead->id}", ['status' => 'contacted'])
            ->assertForbidden();
    }

    // ─── Index payload shape ─────────────────────────────────────────

    public function test_index_groups_leads_by_status(): void
    {
        Lead::create(['name' => 'A1', 'business_name' => 'Acme', 'phone' => '+91 1', 'status' => 'new']);
        Lead::create(['name' => 'A2', 'business_name' => 'Beta', 'phone' => '+91 2', 'status' => 'contacted']);
        Lead::create(['name' => 'A3', 'business_name' => 'Gamma', 'phone' => '+91 3', 'status' => 'contacted']);
        Lead::create(['name' => 'A4', 'business_name' => 'Delta', 'phone' => '+91 4', 'status' => 'paid']);

        $this->actingAs($this->platformAdmin)
            ->get('/admin/leads')
            ->assertInertia(fn (Assert $p) => $p
                ->component('Admin/Leads/Index')
                ->has('leads_by_status.new', 1)
                ->has('leads_by_status.contacted', 2)
                ->has('leads_by_status.paid', 1)
                ->has('counts')
                ->where('counts.contacted', 2)
                ->has('statuses')
            );
    }

    public function test_index_exposes_platform_users_for_assignment_dropdown(): void
    {
        $this->actingAs($this->platformAdmin)
            ->get('/admin/leads')
            ->assertInertia(fn (Assert $p) => $p
                ->has('platform_users', 1)  // only the platform admin from setUp
                ->where('platform_users.0.email', $this->platformAdmin->email)
            );
    }

    public function test_index_supports_status_filter(): void
    {
        Lead::create(['name' => 'A1', 'business_name' => 'Acme', 'phone' => '+91 1', 'status' => 'new']);
        Lead::create(['name' => 'A2', 'business_name' => 'Beta', 'phone' => '+91 2', 'status' => 'contacted']);

        $this->actingAs($this->platformAdmin)
            ->get('/admin/leads?status=contacted')
            ->assertInertia(fn (Assert $p) => $p
                ->where('filters.status', 'contacted')
                ->has('leads_by_status.contacted', 1)
                ->has('leads_by_status.new', 0)
            );
    }

    public function test_index_supports_search_query(): void
    {
        Lead::create(['name' => 'Alice', 'business_name' => 'Acme', 'phone' => '+91 1']);
        Lead::create(['name' => 'Bob', 'business_name' => 'Beta', 'phone' => '+91 2']);

        $this->actingAs($this->platformAdmin)
            ->get('/admin/leads?q=Acme')
            ->assertInertia(fn (Assert $p) => $p
                ->where('filters.q', 'Acme')
                ->has('leads_by_status.new', 1)
            );
    }

    // ─── Update flow ─────────────────────────────────────────────────

    public function test_status_can_be_changed_via_update(): void
    {
        $lead = Lead::create(['name' => 'A', 'business_name' => 'B', 'phone' => '+91 0']);

        $this->actingAs($this->platformAdmin)
            ->patch("/admin/leads/{$lead->id}", ['status' => 'contacted'])
            ->assertRedirect();

        $this->assertSame('contacted', $lead->fresh()->status);
    }

    public function test_lead_can_be_assigned_to_another_platform_admin(): void
    {
        $other = User::factory()->create(['is_platform_admin' => true]);
        $lead = Lead::create(['name' => 'A', 'business_name' => 'B', 'phone' => '+91 0']);

        $this->actingAs($this->platformAdmin)
            ->patch("/admin/leads/{$lead->id}", ['assigned_to' => $other->id])
            ->assertRedirect();

        $this->assertSame($other->id, $lead->fresh()->assigned_to);
    }

    public function test_cannot_assign_lead_to_non_platform_admin(): void
    {
        $lead = Lead::create(['name' => 'A', 'business_name' => 'B', 'phone' => '+91 0']);

        $this->actingAs($this->platformAdmin)
            ->patch("/admin/leads/{$lead->id}", ['assigned_to' => $this->tenantOwner->id])
            ->assertStatus(422);

        $this->assertNull($lead->fresh()->assigned_to);
    }

    public function test_invalid_status_rejected(): void
    {
        $lead = Lead::create(['name' => 'A', 'business_name' => 'B', 'phone' => '+91 0']);

        $this->actingAs($this->platformAdmin)
            ->patch("/admin/leads/{$lead->id}", ['status' => 'not-a-real-status'])
            ->assertSessionHasErrors('status');
    }

    public function test_notes_can_be_appended(): void
    {
        $lead = Lead::create(['name' => 'A', 'business_name' => 'B', 'phone' => '+91 0']);

        $this->actingAs($this->platformAdmin)
            ->patch("/admin/leads/{$lead->id}", ['notes' => 'Called, left voicemail at 14:30.'])
            ->assertRedirect();

        $this->assertStringContainsString('voicemail', $lead->fresh()->notes);
    }

    // ─── Provision flow ─────────────────────────────────────────────

    public function test_provisioning_creates_a_tenant_and_links_the_lead(): void
    {
        $lead = Lead::create([
            'name' => 'Buyer', 'business_name' => 'Acme Pvt Ltd', 'phone' => '+91 99',
            'status' => 'paid',
        ]);

        $this->actingAs($this->platformAdmin)
            ->post("/admin/leads/{$lead->id}/provision")
            ->assertRedirect();

        $lead->refresh();
        $this->assertSame('provisioned', $lead->status);
        $this->assertNotNull($lead->converted_tenant_id);

        $tenant = Tenant::find($lead->converted_tenant_id);
        $this->assertSame('Acme Pvt Ltd', $tenant->name);
        $this->assertSame('active', $tenant->status);
    }

    public function test_cannot_provision_an_already_provisioned_lead(): void
    {
        $tenant = Tenant::create(['name' => 'Existing']);
        $lead = Lead::create([
            'name' => 'A', 'business_name' => 'B', 'phone' => '+91 0',
            'status' => 'provisioned',
            'converted_tenant_id' => $tenant->id,
        ]);

        $this->actingAs($this->platformAdmin)
            ->post("/admin/leads/{$lead->id}/provision")
            ->assertSessionHasErrors('lead');

        // No new tenant created
        $this->assertSame(1, Tenant::count());
    }
}
