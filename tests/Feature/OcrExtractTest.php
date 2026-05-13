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
 * Covers the OCR extract endpoint in demo mode (OCR_ENABLED=false by
 * default). Each evidence kind returns its canned field shape, and the
 * temp file is cleaned up after the call.
 */
class OcrExtractTest extends TestCase
{
    use RefreshDatabase;

    private Order $order;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = Tenant::create(['name' => 'OCR Co.', 'slug' => 'ocr']);
        app(TenantContext::class)->set($this->tenant);

        $this->actingAs(User::factory()->create(['role' => 'warehouse', 'tenant_id' => $this->tenant->id]));
        $c = Customer::create(['tally_id' => 'C', 'name' => 'X', 'status' => 'active']);
        $this->order = Order::create([
            'order_code' => 'ORD-OCR-1', 'customer_id' => $c->id, 'order_date' => '2026-05-12',
            'status' => 'dispatched', 'priority' => 'normal', 'payment_status' => 'not_due', 'order_value' => 0,
        ]);
        Storage::fake('local');
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    public function test_lr_extract_returns_canned_fields(): void
    {
        $file = UploadedFile::fake()->image('lr.jpg');

        $response = $this->post(route('orders.extract-evidence', ['order' => $this->order->id, 'kind' => 'lr']), [
            'photo' => $file,
        ]);

        $response->assertOk();
        $body = $response->json();
        $this->assertTrue($body['ok']);
        $this->assertArrayHasKey('lr_number', $body['fields']);
        $this->assertArrayHasKey('dispatch_date', $body['fields']);
        $this->assertStringStartsWith('DEMO-LR-', $body['fields']['lr_number']);
    }

    public function test_pod_extract_returns_delivery_fields(): void
    {
        $file = UploadedFile::fake()->image('pod.jpg');

        $response = $this->post(route('orders.extract-evidence', ['order' => $this->order->id, 'kind' => 'pod']), [
            'photo' => $file,
        ]);

        $response->assertOk();
        $body = $response->json();
        $this->assertTrue($body['ok']);
        $this->assertArrayHasKey('delivered_date', $body['fields']);
        $this->assertTrue($body['fields']['signature_detected']);
    }

    public function test_temp_file_is_cleaned_up_after_extract(): void
    {
        $file = UploadedFile::fake()->image('parcel.jpg');

        $this->post(route('orders.extract-evidence', ['order' => $this->order->id, 'kind' => 'parcel']), [
            'photo' => $file,
        ])->assertOk();

        // _ocr_tmp directory shouldn't accumulate files
        $tmpFiles = Storage::disk('local')->files("orders/{$this->order->id}/_ocr_tmp");
        $this->assertEmpty($tmpFiles, 'OCR temp file should be deleted after extract');
    }

    public function test_unknown_kind_rejected(): void
    {
        $file = UploadedFile::fake()->image('x.jpg');
        $this->post('/orders/'.$this->order->id.'/evidence/unknown/extract', ['photo' => $file])
            ->assertNotFound(); // whereIn constraint on the route
    }

    public function test_viewer_cannot_extract(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'viewer']));
        $file = UploadedFile::fake()->image('lr.jpg');
        $this->post(route('orders.extract-evidence', ['order' => $this->order->id, 'kind' => 'lr']), [
            'photo' => $file,
        ])->assertForbidden();
    }
}
