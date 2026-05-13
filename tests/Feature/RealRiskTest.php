<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\TallyOperation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Real risks — things that broke in past projects on live data and
 * would silently break here too if nobody guarded against them.
 * Specifically: concurrent bridge claims, special-character round-trips,
 * absurd numeric values, missing-field edge cases.
 *
 * These aren't unit tests of one function — they're integration probes
 * for the messy reality of production data.
 */
class RealRiskTest extends TestCase
{
    use RefreshDatabase;

    private const TOKEN = 'real-risk-token-1234567890abcdef';

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.bridge.agent_token' => self::TOKEN]);
        $this->owner = User::factory()->create(['role' => 'owner']);
    }

    private function customer(array $a = []): Customer
    {
        return Customer::create(array_merge([
            'tally_id' => 'C-RR-'.uniqid(), 'name' => 'Acme', 'status' => 'active',
        ], $a));
    }

    private function order(Customer $c, array $a = []): Order
    {
        return Order::create(array_merge([
            'order_code' => 'ORD-RR-'.uniqid(), 'customer_id' => $c->id,
            'order_date' => '2026-05-12', 'status' => 'new_order', 'priority' => 'normal',
            'payment_status' => 'not_due', 'order_value' => 1000,
        ], $a));
    }

    // ─── Concurrent bridge claims ────────────────────────────────────

    public function test_two_sequential_claims_do_not_double_pick_same_row(): void
    {
        // Simulates two agents claiming in quick succession: agent A claims,
        // agent B claims a moment later. B must not see the rows A took
        // while A's lease is still valid.
        config(['services.bridge.mode' => 'queue']);
        $this->order($this->customer())->update(['status' => 'delivered']);
        $this->order($this->customer())->update(['status' => 'delivered']);

        $a = $this->withHeaders(['Authorization' => 'Bearer '.self::TOKEN])
            ->postJson('/api/bridge/claim', ['max' => 1])
            ->json('operations');
        $b = $this->withHeaders(['Authorization' => 'Bearer '.self::TOKEN])
            ->postJson('/api/bridge/claim', ['max' => 5])
            ->json('operations');

        $this->assertCount(1, $a);
        $this->assertCount(1, $b);
        $this->assertNotSame($a[0]['id'], $b[0]['id'], 'lease must prevent double-pickup');
    }

    public function test_third_claim_after_two_agents_have_taken_everything_returns_empty(): void
    {
        config(['services.bridge.mode' => 'queue']);
        $this->order($this->customer())->update(['status' => 'delivered']);

        $this->withHeaders(['Authorization' => 'Bearer '.self::TOKEN])
            ->postJson('/api/bridge/claim', ['max' => 10])
            ->assertJsonCount(1, 'operations');
        $this->withHeaders(['Authorization' => 'Bearer '.self::TOKEN])
            ->postJson('/api/bridge/claim', ['max' => 10])
            ->assertJsonCount(0, 'operations');
    }

    public function test_completing_one_op_does_not_release_lease_on_siblings(): void
    {
        config(['services.bridge.mode' => 'queue']);
        $this->order($this->customer())->update(['status' => 'delivered']);
        $this->order($this->customer())->update(['status' => 'delivered']);

        $claim = $this->withHeaders(['Authorization' => 'Bearer '.self::TOKEN])
            ->postJson('/api/bridge/claim', ['max' => 10])
            ->json('operations');

        $this->assertCount(2, $claim);
        $firstId = $claim[0]['id'];

        // Complete one; the other should still be claimed (not pending)
        $this->withHeaders(['Authorization' => 'Bearer '.self::TOKEN])
            ->postJson("/api/bridge/complete/{$firstId}", ['result' => ['tally_id' => 'TLY-X']])
            ->assertOk();

        $stillClaimed = TallyOperation::where('status', TallyOperation::STATUS_CLAIMED)->count();
        $this->assertSame(1, $stillClaimed);

        $next = $this->withHeaders(['Authorization' => 'Bearer '.self::TOKEN])
            ->postJson('/api/bridge/claim', ['max' => 10])
            ->json('operations');
        $this->assertCount(0, $next, 'no pending rows left, sibling is still leased');
    }

    // ─── Special characters round-trip ──────────────────────────────

    public function test_customer_name_with_quotes_and_ampersand_survives_persistence(): void
    {
        // The real world has "M/s. Joshi & Sons (Nashik)", customer names
        // with curly quotes, em-dashes, and odd whitespace. None of these
        // should crash JSON-encoding for the bridge payload.
        $c = $this->customer(['name' => 'M/s. Joshi & Sons "Nashik"  —  GC Co.']);
        config(['services.bridge.mode' => 'queue']);
        $order = $this->order($c, ['invoice_number' => 'INV-Q&A']);
        OrderItem::create([
            'order_id' => $order->id, 'product_name' => 'MCB "32A" — Sch&ider',
            'qty_ordered' => 5, 'unit_price' => 100, 'tax_rate' => 18,
            'line_total' => 590, 'status' => 'pending',
        ]);

        $order->update(['status' => 'delivered']);

        $op = TallyOperation::first();
        $this->assertNotNull($op);
        $this->assertSame('M/s. Joshi & Sons "Nashik"  —  GC Co.', $op->payload['customer_name']);
        $this->assertSame('MCB "32A" — Sch&ider', $op->payload['line_items'][0]['name']);
    }

    public function test_unicode_customer_name_in_invoice_pdf(): void
    {
        $c = $this->customer(['name' => 'गणेश एंटरप्राइजेज', 'company' => 'गणेश Enterprises']);
        $o = $this->order($c, ['invoice_number' => 'INV-UNI-1']);
        OrderItem::create([
            'order_id' => $o->id, 'product_name' => 'विद्युत स्विच', 'qty_ordered' => 2,
            'unit_price' => 500, 'tax_rate' => 18, 'line_total' => 1180, 'status' => 'pending',
        ]);

        $this->actingAs($this->owner)
            ->get("/orders/{$o->id}/invoice.pdf")
            ->assertOk();
    }

    public function test_customer_name_with_newlines_and_tabs_is_normalised_or_persisted_safely(): void
    {
        // Pasted-from-Excel customer names sometimes have tabs/newlines.
        $c = $this->customer(['name' => "Line One\n\tLine Two"]);
        $this->assertSame("Line One\n\tLine Two", $c->fresh()->name);

        $o = $this->order($c);
        $this->actingAs($this->owner)
            ->get("/orders/{$o->id}/invoice.pdf")
            ->assertOk();
    }

    // ─── Numeric edge cases ─────────────────────────────────────────

    public function test_zero_value_order_does_not_break_invoice_pdf(): void
    {
        $o = $this->order($this->customer(), [
            'order_value' => 0, 'invoice_number' => 'INV-ZERO',
        ]);
        OrderItem::create([
            'order_id' => $o->id, 'product_name' => 'Free Sample', 'qty_ordered' => 1,
            'unit_price' => 0, 'tax_rate' => 0, 'line_total' => 0, 'status' => 'pending',
        ]);

        $this->actingAs($this->owner)
            ->get("/orders/{$o->id}/invoice.pdf")
            ->assertOk();
    }

    public function test_very_large_order_value_persists_with_correct_precision(): void
    {
        // ₹99,99,999.99 — large but legal for a B2B order
        $o = $this->order($this->customer(), ['order_value' => 9999999.99]);
        $this->assertEqualsWithDelta(9999999.99, (float) $o->fresh()->order_value, 0.01);
    }

    public function test_partial_payment_outstanding_calculation_with_decimals(): void
    {
        // Float precision: 1000 - 333.33 - 333.33 - 333.33 should leave ~0.01
        $o = $this->order($this->customer(), [
            'order_value' => 1000, 'payment_status' => 'partial',
            'amount_received' => 999.99,
            'payment_due_date' => now()->subDays(15)->toDateString(),
        ]);

        $aging = $this->actingAs($this->owner)
            ->get('/reports')
            ->viewData('page')['props']['aging'];

        $row = collect($aging)->firstWhere('label', '1–30 days');
        $this->assertSame(1, $row['count']);
        $this->assertEqualsWithDelta(0.01, (float) $row['value'], 0.001);
        $this->assertGreaterThan(0, (float) $row['value'], 'outstanding > 0 even when nearly paid');
        unset($o);
    }

    // ─── Missing-field edge cases ───────────────────────────────────

    public function test_order_without_items_still_enqueues_with_empty_line_items_array(): void
    {
        config(['services.bridge.mode' => 'queue']);
        $o = $this->order($this->customer());
        // no OrderItem rows
        $o->update(['status' => 'delivered']);

        $op = TallyOperation::first();
        $this->assertNotNull($op);
        $this->assertIsArray($op->payload['line_items']);
        $this->assertEmpty($op->payload['line_items']);
    }

    public function test_customer_with_no_address_renders_invoice_pdf(): void
    {
        $c = Customer::create([
            'tally_id' => 'C-NA', 'name' => 'No-Address Buyer', 'status' => 'active',
        ]);
        $o = $this->order($c);
        OrderItem::create([
            'order_id' => $o->id, 'product_name' => 'X', 'qty_ordered' => 1,
            'unit_price' => 100, 'tax_rate' => 18, 'line_total' => 118, 'status' => 'pending',
        ]);

        $this->actingAs($this->owner)
            ->get("/orders/{$o->id}/invoice.pdf")
            ->assertOk();
    }

    public function test_payment_without_reference_or_notes_enqueues_receipt(): void
    {
        config(['services.bridge.mode' => 'queue']);
        $o = $this->order($this->customer());

        Payment::create([
            'order_id' => $o->id, 'paid_on' => '2026-05-12', 'amount' => 100,
            'mode' => 'cash',
            // reference, notes intentionally omitted
        ]);

        $op = TallyOperation::where('operation', TallyOperation::OP_PUSH_RECEIPT)->first();
        $this->assertNotNull($op);
        $this->assertEquals(100, $op->payload['amount']);
    }

    public function test_product_with_no_brand_or_hsn_still_creatable(): void
    {
        $p = Product::create([
            'tally_id' => 'P-NB', 'sku' => 'SKU-NB', 'name' => 'No-brand item',
            'unit' => 'pcs', 'gst_rate' => 0, 'status' => 'active',
            // brand, hsn_code intentionally null
        ]);

        $this->assertNotNull($p->id);
        $this->assertNull($p->brand);
        $this->assertNull($p->hsn_code);
    }

    public function test_order_with_negative_amount_received_is_rejected_or_clamped(): void
    {
        // Defensive: amount_received should never be negative. If the
        // controller doesn't reject, the aging math must still produce a
        // non-negative outstanding. Either is acceptable; both crashing
        // the page is not.
        $o = $this->order($this->customer(), [
            'order_value' => 1000, 'amount_received' => -50, 'payment_status' => 'pending',
            'payment_due_date' => now()->subDays(10)->toDateString(),
        ]);

        $aging = $this->actingAs($this->owner)
            ->get('/reports')
            ->viewData('page')['props']['aging'];

        foreach ($aging as $bucket) {
            $this->assertGreaterThanOrEqual(0, (float) $bucket['value']);
        }
        unset($o);
    }

    public function test_order_dates_at_dst_boundary_resolve_consistently(): void
    {
        // India doesn't observe DST so this is mostly a sanity check that
        // we don't accidentally parse dates in a way that shifts them across
        // midnight. Create an order at 2026-03-29 (DST boundary in EU);
        // confirm the stored date and the report bucket agree.
        $o = $this->order($this->customer(), [
            'order_date' => '2026-03-29', 'order_value' => 500,
        ]);

        $kpis = $this->actingAs($this->owner)
            ->get('/reports?'.http_build_query(['from' => '2026-03-29', 'to' => '2026-03-29']))
            ->viewData('page')['props']['kpis'];

        $this->assertSame(1, $kpis['orders_count']);
        $this->assertEqualsWithDelta(500.0, (float) $kpis['orders_value'], 0.01);
        unset($o);
    }

    public function test_long_product_name_does_not_break_payload(): void
    {
        config(['services.bridge.mode' => 'queue']);
        $longName = str_repeat('Very-Long-Product-Name-Segment ', 20); // ~600 chars
        $o = $this->order($this->customer());
        OrderItem::create([
            'order_id' => $o->id, 'product_name' => $longName,
            'qty_ordered' => 1, 'unit_price' => 100, 'tax_rate' => 18,
            'line_total' => 118, 'status' => 'pending',
        ]);

        $o->update(['status' => 'delivered']);

        $op = TallyOperation::first();
        $this->assertNotNull($op);
        $this->assertSame($longName, $op->payload['line_items'][0]['name']);
    }
}
