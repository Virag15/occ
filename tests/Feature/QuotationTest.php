<?php

namespace Tests\Feature;

use App\Models\BrandLogo;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\Quotation;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Standalone quotations — the core requirement: create a quotation
 * WITHOUT an order. Plus totals math, tenant isolation, role gating,
 * PDF rendering with company + brand logos, edit/status/delete.
 */
class QuotationTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    private User $owner;

    private TenantContext $ctx;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = Tenant::create(['name' => 'Quote Co.', 'slug' => 'quote-co']);
        $this->ctx = app(TenantContext::class);
        $this->ctx->set($this->tenant);
        $this->owner = User::factory()->create(['role' => 'owner', 'tenant_id' => $this->tenant->id]);
        Storage::fake('public');
    }

    protected function tearDown(): void
    {
        $this->ctx->clear();
        parent::tearDown();
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'customer_name' => 'Walk-in Prospect',
            'customer_company' => 'Prospect Pvt Ltd',
            'customer_gstin' => '27ABCDE1234F1Z5',
            'quotation_date' => '2026-05-14',
            'valid_until' => '2026-05-28',
            'discount_amount' => 100,
            'notes' => 'Bulk pricing on request.',
            'terms' => 'Payment 50% advance.',
            'items' => [
                ['product_name' => 'MCB 32A', 'qty' => 10, 'unit' => 'pcs', 'unit_price' => 100, 'discount_pct' => 0, 'tax_rate' => 18, 'hsn_code' => '8536'],
                ['product_name' => 'Wire 2.5sq', 'qty' => 5, 'unit' => 'box', 'unit_price' => 200, 'discount_pct' => 10, 'tax_rate' => 18],
            ],
        ], $overrides);
    }

    // ─── The core requirement ────────────────────────────────────────

    public function test_can_create_quotation_without_any_order(): void
    {
        $this->assertSame(0, Order::count());

        $this->actingAs($this->owner)
            ->post('/quotations', $this->payload())
            ->assertRedirect();

        $q = Quotation::first();
        $this->assertNotNull($q);
        $this->assertSame(0, Order::count(), 'no order was created');
        $this->assertSame('Walk-in Prospect', $q->customer_name);
        $this->assertNull($q->customer_id, 'ad-hoc customer, no Customer row linked');
        $this->assertCount(2, $q->items);
        $this->assertStringStartsWith('QUO-', $q->quotation_code);
    }

    public function test_totals_are_computed_correctly(): void
    {
        $this->actingAs($this->owner)->post('/quotations', $this->payload());
        $q = Quotation::first();

        // Line 1: 10 * 100 = 1000 taxable; tax 180
        // Line 2: 5 * 200 * 0.9 = 900 taxable; tax 162
        // subtotal = 1900, tax = 342, discount 100 → total = 2142
        $this->assertEqualsWithDelta(1900.0, (float) $q->subtotal, 0.01);
        $this->assertEqualsWithDelta(342.0, (float) $q->tax_total, 0.01);
        $this->assertEqualsWithDelta(2142.0, (float) $q->total, 0.01);

        $line1 = $q->items->firstWhere('product_name', 'MCB 32A');
        $this->assertEqualsWithDelta(1180.0, (float) $line1->line_total, 0.01);
    }

    public function test_can_link_an_existing_customer(): void
    {
        $cust = Customer::create(['tally_id' => 'C1', 'name' => 'Acme', 'status' => 'active']);

        $this->actingAs($this->owner)
            ->post('/quotations', $this->payload(['customer_id' => $cust->id]))
            ->assertRedirect();

        $this->assertSame($cust->id, Quotation::first()->customer_id);
    }

    // ─── Validation ──────────────────────────────────────────────────

    public function test_requires_customer_name_and_at_least_one_item(): void
    {
        $this->actingAs($this->owner)
            ->post('/quotations', ['quotation_date' => '2026-05-14', 'items' => []])
            ->assertSessionHasErrors(['customer_name', 'items']);

        $this->assertSame(0, Quotation::count());
    }

    public function test_valid_until_must_be_after_quotation_date(): void
    {
        $this->actingAs($this->owner)
            ->post('/quotations', $this->payload([
                'quotation_date' => '2026-05-14',
                'valid_until' => '2026-05-01',
            ]))
            ->assertSessionHasErrors('valid_until');
    }

    public function test_item_qty_must_be_positive(): void
    {
        $this->actingAs($this->owner)
            ->post('/quotations', $this->payload([
                'items' => [['product_name' => 'X', 'qty' => 0, 'unit_price' => 10]],
            ]))
            ->assertSessionHasErrors('items.0.qty');
    }

    // ─── Role gating ─────────────────────────────────────────────────

    public function test_warehouse_role_cannot_create_quotation(): void
    {
        $wh = User::factory()->create(['role' => 'warehouse', 'tenant_id' => $this->tenant->id]);
        $this->actingAs($wh)->post('/quotations', $this->payload())->assertForbidden();
        $this->assertSame(0, Quotation::count());
    }

    public function test_accounts_role_can_create_quotation(): void
    {
        $acc = User::factory()->create(['role' => 'accounts', 'tenant_id' => $this->tenant->id]);
        $this->actingAs($acc)->post('/quotations', $this->payload())->assertRedirect();
        $this->assertSame(1, Quotation::count());
    }

    public function test_cannot_reference_another_tenants_customer_id(): void
    {
        // Customer that belongs to a DIFFERENT tenant.
        $tenantB = Tenant::create(['name' => 'B', 'slug' => 'b-cust']);
        $foreignCustomer = $this->ctx->runAs($tenantB, fn () => Customer::create([
            'tally_id' => 'BC', 'name' => 'Foreign', 'status' => 'active',
        ]));

        $this->actingAs($this->owner)
            ->post('/quotations', $this->payload(['customer_id' => $foreignCustomer->id]))
            ->assertSessionHasErrors('customer_id');

        $this->assertSame(0, Quotation::count());
    }

    public function test_cannot_reference_another_tenants_product_id(): void
    {
        $tenantB = Tenant::create(['name' => 'B', 'slug' => 'b-prod']);
        $foreignProduct = $this->ctx->runAs($tenantB, fn () => Product::create([
            'tally_id' => 'BP', 'sku' => 'BP-1', 'name' => 'Foreign Product',
            'unit' => 'pcs', 'gst_rate' => 18, 'status' => 'active',
        ]));

        $this->actingAs($this->owner)
            ->post('/quotations', $this->payload([
                'items' => [[
                    'product_id' => $foreignProduct->id,
                    'product_name' => 'Spoof', 'qty' => 1, 'unit_price' => 10, 'tax_rate' => 18,
                ]],
            ]))
            ->assertSessionHasErrors('items.0.product_id');

        $this->assertSame(0, Quotation::count());
    }

    // ─── Tenant isolation ────────────────────────────────────────────

    public function test_quotations_are_tenant_isolated(): void
    {
        $this->actingAs($this->owner)->post('/quotations', $this->payload());
        $aQuote = Quotation::first();

        $tenantB = Tenant::create(['name' => 'Other', 'slug' => 'other']);
        $ownerB = User::factory()->create(['role' => 'owner', 'tenant_id' => $tenantB->id]);

        $this->ctx->set($tenantB);
        // B's index shows nothing
        $this->actingAs($ownerB)->get('/quotations')
            ->assertInertia(fn ($p) => $p->where('pagination.total', 0));
        // B cannot view A's quotation
        $this->actingAs($ownerB)->get("/quotations/{$aQuote->id}")->assertNotFound();
        // B cannot download A's PDF
        $this->actingAs($ownerB)->get("/quotations/{$aQuote->id}/pdf")->assertNotFound();
        // B cannot delete A's quotation
        $this->actingAs($ownerB)->delete("/quotations/{$aQuote->id}")->assertNotFound();

        $this->ctx->set($this->tenant);
        $this->assertSame(1, Quotation::count(), 'A\'s quotation untouched');
    }

    // ─── Lifecycle: edit, status, delete ─────────────────────────────

    public function test_can_edit_a_quotation_and_recompute_totals(): void
    {
        $this->actingAs($this->owner)->post('/quotations', $this->payload());
        $q = Quotation::first();

        $this->actingAs($this->owner)
            ->put("/quotations/{$q->id}", $this->payload([
                'discount_amount' => 0,
                'items' => [['product_name' => 'Single', 'qty' => 1, 'unit_price' => 1000, 'tax_rate' => 18]],
            ]))
            ->assertRedirect();

        $q->refresh();
        $this->assertCount(1, $q->items);
        $this->assertEqualsWithDelta(1180.0, (float) $q->total, 0.01);
    }

    public function test_can_change_status(): void
    {
        $this->actingAs($this->owner)->post('/quotations', $this->payload());
        $q = Quotation::first();

        $this->actingAs($this->owner)
            ->patch("/quotations/{$q->id}/status", ['status' => 'accepted'])
            ->assertRedirect();

        $this->assertSame('accepted', $q->fresh()->status);
    }

    public function test_invalid_status_rejected(): void
    {
        $this->actingAs($this->owner)->post('/quotations', $this->payload());
        $q = Quotation::first();

        $this->actingAs($this->owner)
            ->patch("/quotations/{$q->id}/status", ['status' => 'banana'])
            ->assertSessionHasErrors('status');
    }

    public function test_can_delete_a_quotation(): void
    {
        $this->actingAs($this->owner)->post('/quotations', $this->payload());
        $q = Quotation::first();

        $this->actingAs($this->owner)->delete("/quotations/{$q->id}")->assertRedirect();
        $this->assertSoftDeleted('quotations', ['id' => $q->id]);
    }

    // ─── Codes ───────────────────────────────────────────────────────

    public function test_quotation_codes_are_sequential_per_tenant(): void
    {
        $this->actingAs($this->owner)->post('/quotations', $this->payload());
        $this->actingAs($this->owner)->post('/quotations', $this->payload());

        $codes = Quotation::orderBy('id')->pluck('quotation_code')->all();
        $year = now()->year;
        $this->assertSame(["QUO-{$year}-0001", "QUO-{$year}-0002"], $codes);
    }

    // ─── PDF ─────────────────────────────────────────────────────────

    public function test_pdf_renders_as_pdf(): void
    {
        $this->actingAs($this->owner)->post('/quotations', $this->payload());
        $q = Quotation::first();

        $response = $this->actingAs($this->owner)->get("/quotations/{$q->id}/pdf");
        $response->assertOk();
        $this->assertStringStartsWith('application/pdf', (string) $response->headers->get('Content-Type'));
        $this->assertStringContainsString("quotation-{$q->quotation_code}.pdf", (string) $response->headers->get('Content-Disposition'));
        $this->assertStringStartsWith('%PDF-', $response->getContent());
    }

    public function test_pdf_includes_brand_logos_without_throwing(): void
    {
        // Add a couple of brand logos for the tenant
        BrandLogo::create(['name' => 'Schneider', 'logo_path' => 'x.png']);
        $this->actingAs($this->owner)->post('/settings/branding', [
            'name' => 'Legrand',
            'logo' => UploadedFile::fake()->image('legrand.png'),
        ]);

        $this->actingAs($this->owner)->post('/quotations', $this->payload());
        $q = Quotation::first();

        // Brand with a missing file (x.png) must be skipped, not crash.
        $this->actingAs($this->owner)
            ->get("/quotations/{$q->id}/pdf")
            ->assertOk();
    }

    public function test_pdf_handles_quotation_with_no_brand_logos(): void
    {
        $this->actingAs($this->owner)->post('/quotations', $this->payload());
        $q = Quotation::first();

        $this->actingAs($this->owner)
            ->get("/quotations/{$q->id}/pdf")
            ->assertOk();
    }
}
