<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Shipment;
use App\Models\Transporter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * PDF + file-download smoke tests. We don't open the binary — we just
 * confirm DomPDF renders without throwing, the response is application/pdf,
 * and the filename header is sensible. If the blade template breaks
 * (e.g. a renamed accessor on Order::items), this catches it before a
 * sales rep tries to print an invoice in front of a customer.
 *
 * Also covers the picking/packing-slip Inertia routes and the
 * evidence-download path-traversal guard.
 */
class PdfSmokeTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private Order $order;

    private Shipment $shipment;

    protected function setUp(): void
    {
        parent::setUp();
        $this->owner = User::factory()->create(['role' => 'owner']);

        $c = Customer::create([
            'tally_id' => 'C-PDF', 'name' => 'Acme', 'company' => 'Acme Co.',
            'gstin' => '27ABCDE1234F1Z5', 'status' => 'active',
            'address_line_1' => 'Plot 12', 'city' => 'Nashik', 'state' => 'Maharashtra',
            'state_code' => '27', 'pincode' => '422001',
        ]);
        $this->order = Order::create([
            'order_code' => 'ORD-PDF-1', 'customer_id' => $c->id, 'order_date' => '2026-05-12',
            'status' => 'new_order', 'priority' => 'normal', 'payment_status' => 'not_due',
            'order_value' => 1180, 'invoice_number' => 'INV-PDF-1',
        ]);
        OrderItem::create([
            'order_id' => $this->order->id, 'product_name' => 'MCB 32A',
            'qty_ordered' => 10, 'unit_price' => 100, 'tax_rate' => 18,
            'line_total' => 1180, 'status' => 'pending',
        ]);

        $t = Transporter::create([
            'transporter_code' => 'T-PDF', 'name' => 'PDFLogistics', 'status' => 'active',
        ]);
        $this->shipment = Shipment::create([
            'shipment_code' => 'SHP-PDF-1', 'order_id' => $this->order->id,
            'transporter_id' => $t->id, 'status' => 'planning', 'created_by' => null,
            'number_of_boxes' => 2, 'parcel_weight_kg' => 5.5,
        ]);
    }

    // ─── Invoice / Quotation PDF ─────────────────────────────────────

    public function test_invoice_pdf_renders(): void
    {
        $response = $this->actingAs($this->owner)
            ->get("/orders/{$this->order->id}/invoice.pdf");

        $response->assertOk();
        $this->assertStringStartsWith('application/pdf', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('invoice-ORD-PDF-1.pdf', $response->headers->get('Content-Disposition'));
        // DomPDF output always starts with %PDF-
        $this->assertStringStartsWith('%PDF-', $response->getContent());
    }

    public function test_quotation_pdf_renders(): void
    {
        $response = $this->actingAs($this->owner)
            ->get("/orders/{$this->order->id}/quotation.pdf");

        $response->assertOk();
        $this->assertStringStartsWith('application/pdf', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('quotation-ORD-PDF-1.pdf', $response->headers->get('Content-Disposition'));
        $this->assertStringStartsWith('%PDF-', $response->getContent());
    }

    public function test_invoice_pdf_handles_multi_item_order_without_throwing(): void
    {
        // Stress: 25 line items with mixed tax rates, big amounts, an
        // empty product_name (older orders sometimes have these), a
        // line with zero quantity.
        for ($i = 0; $i < 24; $i++) {
            OrderItem::create([
                'order_id' => $this->order->id,
                'product_name' => $i === 5 ? '' : "Item #{$i}",
                'qty_ordered' => $i === 7 ? 0 : ($i + 1),
                'unit_price' => 12345.67,
                'tax_rate' => $i % 2 === 0 ? 18 : 28,
                'line_total' => 12345.67 * ($i + 1) * 1.18,
                'status' => 'pending',
            ]);
        }

        $response = $this->actingAs($this->owner)
            ->get("/orders/{$this->order->id}/invoice.pdf");

        $response->assertOk();
        $this->assertStringStartsWith('application/pdf', $response->headers->get('Content-Type'));
    }

    public function test_invoice_pdf_404s_for_missing_order(): void
    {
        $this->actingAs($this->owner)
            ->get('/orders/999999/invoice.pdf')
            ->assertNotFound();
    }

    public function test_invoice_pdf_writes_audit_log(): void
    {
        $this->actingAs($this->owner)
            ->get("/orders/{$this->order->id}/invoice.pdf")
            ->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'invoice_downloaded',
            'entity_type' => 'order',
            'entity_id' => $this->order->id,
        ]);
    }

    public function test_quotation_pdf_writes_audit_log(): void
    {
        $this->actingAs($this->owner)
            ->get("/orders/{$this->order->id}/quotation.pdf")
            ->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'quotation_downloaded',
            'entity_type' => 'order',
            'entity_id' => $this->order->id,
        ]);
    }

    // ─── Picking / Packing slip (Inertia routes, not PDFs) ───────────

    public function test_picking_slip_renders(): void
    {
        $this->actingAs($this->owner)
            ->get("/shipments/{$this->shipment->id}/picking-slip")
            ->assertOk()
            ->assertInertia(fn ($p) => $p
                ->component('Shipments/PickingSlip')
                ->has('shipment.id')
                ->has('company')
            );
    }

    public function test_packing_slip_renders(): void
    {
        $this->actingAs($this->owner)
            ->get("/shipments/{$this->shipment->id}/packing-slip")
            ->assertOk()
            ->assertInertia(fn ($p) => $p
                ->component('Shipments/PackingSlip')
                ->has('shipment.id')
                ->has('company')
            );
    }

    // ─── Evidence download (path-traversal guard) ────────────────────

    public function test_evidence_download_blocks_path_traversal(): void
    {
        Storage::disk('local')->put("orders/{$this->order->id}/pod.jpg", 'fake-image-bytes');

        $this->actingAs($this->owner)
            ->get("/orders/{$this->order->id}/evidence/download?path=orders/{$this->order->id}/../../../etc/passwd")
            ->assertNotFound();
    }

    public function test_evidence_download_blocks_wrong_order_prefix(): void
    {
        $this->actingAs($this->owner)
            ->get("/orders/{$this->order->id}/evidence/download?path=orders/999999/pod.jpg")
            ->assertNotFound();
    }

    public function test_evidence_download_404s_when_file_missing(): void
    {
        $this->actingAs($this->owner)
            ->get("/orders/{$this->order->id}/evidence/download?path=orders/{$this->order->id}/does-not-exist.jpg")
            ->assertNotFound();
    }

    public function test_evidence_download_serves_real_file(): void
    {
        $path = "orders/{$this->order->id}/pod.jpg";
        Storage::disk('local')->put($path, 'fake-image-bytes');

        $response = $this->actingAs($this->owner)
            ->get("/orders/{$this->order->id}/evidence/download?path={$path}");

        $response->assertOk();
        // Storage::response() uses inline disposition; just confirm the filename is in the header
        // and the content-type is set (jpeg-ish for a .jpg).
        $this->assertStringContainsString('pod.jpg', (string) $response->headers->get('Content-Disposition'));
        $this->assertNotEmpty($response->headers->get('Content-Type'));
    }
}
