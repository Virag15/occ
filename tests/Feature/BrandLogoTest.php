<?php

namespace Tests\Feature;

use App\Models\BrandLogo;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Brand-logo management. Tenant-scoped, owner/manager only, image-
 * validated, stored under the tenant prefix.
 */
class BrandLogoTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = Tenant::create(['name' => 'Brand Co.', 'slug' => 'brand-co']);
        app(TenantContext::class)->set($this->tenant);
        $this->owner = User::factory()->create(['role' => 'owner', 'tenant_id' => $this->tenant->id]);
        Storage::fake('public');
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    public function test_branding_page_renders(): void
    {
        $this->actingAs($this->owner)
            ->get('/settings/branding')
            ->assertOk()
            ->assertInertia(fn ($p) => $p->component('Settings/Branding')->has('brands'));
    }

    public function test_can_upload_a_brand_logo(): void
    {
        $this->actingAs($this->owner)
            ->post('/settings/branding', [
                'name' => 'Schneider Electric',
                'logo' => UploadedFile::fake()->image('schneider.png', 300, 120),
                'sort_order' => 1,
            ])
            ->assertRedirect();

        $brand = BrandLogo::first();
        $this->assertNotNull($brand);
        $this->assertSame('Schneider Electric', $brand->name);
        $this->assertSame($this->tenant->id, $brand->tenant_id);
        $this->assertStringStartsWith(
            "tenants/{$this->tenant->uuid}/brand-logos",
            $brand->logo_path
        );
        Storage::disk('public')->assertExists($brand->logo_path);
    }

    public function test_logo_is_required_and_must_be_an_image(): void
    {
        $this->actingAs($this->owner)
            ->post('/settings/branding', ['name' => 'NoLogo'])
            ->assertSessionHasErrors('logo');

        $this->actingAs($this->owner)
            ->post('/settings/branding', [
                'name' => 'BadFile',
                'logo' => UploadedFile::fake()->create('virus.pdf', 10, 'application/pdf'),
            ])
            ->assertSessionHasErrors('logo');

        $this->assertSame(0, BrandLogo::count());
    }

    public function test_name_is_required_and_capped(): void
    {
        $this->actingAs($this->owner)
            ->post('/settings/branding', [
                'name' => str_repeat('X', 81),
                'logo' => UploadedFile::fake()->image('x.png'),
            ])
            ->assertSessionHasErrors('name');
    }

    public function test_can_delete_a_brand_logo_and_its_file(): void
    {
        $this->actingAs($this->owner)->post('/settings/branding', [
            'name' => 'Legrand',
            'logo' => UploadedFile::fake()->image('legrand.png'),
        ]);
        $brand = BrandLogo::first();
        $path = $brand->logo_path;
        Storage::disk('public')->assertExists($path);

        $this->actingAs($this->owner)
            ->delete("/settings/branding/{$brand->id}")
            ->assertRedirect();

        $this->assertSame(0, BrandLogo::count());
        Storage::disk('public')->assertMissing($path);
    }

    public function test_brand_logos_are_tenant_isolated(): void
    {
        // Tenant A's brand
        $this->actingAs($this->owner)->post('/settings/branding', [
            'name' => 'A-Brand',
            'logo' => UploadedFile::fake()->image('a.png'),
        ]);
        $aBrand = BrandLogo::first();

        // Tenant B + its owner
        $tenantB = Tenant::create(['name' => 'Other Co.', 'slug' => 'other-co']);
        $ownerB = User::factory()->create(['role' => 'owner', 'tenant_id' => $tenantB->id]);

        // B cannot see A's brand on the index
        app(TenantContext::class)->set($tenantB);
        $this->actingAs($ownerB)
            ->get('/settings/branding')
            ->assertInertia(fn ($p) => $p->has('brands', 0));

        // B cannot delete A's brand (route-model binding 404s cross-tenant)
        $this->actingAs($ownerB)
            ->delete("/settings/branding/{$aBrand->id}")
            ->assertNotFound();

        // A's brand still intact
        app(TenantContext::class)->set($this->tenant);
        $this->assertSame(1, BrandLogo::count());
    }

    public function test_non_admin_roles_cannot_manage_branding(): void
    {
        $warehouse = User::factory()->create(['role' => 'warehouse', 'tenant_id' => $this->tenant->id]);

        $this->actingAs($warehouse)
            ->get('/settings/branding')
            ->assertForbidden();

        $this->actingAs($warehouse)
            ->post('/settings/branding', [
                'name' => 'Sneaky',
                'logo' => UploadedFile::fake()->image('x.png'),
            ])
            ->assertForbidden();
    }

    public function test_data_uri_returns_base64_for_pdf_embedding(): void
    {
        $this->actingAs($this->owner)->post('/settings/branding', [
            'name' => 'DataUri Brand',
            'logo' => UploadedFile::fake()->image('d.png'),
        ]);
        $brand = BrandLogo::first();

        $uri = $brand->dataUri();
        $this->assertNotNull($uri);
        $this->assertStringStartsWith('data:image/', $uri);
        $this->assertStringContainsString(';base64,', $uri);
    }
}
