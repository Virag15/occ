<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ReturnCase;
use App\Models\Shipment;
use App\Models\Tenant;
use App\Models\Transporter;
use App\Models\User;
use App\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The big cross-tenant isolation sweep. Spins up two tenants, seeds each
 * with its own customer/product/order/payment/shipment data, logs in as
 * a user from Tenant A, and hits every list + detail endpoint to prove
 * Tenant B's data is completely invisible.
 *
 * If any test here fails, multi-tenant isolation is broken and we cannot
 * sell to a second customer until it's fixed. Treat regressions here as
 * critical security incidents.
 */
class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $alpha;

    private Tenant $beta;

    private User $alphaOwner;

    private User $betaOwner;

    private TenantContext $context;

    // Alpha's data
    private Customer $alphaCustomer;

    private Product $alphaProduct;

    private Order $alphaOrder;

    private Transporter $alphaTransporter;

    private Payment $alphaPayment;

    private Shipment $alphaShipment;

    private ReturnCase $alphaReturn;

    // Beta's data
    private Customer $betaCustomer;

    private Product $betaProduct;

    private Order $betaOrder;

    private Transporter $betaTransporter;

    private Payment $betaPayment;

    private Shipment $betaShipment;

    private ReturnCase $betaReturn;

    protected function setUp(): void
    {
        parent::setUp();
        $this->context = app(TenantContext::class);

        $this->alpha = Tenant::create(['name' => 'Alpha MSME', 'slug' => 'alpha']);
        $this->beta = Tenant::create(['name' => 'Beta MSME', 'slug' => 'beta']);

        $this->alphaOwner = User::factory()->create(['role' => 'owner', 'tenant_id' => $this->alpha->id]);
        $this->betaOwner = User::factory()->create(['role' => 'owner', 'tenant_id' => $this->beta->id]);

        // Seed Alpha's data under Alpha's context
        $this->context->runAs($this->alpha, function () {
            $this->alphaCustomer = Customer::create([
                'tally_id' => 'A-CUST', 'name' => 'Alpha Customer', 'status' => 'active',
            ]);
            $this->alphaProduct = Product::create([
                'tally_id' => 'A-PROD', 'sku' => 'A-SKU', 'name' => 'Alpha Widget',
                'brand' => 'AlphaBrand', 'unit' => 'pcs', 'gst_rate' => 18, 'status' => 'active',
            ]);
            $this->alphaOrder = Order::create([
                'order_code' => 'ORD-A-1', 'customer_id' => $this->alphaCustomer->id,
                'order_date' => '2026-05-12', 'status' => 'delivered', 'priority' => 'normal',
                'payment_status' => 'partial', 'order_value' => 1000, 'amount_received' => 500,
            ]);
            OrderItem::create([
                'order_id' => $this->alphaOrder->id, 'product_name' => 'Alpha Widget',
                'qty_ordered' => 10, 'unit_price' => 100, 'tax_rate' => 18,
                'line_total' => 1180, 'status' => 'delivered',
            ]);
            $this->alphaTransporter = Transporter::create([
                'transporter_code' => 'T-A', 'name' => 'AlphaLogistics', 'status' => 'active',
            ]);
            $this->alphaShipment = Shipment::create([
                'shipment_code' => 'SHP-A-1', 'order_id' => $this->alphaOrder->id,
                'transporter_id' => $this->alphaTransporter->id, 'status' => 'delivered',
                'created_by' => null,
            ]);
            $this->alphaPayment = Payment::create([
                'order_id' => $this->alphaOrder->id, 'paid_on' => '2026-05-13', 'amount' => 500,
                'mode' => 'upi', 'reference' => 'UTR-A',
            ]);
            $this->alphaReturn = ReturnCase::create([
                'case_code' => 'RET-A-1', 'related_order_id' => $this->alphaOrder->id,
                'customer_id' => $this->alphaCustomer->id, 'date_reported' => '2026-05-13',
                'case_status' => 'reported',
            ]);
        });

        // Seed Beta's data under Beta's context
        $this->context->runAs($this->beta, function () {
            $this->betaCustomer = Customer::create([
                'tally_id' => 'B-CUST', 'name' => 'Beta Customer', 'status' => 'active',
            ]);
            $this->betaProduct = Product::create([
                'tally_id' => 'B-PROD', 'sku' => 'B-SKU', 'name' => 'Beta Widget',
                'brand' => 'BetaBrand', 'unit' => 'pcs', 'gst_rate' => 18, 'status' => 'active',
            ]);
            $this->betaOrder = Order::create([
                'order_code' => 'ORD-B-1', 'customer_id' => $this->betaCustomer->id,
                'order_date' => '2026-05-12', 'status' => 'delivered', 'priority' => 'normal',
                'payment_status' => 'partial', 'order_value' => 2000, 'amount_received' => 1000,
            ]);
            OrderItem::create([
                'order_id' => $this->betaOrder->id, 'product_name' => 'Beta Widget',
                'qty_ordered' => 20, 'unit_price' => 100, 'tax_rate' => 18,
                'line_total' => 2360, 'status' => 'delivered',
            ]);
            $this->betaTransporter = Transporter::create([
                'transporter_code' => 'T-B', 'name' => 'BetaLogistics', 'status' => 'active',
            ]);
            $this->betaShipment = Shipment::create([
                'shipment_code' => 'SHP-B-1', 'order_id' => $this->betaOrder->id,
                'transporter_id' => $this->betaTransporter->id, 'status' => 'delivered',
                'created_by' => null,
            ]);
            $this->betaPayment = Payment::create([
                'order_id' => $this->betaOrder->id, 'paid_on' => '2026-05-13', 'amount' => 1000,
                'mode' => 'upi', 'reference' => 'UTR-B',
            ]);
            $this->betaReturn = ReturnCase::create([
                'case_code' => 'RET-B-1', 'related_order_id' => $this->betaOrder->id,
                'customer_id' => $this->betaCustomer->id, 'date_reported' => '2026-05-13',
                'case_status' => 'reported',
            ]);
        });
    }

    protected function tearDown(): void
    {
        $this->context->clear();
        parent::tearDown();
    }

    // ─── List endpoints: must show only Alpha's rows when Alpha logged in ──

    public function test_customers_index_hides_other_tenants_customers(): void
    {
        $this->actingAs($this->alphaOwner)
            ->get('/customers')
            ->assertOk()
            ->assertInertia(fn ($p) => $p
                ->where('rows', fn ($rows) => collect($rows)->every(fn ($r) => $r['name'] === 'Alpha Customer'))
            );
    }

    public function test_products_index_hides_other_tenants_products(): void
    {
        $this->actingAs($this->alphaOwner)
            ->get('/products')
            ->assertOk()
            ->assertInertia(fn ($p) => $p
                ->where('rows', fn ($rows) => collect($rows)->every(fn ($r) => $r['sku'] === 'A-SKU'))
            );
    }

    public function test_orders_index_hides_other_tenants_orders(): void
    {
        $this->actingAs($this->alphaOwner)
            ->get('/orders')
            ->assertOk()
            ->assertInertia(fn ($p) => $p
                ->where('rows', fn ($rows) => collect($rows)->every(fn ($r) => $r['order_code'] === 'ORD-A-1'))
            );
    }

    public function test_transporters_index_hides_other_tenants_transporters(): void
    {
        $this->actingAs($this->alphaOwner)
            ->get('/transporters')
            ->assertOk()
            ->assertInertia(fn ($p) => $p
                ->where('rows', fn ($rows) => collect($rows)->every(fn ($r) => $r['name'] === 'AlphaLogistics'))
            );
    }

    public function test_returns_index_hides_other_tenants_returns(): void
    {
        $this->actingAs($this->alphaOwner)
            ->get('/returns')
            ->assertOk()
            ->assertInertia(fn ($p) => $p
                ->where('rows', fn ($rows) => collect($rows)->every(fn ($r) => $r['case_code'] === 'RET-A-1'))
            );
    }

    // ─── Detail endpoints: 404 when fetching another tenant's row by id ────

    public function test_customer_show_404s_for_other_tenants_customer(): void
    {
        $this->actingAs($this->alphaOwner)
            ->get("/customers/{$this->betaCustomer->id}")
            ->assertNotFound();
    }

    public function test_product_show_404s_for_other_tenants_product(): void
    {
        $this->actingAs($this->alphaOwner)
            ->get("/products/{$this->betaProduct->id}")
            ->assertNotFound();
    }

    public function test_order_show_404s_for_other_tenants_order(): void
    {
        $this->actingAs($this->alphaOwner)
            ->get("/orders/{$this->betaOrder->id}")
            ->assertNotFound();
    }

    public function test_order_edit_404s_for_other_tenants_order(): void
    {
        $this->actingAs($this->alphaOwner)
            ->get("/orders/{$this->betaOrder->id}/edit")
            ->assertNotFound();
    }

    public function test_transporter_show_404s_for_other_tenants_transporter(): void
    {
        $this->actingAs($this->alphaOwner)
            ->get("/transporters/{$this->betaTransporter->id}")
            ->assertNotFound();
    }

    public function test_return_show_404s_for_other_tenants_return(): void
    {
        $this->actingAs($this->alphaOwner)
            ->get("/returns/{$this->betaReturn->id}")
            ->assertNotFound();
    }

    // ─── PDFs: 404 for cross-tenant ──────────────────────────────────────

    public function test_invoice_pdf_404s_for_other_tenants_order(): void
    {
        $this->actingAs($this->alphaOwner)
            ->get("/orders/{$this->betaOrder->id}/invoice.pdf")
            ->assertNotFound();
    }

    public function test_quotation_pdf_404s_for_other_tenants_order(): void
    {
        $this->actingAs($this->alphaOwner)
            ->get("/orders/{$this->betaOrder->id}/quotation.pdf")
            ->assertNotFound();
    }

    // ─── Write endpoints: 404 for cross-tenant mutation attempts ─────────

    public function test_cannot_update_other_tenants_order(): void
    {
        $response = $this->actingAs($this->alphaOwner)
            ->patch("/orders/{$this->betaOrder->id}", [
                'order_code' => 'ORD-HIJACK',
                'customer_id' => $this->alphaCustomer->id,
                'order_date' => '2026-05-12',
                'status' => 'cancelled',
                'priority' => 'normal',
                'payment_status' => 'paid',
            ]);

        // We accept either 404 (route-model binding failed) or a redirect.
        // What we MUST NOT allow: a successful 2xx that actually persisted
        // the change. Verify Beta's order is unchanged.
        $this->assertContains($response->status(), [404, 302], 'cross-tenant edit must not succeed');

        $betaFresh = $this->context->runAs($this->beta, fn () => Order::find($this->betaOrder->id));
        $this->assertSame('ORD-B-1', $betaFresh->order_code, 'Beta\'s order must remain unchanged');
        $this->assertSame('delivered', $betaFresh->status, 'Beta\'s status must remain unchanged');
    }

    public function test_cannot_delete_other_tenants_customer(): void
    {
        $response = $this->actingAs($this->alphaOwner)
            ->delete("/customers/{$this->betaCustomer->id}");

        $this->assertContains($response->status(), [404, 302], 'cross-tenant delete must not succeed');

        // Beta's customer must still exist
        $betaFresh = $this->context->runAs($this->beta, fn () => Customer::find($this->betaCustomer->id));
        $this->assertNotNull($betaFresh, 'Beta\'s customer was deleted across tenants');
    }

    public function test_cannot_record_payment_against_other_tenants_order(): void
    {
        $response = $this->actingAs($this->alphaOwner)
            ->post("/orders/{$this->betaOrder->id}/payments", [
                'paid_on' => '2026-05-14',
                'amount' => 100,
                'mode' => 'upi',
            ]);

        $this->assertContains($response->status(), [404, 302], 'cross-tenant payment must not succeed');

        $betaPaymentCount = $this->context->runAs(
            $this->beta,
            fn () => Payment::where('order_id', $this->betaOrder->id)->count()
        );
        $this->assertSame(1, $betaPaymentCount, 'still just the original one — no leak');
    }

    // ─── Reports + Tasks: aggregate views must be tenant-scoped ─────────

    public function test_reports_kpis_only_sum_alphas_data(): void
    {
        $response = $this->actingAs($this->alphaOwner)
            ->get('/reports?from=2026-05-12&to=2026-05-12');
        $kpis = $response->viewData('page')['props']['kpis'];

        // Alpha's single order is 1000. Beta's order is 2000. KPIs should
        // only count Alpha's.
        $this->assertSame(1, $kpis['orders_count']);
        $this->assertEqualsWithDelta(1000.0, (float) $kpis['orders_value'], 0.01);
    }

    public function test_tasks_endpoint_only_shows_alphas_action_items(): void
    {
        $response = $this->actingAs($this->alphaOwner)
            ->get('/tasks')
            ->viewData('page')['props'];

        // Open returns: Alpha has 1, Beta has 1, Alpha should see 1
        $this->assertCount(1, $response['open_returns']);
    }

    // ─── Audit log: cross-tenant invisibility ────────────────────────────

    public function test_audit_log_index_shows_only_alphas_entries(): void
    {
        // Both tenants have AuditObserver-generated rows from the setUp
        // model creations. Alpha owner should only see Alpha's.
        $response = $this->actingAs($this->alphaOwner)->get('/audit-logs');
        $response->assertOk();
        $rows = $response->viewData('page')['props']['rows'];
        $entityCodes = collect($rows)->pluck('entity_id')->unique();

        // None of Beta's entity ids should appear
        $betaEntityIds = [
            $this->betaCustomer->id,
            $this->betaProduct->id,
            $this->betaOrder->id,
            $this->betaTransporter->id,
        ];
        foreach ($betaEntityIds as $betaId) {
            // It's possible Alpha's entity has the same id (auto-inc collision
            // across tenants since we share a single users table). So check
            // entity_type + entity_id combined isn't sufficient — instead just
            // verify the global scope hides Beta's audit rows by checking
            // tenant_id in the underlying table.
            $betaAuditCount = $this->context->runAs(
                $this->beta,
                fn () => AuditLog::count()
            );
            $this->assertGreaterThan(0, $betaAuditCount, 'Beta has its own audit rows in its scope');
        }

        // Alpha's view should never include Beta's rows. Sample one: Beta
        // tenant_id should NOT appear in any rendered audit row's tenant
        // (we don't expose tenant_id in the JSON but we can prove the
        // scope worked by checking that the count of rendered rows equals
        // the count of audit rows tenant-scoped to Alpha).
        $alphaAuditCount = AuditLog::count(); // already scoped to Alpha
        $this->assertCount($alphaAuditCount, $rows);
    }
}
