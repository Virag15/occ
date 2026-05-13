<?php

namespace Tests\Feature;

use App\Models\Tenant;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tenant model basics — the cornerstone of multi-tenancy. Covers UUID
 * auto-generation, status flags, storage-prefix helper, and soft-delete.
 * Cross-tenant isolation tests live in TenantIsolationTest (P1.5).
 */
class TenantModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_tenant_creating_event_assigns_uuid(): void
    {
        $tenant = Tenant::create(['name' => 'Acme MSME']);

        $this->assertNotEmpty($tenant->uuid);
        $this->assertMatchesRegularExpression(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/',
            $tenant->uuid
        );
    }

    public function test_tenant_can_be_created_with_explicit_uuid(): void
    {
        $tenant = Tenant::create([
            'uuid' => '11111111-2222-3333-4444-555555555555',
            'name' => 'Pinned UUID Tenant',
        ]);

        $this->assertSame('11111111-2222-3333-4444-555555555555', $tenant->uuid);
    }

    public function test_uuid_is_unique(): void
    {
        Tenant::create([
            'uuid' => '11111111-2222-3333-4444-555555555555',
            'name' => 'First',
        ]);

        $this->expectException(UniqueConstraintViolationException::class);
        Tenant::create([
            'uuid' => '11111111-2222-3333-4444-555555555555',
            'name' => 'Duplicate',
        ]);
    }

    public function test_default_status_is_active(): void
    {
        $tenant = Tenant::create(['name' => 'Default Status']);
        $this->assertSame(Tenant::STATUS_ACTIVE, $tenant->status);
        $this->assertTrue($tenant->isActive());
    }

    public function test_suspended_tenant_is_not_active(): void
    {
        $tenant = Tenant::create([
            'name' => 'Suspended',
            'status' => Tenant::STATUS_SUSPENDED,
        ]);

        $this->assertFalse($tenant->isActive());
    }

    public function test_storage_prefix_uses_uuid(): void
    {
        $tenant = Tenant::create([
            'uuid' => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
            'name' => 'Storage Test',
        ]);

        $this->assertSame('tenants/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', $tenant->storagePrefix());
    }

    public function test_soft_delete_keeps_row_recoverable(): void
    {
        $tenant = Tenant::create(['name' => 'Soft Delete Test']);
        $id = $tenant->id;

        $tenant->delete();

        $this->assertSoftDeleted('tenants', ['id' => $id]);
        $this->assertNotNull(Tenant::withTrashed()->find($id));
        $this->assertNull(Tenant::find($id), 'default query should hide soft-deleted tenants');
    }

    public function test_slug_is_optional_but_unique_when_set(): void
    {
        Tenant::create(['name' => 'Slug A', 'slug' => 'tenant-a']);

        $this->expectException(UniqueConstraintViolationException::class);
        Tenant::create(['name' => 'Slug B', 'slug' => 'tenant-a']);
    }
}
