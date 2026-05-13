<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Smoke tests for the public marketing site. Each page renders for
 * unauthed visitors, contains its title/copy, and exposes the WhatsApp
 * CTA. Authed users hitting `/` get the dashboard, not the marketing
 * home (delegated to DashboardController).
 *
 * Contact form is a stub for now — P2.2 wires real persistence.
 */
class MarketingPagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauth_root_renders_marketing_home(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertSee('Operations for')
            ->assertSee('Tally', false)
            ->assertSee('Talk to us', false);
    }

    public function test_authed_user_at_root_gets_dashboard_not_marketing(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $response = $this->actingAs($owner)->get('/');
        $response->assertOk();
        // Owners land on the actual dashboard Inertia page, not the Blade
        // marketing home (which has no <html class="scroll-smooth"> attr).
        $response->assertDontSee('Operations for businesses that run on');
    }

    public function test_authed_warehouse_role_still_redirects_to_queue_from_root(): void
    {
        // Re-asserts RoleLandingTest invariant — multi-tenant + marketing
        // refactor must not break this.
        $u = User::factory()->create(['role' => 'warehouse']);
        $this->actingAs($u)->get('/')->assertRedirect('/warehouse');
    }

    public function test_features_page_renders(): void
    {
        $this->get('/features')
            ->assertOk()
            ->assertSee('Order management')
            ->assertSee('Tally bridge', false)
            ->assertSee('Dispatch', false)
            ->assertSee('delivery', false);
    }

    public function test_tally_page_renders(): void
    {
        $this->get('/tally')
            ->assertOk()
            ->assertSee('cockpit')
            ->assertSee('Setup', false)
            ->assertSee('FAQ', false);
    }

    public function test_pricing_page_renders(): void
    {
        $this->get('/pricing')
            ->assertOk()
            ->assertSee('Custom quote')
            ->assertSee('Bank transfer', false);
    }

    public function test_about_page_renders(): void
    {
        $this->get('/about')
            ->assertOk()
            ->assertSee('story')
            ->assertSee('Virag Bora')
            ->assertSee('GC Communication');
    }

    public function test_contact_page_renders_with_form(): void
    {
        $this->get('/contact')
            ->assertOk()
            ->assertSee("Let's talk", false)
            ->assertSee('WhatsApp')
            ->assertSee('Send message')
            ->assertSee('name="business_name"', false)
            ->assertSee('name="_token"', false);  // CSRF
    }

    public function test_whatsapp_link_present_in_layout(): void
    {
        $this->get('/')->assertSee('wa.me/', false);
    }

    public function test_contact_form_stub_accepts_valid_submission(): void
    {
        $this->post('/contact', [
            'name' => 'Test Buyer',
            'business_name' => 'Acme Trading Co.',
            'phone' => '+919876543210',
            'email' => 'buyer@example.com',
            'current_software' => 'tally',
            'orders_per_month' => '50_200',
            'notes' => 'Need a demo for the dispatch workflow.',
        ])->assertRedirect();
    }

    public function test_contact_form_rejects_missing_required_fields(): void
    {
        $this->post('/contact', [])
            ->assertSessionHasErrors(['name', 'business_name', 'phone']);
    }

    public function test_honeypot_silently_drops_bot_submissions(): void
    {
        // Bot fills the hidden company_website field; humans don't see it.
        // We return a fake "thanks" so the bot doesn't retry.
        $this->post('/contact', [
            'name' => 'Bot',
            'business_name' => 'Bot Co',
            'phone' => '+91 0',
            'company_website' => 'spam.example',
        ])->assertRedirect();
        // No validation errors fired; nothing persisted (P2.2 will assert
        // leads count, but for the stub we just confirm the response).
    }

    public function test_marketing_routes_do_not_require_auth(): void
    {
        foreach (['/features', '/tally', '/pricing', '/about', '/contact'] as $url) {
            $this->get($url)->assertOk();
        }
    }

    public function test_navigation_links_appear_in_header_and_footer(): void
    {
        $response = $this->get('/features');
        $response->assertSee('href="'.url('/').'"', false);
        $response->assertSee('href="'.url('/tally').'"', false);
        $response->assertSee('href="'.url('/pricing').'"', false);
        $response->assertSee('href="'.url('/about').'"', false);
        $response->assertSee('href="'.url('/contact').'"', false);
    }
}
