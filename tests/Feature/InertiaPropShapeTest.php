<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\ReturnCase;
use App\Models\Shipment;
use App\Models\Transporter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Smoke tests that GET each Inertia page as an owner and assert the
 * expected top-level prop keys are present. Contract-level coverage:
 * if a controller stops sending a prop the React page reads, this
 * test catches it before the user does.
 *
 * Not asserting the *shape* of nested data — just that the keys exist,
 * the page renders, and the component name is right. That's enough to
 * catch the common regression (rename / drop / typo).
 */
class InertiaPropShapeTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private Customer $customer;

    private Product $product;

    private Order $order;

    private Transporter $transporter;

    private Shipment $shipment;

    private ReturnCase $return;

    protected function setUp(): void
    {
        parent::setUp();
        $this->owner = User::factory()->create(['role' => 'owner']);

        $this->customer = Customer::create([
            'tally_id' => 'CUST-PROP', 'name' => 'Acme', 'status' => 'active',
        ]);
        $this->product = Product::create([
            'tally_id' => 'PROD-PROP', 'sku' => 'SKU-PROP', 'name' => 'Widget',
            'brand' => 'Schneider', 'unit' => 'pcs', 'gst_rate' => 18, 'status' => 'active',
        ]);
        $this->order = Order::create([
            'order_code' => 'ORD-PROP-1', 'customer_id' => $this->customer->id,
            'order_date' => '2026-05-12', 'status' => 'new_order', 'priority' => 'normal',
            'payment_status' => 'not_due', 'order_value' => 1000,
        ]);
        $this->transporter = Transporter::create([
            'transporter_code' => 'T-PROP', 'name' => 'TestLogistics', 'status' => 'active',
        ]);
        $this->shipment = Shipment::create([
            'shipment_code' => 'SHP-PROP-1', 'order_id' => $this->order->id,
            'transporter_id' => $this->transporter->id, 'status' => 'planning', 'created_by' => null,
        ]);
        $this->return = ReturnCase::create([
            'case_code' => 'RET-PROP-1', 'related_order_id' => $this->order->id,
            'customer_id' => $this->customer->id, 'date_reported' => '2026-05-12',
            'case_status' => 'reported',
        ]);
    }

    // ─── Dashboard / Tasks / Warehouse / Reports ─────────────────────

    public function test_dashboard_has_kpi_props(): void
    {
        $this->actingAs($this->owner)->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->component('Dashboard')
                ->has('kpis')
                ->has('kpis.orders_today')
                ->has('kpis.pending_dispatch')
            );
    }

    public function test_tasks_page_has_task_bucket_props(): void
    {
        $this->actingAs($this->owner)->get('/tasks')
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->component('Tasks/Index')
                ->has('awaiting_lr')
                ->has('pod_pending')
                ->has('triplicate_pending')
                ->has('payments_overdue')
                ->has('open_returns')
                ->has('today')
            );
    }

    public function test_warehouse_queue_has_queue_props(): void
    {
        $this->actingAs($this->owner)->get('/warehouse')
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->component('Warehouse/Queue')
                ->has('awaiting_dispatch')
                ->has('pod_pending')
                ->has('triplicate_pending')
            );
    }

    public function test_reports_page_has_kpi_and_section_props(): void
    {
        $this->actingAs($this->owner)->get('/reports')
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->component('Reports/Index')
                ->has('range.from')
                ->has('range.to')
                ->has('kpis')
                ->has('brand_mix')
                ->has('dispatch_sla')
            );
    }

    public function test_reports_daily_redirects_to_reports_index(): void
    {
        $this->actingAs($this->owner)->get('/reports/daily')
            ->assertRedirect();
    }

    // ─── Customers ────────────────────────────────────────────────────

    public function test_customers_index_has_pagination_and_rows(): void
    {
        $this->actingAs($this->owner)->get('/customers')
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->component('Customers/Index')
                ->has('rows')
                ->has('pagination.total')
                ->has('pagination.current_page')
                ->has('filters')
            );
    }

    public function test_customers_create_renders(): void
    {
        $this->actingAs($this->owner)->get('/customers/create')
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p->component('Customers/Create'));
    }

    public function test_customers_show_has_stats_and_aging(): void
    {
        $this->actingAs($this->owner)->get("/customers/{$this->customer->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->component('Customers/Show')
                ->has('customer')
                ->has('orders')
                ->has('stats')
                ->has('brand_frequency')
                ->has('monthly_trend')
                ->has('payment_aging')
            );
    }

    public function test_customers_edit_has_customer_prop(): void
    {
        $this->actingAs($this->owner)->get("/customers/{$this->customer->id}/edit")
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->component('Customers/Edit')
                ->has('customer.id')
                ->has('customer.name')
            );
    }

    // ─── Products ─────────────────────────────────────────────────────

    public function test_products_index_has_pagination_and_rows(): void
    {
        $this->actingAs($this->owner)->get('/products')
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->component('Products/Index')
                ->has('rows')
                ->has('pagination.total')
            );
    }

    public function test_products_create_renders(): void
    {
        $this->actingAs($this->owner)->get('/products/create')
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p->component('Products/Create'));
    }

    public function test_products_show_has_stats(): void
    {
        $this->actingAs($this->owner)->get("/products/{$this->product->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->component('Products/Show')
                ->has('product')
                ->has('stats.total_stock')
            );
    }

    public function test_products_edit_has_product_with_stock(): void
    {
        $this->actingAs($this->owner)->get("/products/{$this->product->id}/edit")
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->component('Products/Edit')
                ->has('product.id')
                ->has('product.stock_items')
            );
    }

    // ─── Orders ───────────────────────────────────────────────────────

    public function test_orders_index_has_pagination_and_rows(): void
    {
        $this->actingAs($this->owner)->get('/orders')
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->component('Orders/Index')
                ->has('rows')
                ->has('pagination.total')
            );
    }

    public function test_orders_kanban_has_rows(): void
    {
        $this->actingAs($this->owner)->get('/orders/kanban')
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->component('Orders/Kanban')
                ->has('rows')
            );
    }

    public function test_orders_show_has_order_and_audit_and_transporters(): void
    {
        $this->actingAs($this->owner)->get("/orders/{$this->order->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->component('Orders/Show')
                ->has('order.id')
                ->has('auditLog')
                ->has('transporters')
            );
    }

    public function test_orders_create_has_customers_products_and_next_code(): void
    {
        $this->actingAs($this->owner)->get('/orders/create')
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->component('Orders/Create')
                ->has('customers')
                ->has('products')
                ->has('nextOrderCode')
            );
    }

    public function test_orders_edit_has_order(): void
    {
        $this->actingAs($this->owner)->get("/orders/{$this->order->id}/edit")
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->component('Orders/Edit')
                ->has('order.id')
            );
    }

    // ─── Transporters ─────────────────────────────────────────────────

    public function test_transporters_index_has_pagination_and_rows(): void
    {
        $this->actingAs($this->owner)->get('/transporters')
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->component('Transporters/Index')
                ->has('rows')
                ->has('pagination.total')
                ->has('filters')
            );
    }

    public function test_transporters_create_renders(): void
    {
        $this->actingAs($this->owner)->get('/transporters/create')
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p->component('Transporters/Create'));
    }

    public function test_transporters_show_has_stats(): void
    {
        $this->actingAs($this->owner)->get("/transporters/{$this->transporter->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->component('Transporters/Show')
                ->has('transporter.id')
                ->has('shipments')
                ->has('stats')
            );
    }

    public function test_transporters_edit_renders(): void
    {
        $this->actingAs($this->owner)->get("/transporters/{$this->transporter->id}/edit")
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->component('Transporters/Edit')
                ->has('transporter.id')
            );
    }

    // ─── Returns + Shipments ──────────────────────────────────────────

    public function test_returns_index_renders(): void
    {
        $this->actingAs($this->owner)->get('/returns')
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->component('Returns/Index')
                ->has('rows')
                ->has('pagination.total')
            );
    }

    public function test_returns_show_renders(): void
    {
        $this->actingAs($this->owner)->get("/returns/{$this->return->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->component('Returns/Show')
                ->has('returnCase.id')
            );
    }

    public function test_shipments_calendar_has_month_and_pending(): void
    {
        $this->actingAs($this->owner)->get('/shipments/calendar')
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->component('Shipments/Calendar')
                ->has('month')
                ->has('shipments')
                ->has('pending')
            );
    }

    // ─── Settings / Admin ─────────────────────────────────────────────

    public function test_settings_index_redirects_to_company(): void
    {
        $this->actingAs($this->owner)->get('/settings')
            ->assertRedirect(route('settings.company'));
    }

    public function test_settings_company_has_settings_prop(): void
    {
        $this->actingAs($this->owner)->get('/settings/company')
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->component('Settings/Company')
                ->has('settings')
            );
    }

    public function test_settings_integrations_has_tally_summary(): void
    {
        $this->actingAs($this->owner)->get('/settings/integrations')
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->component('Settings/Integrations')
                ->has('tally')
                ->has('tally_logs')
                ->has('tally_last_synced')
            );
    }

    public function test_audit_logs_index_has_rows(): void
    {
        $this->actingAs($this->owner)->get('/audit-logs')
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->component('AuditLogs/Index')
                ->has('rows')
            );
    }

    public function test_users_index_renders_for_owner(): void
    {
        $this->actingAs($this->owner)->get('/users')
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p->component('Users/Index'));
    }

    public function test_users_create_renders_for_owner(): void
    {
        $this->actingAs($this->owner)->get('/users/create')
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p->component('Users/Create'));
    }

    public function test_users_edit_renders_for_owner(): void
    {
        $other = User::factory()->create(['role' => 'manager']);
        $this->actingAs($this->owner)->get("/users/{$other->id}/edit")
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->component('Users/Edit')
                ->has('user.id')
            );
    }

    public function test_users_index_forbidden_for_non_owner(): void
    {
        $manager = User::factory()->create(['role' => 'manager']);
        $this->actingAs($manager)->get('/users')->assertForbidden();
    }

    // ─── Public tracking page ─────────────────────────────────────────

    public function test_public_tracking_page_renders_without_auth(): void
    {
        // Order::booting() back-fills tracking_uuid.
        $this->get("/track/{$this->order->tracking_uuid}")
            ->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->component('Tracking/Show')
                ->has('order')
                ->has('company.name')
            );
    }

    public function test_public_tracking_unknown_uuid_404s(): void
    {
        $this->get('/track/00000000-0000-0000-0000-000000000000')
            ->assertNotFound();
    }
}
