<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Order;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Tenant-scoped storage paths. Uploads land under the tenant's prefix
 * (tenants/{uuid}/...) and the download guard accepts both the new
 * tenant-prefixed paths and legacy non-prefixed paths (for evidence
 * uploaded before P1.4c shipped).
 */
class TenantStoragePathTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    private User $owner;

    private Order $order;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = Tenant::create(['name' => 'Storage Co.', 'slug' => 'storage']);
        app(TenantContext::class)->set($this->tenant);

        $this->owner = User::factory()->create([
            'role' => 'owner', 'tenant_id' => $this->tenant->id,
        ]);
        $c = Customer::create(['tally_id' => 'C', 'name' => 'X', 'status' => 'active']);
        $this->order = Order::create([
            'order_code' => 'ORD-STO-1', 'customer_id' => $c->id, 'order_date' => '2026-05-12',
            'status' => 'dispatched', 'priority' => 'normal', 'payment_status' => 'not_due', 'order_value' => 0,
        ]);
        Storage::fake('local');
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    public function test_evidence_upload_lands_under_tenant_prefix(): void
    {
        $file = UploadedFile::fake()->image('pod.jpg');

        $this->actingAs($this->owner)
            ->post(route('orders.upload-evidence', ['order' => $this->order->id, 'kind' => 'pod']), [
                'photo' => $file,
            ])->assertRedirect();

        $tenantFiles = Storage::disk('local')->files(
            $this->tenant->storagePrefix()."/orders/{$this->order->id}/pod"
        );
        $this->assertNotEmpty($tenantFiles, 'file must be inside tenants/{uuid}/');

        // The legacy path should be empty
        $legacyFiles = Storage::disk('local')->files("orders/{$this->order->id}/pod");
        $this->assertEmpty($legacyFiles, 'no files should land in the legacy non-tenant path');
    }

    public function test_download_guard_accepts_legacy_non_tenant_paths(): void
    {
        $legacy = "orders/{$this->order->id}/pod/legacy.jpg";
        Storage::disk('local')->put($legacy, 'fake-bytes');

        $this->actingAs($this->owner)
            ->get("/orders/{$this->order->id}/evidence/download?path={$legacy}")
            ->assertOk();
    }

    public function test_download_guard_accepts_new_tenant_prefixed_paths(): void
    {
        $tenantPath = $this->tenant->storagePrefix()."/orders/{$this->order->id}/pod/new.jpg";
        Storage::disk('local')->put($tenantPath, 'fake-bytes');

        $this->actingAs($this->owner)
            ->get("/orders/{$this->order->id}/evidence/download?path={$tenantPath}")
            ->assertOk();
    }

    public function test_download_guard_rejects_other_tenants_prefix(): void
    {
        // Another tenant's file at THEIR prefix
        $other = Tenant::create(['name' => 'Other Co.', 'slug' => 'other']);
        $otherPath = $other->storagePrefix()."/orders/{$this->order->id}/pod/spy.jpg";
        Storage::disk('local')->put($otherPath, 'fake-bytes');

        // Active tenant tries to download from the OTHER tenant's prefix
        $this->actingAs($this->owner)
            ->get("/orders/{$this->order->id}/evidence/download?path={$otherPath}")
            ->assertNotFound();
    }

    public function test_storage_path_throws_without_active_tenant(): void
    {
        app(TenantContext::class)->clear();
        $this->expectException(\RuntimeException::class);
        app(TenantContext::class)->storagePath('orders/1/pod');
    }

    public function test_storage_path_includes_tenant_uuid(): void
    {
        $path = app(TenantContext::class)->storagePath('orders/42/pod');
        $this->assertSame("tenants/{$this->tenant->uuid}/orders/42/pod", $path);
    }
}
