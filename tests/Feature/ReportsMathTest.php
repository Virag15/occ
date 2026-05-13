<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Order;
use App\Models\Payment;
use App\Models\ReturnCase;
use App\Models\Shipment;
use App\Models\Transporter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Reports page math — the bit where wrong numbers cost real money.
 * Brand mix shares, aging buckets, top-customer ranking, SLA averages,
 * KPI sums. Edge cases: cancelled orders, missing brands, partial
 * payments, multi-brand split, inverted date ranges.
 */
class ReportsMathTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();
        $this->owner = User::factory()->create(['role' => 'owner']);
    }

    private function customer(string $name = 'Acme'): Customer
    {
        return Customer::create([
            'tally_id' => 'C-'.uniqid(), 'name' => $name, 'status' => 'active',
        ]);
    }

    private function order(Customer $c, array $a = []): Order
    {
        return Order::create(array_merge([
            'order_code' => 'ORD-R-'.uniqid(), 'customer_id' => $c->id,
            'order_date' => '2026-05-12', 'status' => 'new_order', 'priority' => 'normal',
            'payment_status' => 'not_due', 'order_value' => 1000,
        ], $a));
    }

    /**
     * Hit /reports and return the Inertia `props` array. Pulls them out
     * of the rendered HTML's data-page payload — that's where Inertia
     * embeds the JSON for the initial page load.
     */
    private function reports(array $query = []): array
    {
        $response = $this->actingAs($this->owner)
            ->get('/reports?'.http_build_query($query));
        $response->assertOk();

        return $response->viewData('page')['props'] ?? [];
    }

    // ─── Range KPIs ───────────────────────────────────────────────────

    public function test_kpis_count_and_value_within_range(): void
    {
        $c = $this->customer();
        $this->order($c, ['order_date' => '2026-05-10', 'order_value' => 100]);
        $this->order($c, ['order_date' => '2026-05-11', 'order_value' => 200]);
        $this->order($c, ['order_date' => '2026-05-12', 'order_value' => 400]);

        $kpis = $this->reports(['from' => '2026-05-11', 'to' => '2026-05-12'])['kpis'];

        $this->assertSame(2, $kpis['orders_count']);
        $this->assertEqualsWithDelta(600.0, (float) $kpis['orders_value'], 0.01);
    }

    public function test_kpis_exclude_cancelled_orders(): void
    {
        $c = $this->customer();
        $this->order($c, ['order_value' => 100, 'status' => 'cancelled']);
        $this->order($c, ['order_value' => 500]);

        $r = $this->reports(['from' => '2026-05-12', 'to' => '2026-05-12'])['kpis'];

        $this->assertSame(1, $r['orders_count']);
        $this->assertEqualsWithDelta(500.0, (float) $r['orders_value'], 0.01);
    }

    public function test_inverted_date_range_is_silently_swapped(): void
    {
        $c = $this->customer();
        $this->order($c, ['order_date' => '2026-05-12', 'order_value' => 250]);

        $r = $this->reports(['from' => '2026-05-15', 'to' => '2026-05-10'])['kpis'];

        $this->assertSame(1, $r['orders_count']);
        $this->assertEqualsWithDelta(250.0, (float) $r['orders_value'], 0.01);
    }

    public function test_payments_kpi_sums_only_payments_in_range(): void
    {
        $c = $this->customer();
        $o = $this->order($c);
        Payment::create(['order_id' => $o->id, 'paid_on' => '2026-05-09', 'amount' => 100, 'mode' => 'upi']);
        Payment::create(['order_id' => $o->id, 'paid_on' => '2026-05-12', 'amount' => 300, 'mode' => 'upi']);
        Payment::create(['order_id' => $o->id, 'paid_on' => '2026-05-15', 'amount' => 500, 'mode' => 'upi']);

        $r = $this->reports(['from' => '2026-05-10', 'to' => '2026-05-12'])['kpis'];

        $this->assertEqualsWithDelta(300.0, (float) $r['payments_received'], 0.01);
    }

    // ─── Brand mix ────────────────────────────────────────────────────

    public function test_brand_mix_splits_multi_brand_order_evenly(): void
    {
        $c = $this->customer();
        $this->order($c, ['brands' => ['Schneider', 'Legrand'], 'order_value' => 1000]);

        $r = $this->reports(['from' => '2026-05-12', 'to' => '2026-05-12'])['brand_mix'];

        $rows = collect($r)->keyBy('brand');
        $this->assertEqualsWithDelta(500.0, (float) $rows['Schneider']['value'], 0.01);
        $this->assertEqualsWithDelta(500.0, (float) $rows['Legrand']['value'], 0.01);
    }

    public function test_brand_mix_aggregates_across_orders(): void
    {
        $c = $this->customer();
        $this->order($c, ['brands' => ['Schneider'], 'order_value' => 300]);
        $this->order($c, ['brands' => ['Schneider', 'ABB'], 'order_value' => 600]); // 300 + 300
        $this->order($c, ['brands' => ['ABB'], 'order_value' => 100]);

        $r = $this->reports(['from' => '2026-05-12', 'to' => '2026-05-12'])['brand_mix'];

        $rows = collect($r)->keyBy('brand');
        $this->assertEqualsWithDelta(600.0, (float) $rows['Schneider']['value'], 0.01);
        $this->assertEqualsWithDelta(400.0, (float) $rows['ABB']['value'], 0.01);
        $this->assertSame('Schneider', $r[0]['brand'], 'brands sorted by value desc');
    }

    public function test_brand_mix_skips_orders_with_null_or_empty_brands(): void
    {
        $c = $this->customer();
        $this->order($c, ['brands' => null, 'order_value' => 500]);
        $this->order($c, ['brands' => [], 'order_value' => 500]);
        $this->order($c, ['brands' => ['Schneider'], 'order_value' => 200]);

        $r = $this->reports(['from' => '2026-05-12', 'to' => '2026-05-12'])['brand_mix'];

        $this->assertCount(1, $r);
        $this->assertSame('Schneider', $r[0]['brand']);
        $this->assertEqualsWithDelta(200.0, (float) $r[0]['value'], 0.01);
    }

    public function test_brand_mix_excludes_cancelled_orders(): void
    {
        $c = $this->customer();
        $this->order($c, ['brands' => ['Schneider'], 'order_value' => 1000, 'status' => 'cancelled']);
        $this->order($c, ['brands' => ['Schneider'], 'order_value' => 300]);

        $r = $this->reports(['from' => '2026-05-12', 'to' => '2026-05-12'])['brand_mix'];

        $this->assertEqualsWithDelta(300.0, (float) $r[0]['value'], 0.01);
    }

    // ─── Aging buckets ────────────────────────────────────────────────

    public function test_aging_buckets_assign_orders_to_correct_band(): void
    {
        $c = $this->customer();
        // today = 2026-05-13; due dates back-walked from there
        $this->order($c, [
            'order_value' => 1000, 'amount_received' => 0, 'payment_status' => 'pending',
            'payment_due_date' => now()->subDays(10)->toDateString(),
        ]);
        $this->order($c, [
            'order_value' => 2000, 'amount_received' => 500, 'payment_status' => 'partial',
            'payment_due_date' => now()->subDays(45)->toDateString(),
        ]);
        $this->order($c, [
            'order_value' => 3000, 'amount_received' => 0, 'payment_status' => 'overdue',
            'payment_due_date' => now()->subDays(75)->toDateString(),
        ]);
        $this->order($c, [
            'order_value' => 5000, 'amount_received' => 0, 'payment_status' => 'overdue',
            'payment_due_date' => now()->subDays(120)->toDateString(),
        ]);

        $aging = $this->reports()['aging'];
        $byLabel = collect($aging)->keyBy('label');

        $this->assertSame(1, $byLabel['1–30 days']['count']);
        $this->assertEqualsWithDelta(1000.0, (float) $byLabel['1–30 days']['value'], 0.01);

        $this->assertSame(1, $byLabel['31–60 days']['count']);
        $this->assertEqualsWithDelta(1500.0, (float) $byLabel['31–60 days']['value'], 0.01, 'partial: 2000-500');

        $this->assertSame(1, $byLabel['61–90 days']['count']);
        $this->assertEqualsWithDelta(3000.0, (float) $byLabel['61–90 days']['value'], 0.01);

        $this->assertSame(1, $byLabel['90+ days']['count']);
        $this->assertEqualsWithDelta(5000.0, (float) $byLabel['90+ days']['value'], 0.01);
    }

    public function test_aging_ignores_not_yet_due_orders(): void
    {
        $c = $this->customer();
        $this->order($c, [
            'order_value' => 1000, 'payment_status' => 'pending',
            'payment_due_date' => now()->addDays(5)->toDateString(),
        ]);

        $aging = $this->reports()['aging'];
        $totalCount = array_sum(array_column($aging, 'count'));
        $this->assertSame(0, $totalCount);
    }

    public function test_aging_ignores_paid_orders(): void
    {
        $c = $this->customer();
        $this->order($c, [
            'order_value' => 1000, 'amount_received' => 1000, 'payment_status' => 'paid',
            'payment_due_date' => now()->subDays(30)->toDateString(),
        ]);

        $aging = $this->reports()['aging'];
        $totalCount = array_sum(array_column($aging, 'count'));
        $this->assertSame(0, $totalCount);
    }

    public function test_aging_outstanding_never_negative(): void
    {
        // Overpaid edge: amount_received > order_value should clamp to 0.
        $c = $this->customer();
        $this->order($c, [
            'order_value' => 1000, 'amount_received' => 1500, 'payment_status' => 'pending',
            'payment_due_date' => now()->subDays(10)->toDateString(),
        ]);

        $aging = $this->reports()['aging'];
        foreach ($aging as $b) {
            $this->assertGreaterThanOrEqual(0, (float) $b['value']);
        }
    }

    // ─── Top customers ────────────────────────────────────────────────

    public function test_top_customers_sorted_by_revenue_desc(): void
    {
        $a = $this->customer('Alpha');
        $b = $this->customer('Bravo');
        $this->order($a, ['order_value' => 100]);
        $this->order($a, ['order_value' => 100]);
        $this->order($b, ['order_value' => 500]);

        $top = $this->reports(['from' => '2026-05-12', 'to' => '2026-05-12'])['top_customers'];

        $this->assertSame('Bravo', $top[0]['name']);
        $this->assertEqualsWithDelta(500.0, (float) $top[0]['revenue'], 0.01);
        $this->assertSame('Alpha', $top[1]['name']);
        $this->assertEqualsWithDelta(200.0, (float) $top[1]['revenue'], 0.01);
        $this->assertSame(2, (int) $top[1]['orders']);
    }

    public function test_top_customers_excludes_cancelled(): void
    {
        $c = $this->customer('Solo');
        $this->order($c, ['order_value' => 1000, 'status' => 'cancelled']);
        $this->order($c, ['order_value' => 100]);

        $top = $this->reports(['from' => '2026-05-12', 'to' => '2026-05-12'])['top_customers'];

        $this->assertCount(1, $top);
        $this->assertEqualsWithDelta(100.0, (float) $top[0]['revenue'], 0.01);
    }

    // ─── Dispatch SLA ─────────────────────────────────────────────────

    public function test_sla_groups_by_transporter_and_averages_dispatch_days(): void
    {
        $c = $this->customer();
        $t = Transporter::create(['transporter_code' => 'T-S', 'name' => 'SLA-Express', 'status' => 'active']);

        // Order placed 2026-05-01, dispatched 2026-05-03 → 2 days
        $o1 = $this->order($c, ['order_date' => '2026-05-01']);
        Shipment::create([
            'shipment_code' => 'SHP-S-1', 'order_id' => $o1->id, 'transporter_id' => $t->id,
            'status' => 'dispatched', 'created_by' => null,
            'dispatch_date' => '2026-05-03', 'delivered_date' => '2026-05-07',
        ]);
        // Order placed 2026-05-05, dispatched 2026-05-09 → 4 days, delivered 2026-05-11 → 2 days transit
        $o2 = $this->order($c, ['order_date' => '2026-05-05']);
        Shipment::create([
            'shipment_code' => 'SHP-S-2', 'order_id' => $o2->id, 'transporter_id' => $t->id,
            'status' => 'delivered', 'created_by' => null,
            'dispatch_date' => '2026-05-09', 'delivered_date' => '2026-05-11',
        ]);

        $sla = $this->reports(['from' => '2026-05-01', 'to' => '2026-05-15'])['dispatch_sla'];

        $row = collect($sla)->firstWhere('transporter_name', 'SLA-Express');
        $this->assertNotNull($row);
        $this->assertSame(2, (int) $row->shipments);
        $this->assertEqualsWithDelta(3.0, (float) $row->avg_dispatch_days, 0.01, 'avg of 2 and 4 days');
        $this->assertEqualsWithDelta(3.0, (float) $row->avg_transit_days, 0.01, 'avg of 4 and 2 days');
    }

    public function test_sla_bucket_for_unassigned_transporter(): void
    {
        $c = $this->customer();
        $o = $this->order($c, ['order_date' => '2026-05-01']);
        Shipment::create([
            'shipment_code' => 'SHP-S-U', 'order_id' => $o->id, 'transporter_id' => null,
            'status' => 'dispatched', 'created_by' => null,
            'dispatch_date' => '2026-05-04',
        ]);

        $sla = $this->reports(['from' => '2026-05-01', 'to' => '2026-05-15'])['dispatch_sla'];
        $row = collect($sla)->firstWhere('transporter_name', 'Unassigned');

        $this->assertNotNull($row);
        $this->assertSame(1, (int) $row->shipments);
        $this->assertEqualsWithDelta(3.0, (float) $row->avg_dispatch_days, 0.01);
    }

    public function test_sla_ignores_shipments_without_dispatch_date(): void
    {
        $c = $this->customer();
        $o = $this->order($c);
        Shipment::create([
            'shipment_code' => 'SHP-S-P', 'order_id' => $o->id, 'transporter_id' => null,
            'status' => 'planning', 'created_by' => null,
            // no dispatch_date
        ]);

        $sla = $this->reports(['from' => '2026-05-01', 'to' => '2026-05-31'])['dispatch_sla'];
        $this->assertEmpty($sla);
    }

    // ─── Action items ─────────────────────────────────────────────────

    public function test_action_items_returns_pending_lr_pod_triplicate_and_open_returns(): void
    {
        $c = $this->customer();
        $oLr = $this->order($c, ['lr_shared_with_customer' => false]);
        Shipment::create([
            'shipment_code' => 'SHP-A-LR', 'order_id' => $oLr->id, 'transporter_id' => null,
            'status' => 'dispatched', 'created_by' => null,
            'lr_number' => 'LR-123',
        ]);
        $oPod = $this->order($c, ['status' => 'dispatched', 'pod_received' => false]);
        $oTri = $this->order($c, ['status' => 'delivered', 'triplicate_received' => false]);
        ReturnCase::create([
            'case_code' => 'RET-A-1', 'related_order_id' => $oPod->id, 'customer_id' => $c->id,
            'date_reported' => '2026-05-12', 'case_status' => 'under_inspection',
        ]);

        $ai = $this->reports()['action_items'];

        $this->assertSame(1, $ai['lr_pending']);
        $this->assertSame(1, $ai['pod_pending']);
        $this->assertSame(1, $ai['triplicate_pending']);
        $this->assertSame(1, $ai['returns_open']);
    }
}
