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

class EvidenceUploadTest extends TestCase
{
    use RefreshDatabase;

    private Order $order;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        // Set up tenant context BEFORE creating any tenant-owned data so the
        // BelongsToTenant trait stamps tenant_id correctly. Otherwise the
        // SetCurrentTenant middleware sets a tenant on the request and the
        // global scope can't find the unscoped test data.
        $this->tenant = Tenant::create(['name' => 'Evidence Co.', 'slug' => 'evidence']);
        app(TenantContext::class)->set($this->tenant);

        $owner = User::factory()->create(['role' => 'owner', 'tenant_id' => $this->tenant->id]);
        $this->actingAs($owner);

        $c = Customer::create(['tally_id' => 'C', 'name' => 'X', 'status' => 'active']);
        $this->order = Order::create([
            'order_code' => 'ORD-E-1', 'customer_id' => $c->id, 'order_date' => '2026-05-12',
            'status' => 'dispatched', 'priority' => 'normal', 'payment_status' => 'not_due', 'order_value' => 0,
        ]);

        // Evidence is now written to the private local disk (P0.8) — fake it so we can assert.
        Storage::fake('local');
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    public function test_pod_upload_sets_received_and_writes_file(): void
    {
        $file = UploadedFile::fake()->image('pod.jpg');

        $this->post(route('orders.upload-evidence', ['order' => $this->order->id, 'kind' => 'pod']), [
            'photo' => $file,
        ])->assertRedirect();

        $this->order->refresh();
        $this->assertTrue($this->order->pod_received);
        // File lives under {tenant_prefix}/orders/{id}/pod/ on the private disk
        $files = Storage::disk('local')->files(
            $this->tenant->storagePrefix()."/orders/{$this->order->id}/pod"
        );
        $this->assertNotEmpty($files);
    }

    public function test_triplicate_upload_sets_received_and_date_on_shipment(): void
    {
        $file = UploadedFile::fake()->image('tri.jpg');

        $this->post(route('orders.upload-evidence', ['order' => $this->order->id, 'kind' => 'triplicate']), [
            'photo' => $file,
        ])->assertRedirect();

        $this->order->refresh();
        $this->assertTrue($this->order->triplicate_received);
        // triplicate_received_date moved to the shipment row when redundant order columns were dropped.
        $shipment = $this->order->shipments()->latest('id')->first();
        $this->assertNotNull($shipment);
        $this->assertNotNull($shipment->triplicate_received_date);
    }

    public function test_evidence_upload_rejects_non_image(): void
    {
        $file = UploadedFile::fake()->create('not-image.pdf', 100, 'application/pdf');

        $this->post(route('orders.upload-evidence', ['order' => $this->order->id, 'kind' => 'pod']), [
            'photo' => $file,
        ])->assertSessionHasErrors('photo');

        $this->order->refresh();
        $this->assertFalse((bool) $this->order->pod_received);
    }

    public function test_evidence_upload_rejects_unknown_kind(): void
    {
        $file = UploadedFile::fake()->image('foo.jpg');
        $this->post('/orders/'.$this->order->id.'/evidence/unknown', ['photo' => $file])
            ->assertStatus(404); // route doesn't match because of whereIn constraint
    }
}
