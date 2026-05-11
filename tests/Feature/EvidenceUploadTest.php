<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class EvidenceUploadTest extends TestCase
{
    use RefreshDatabase;

    private Order $order;

    protected function setUp(): void
    {
        parent::setUp();
        $owner = User::factory()->create(['role' => 'owner']);
        $this->actingAs($owner);

        $c = Customer::create(['tally_id' => 'C', 'name' => 'X', 'status' => 'active']);
        $this->order = Order::create([
            'order_code' => 'ORD-E-1', 'customer_id' => $c->id, 'order_date' => '2026-05-12',
            'status' => 'dispatched', 'priority' => 'normal', 'payment_status' => 'not_due', 'order_value' => 0,
        ]);

        Storage::fake('public');
    }

    public function test_pod_upload_sets_received_and_appends_url(): void
    {
        $file = UploadedFile::fake()->image('pod.jpg');

        $this->post(route('orders.upload-evidence', ['order' => $this->order->id, 'kind' => 'pod']), [
            'photo' => $file,
        ])->assertRedirect();

        $this->order->refresh();
        $this->assertTrue($this->order->pod_received);
        $this->assertIsArray($this->order->pod_photo_url);
        $this->assertCount(1, $this->order->pod_photo_url);
        Storage::disk('public')->assertExists("orders/{$this->order->id}/pod/" . $file->hashName());
    }

    public function test_triplicate_upload_sets_received_and_date(): void
    {
        $file = UploadedFile::fake()->image('tri.jpg');

        $this->post(route('orders.upload-evidence', ['order' => $this->order->id, 'kind' => 'triplicate']), [
            'photo' => $file,
        ])->assertRedirect();

        $this->order->refresh();
        $this->assertTrue($this->order->triplicate_received);
        $this->assertNotNull($this->order->triplicate_received_date);
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
        $this->post('/orders/' . $this->order->id . '/evidence/unknown', ['photo' => $file])
            ->assertStatus(404); // route doesn't match because of whereIn constraint
    }
}
