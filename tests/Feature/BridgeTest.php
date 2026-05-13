<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\TallyOperation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Exercises the cloud-OCC ↔ local-Tally bridge added in commit 4f77923.
 * This is the freshest, most architecturally complex piece — needs deep
 * coverage so we don't ship lease bugs to a remote agent that runs
 * unattended for weeks.
 */
class BridgeTest extends TestCase
{
    use RefreshDatabase;

    private const TOKEN = 'test-agent-token-secret-1234567890';

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.bridge.agent_token' => self::TOKEN]);
    }

    private function order(array $overrides = []): Order
    {
        $c = Customer::create(['tally_id' => 'C-'.uniqid(), 'name' => 'Acme', 'status' => 'active']);
        $o = Order::create(array_merge([
            'order_code' => 'ORD-B-'.uniqid(), 'customer_id' => $c->id, 'order_date' => '2026-05-12',
            'status' => 'new_order', 'priority' => 'normal', 'payment_status' => 'not_due', 'order_value' => 1000,
        ], $overrides));
        OrderItem::create([
            'order_id' => $o->id, 'product_name' => 'Widget', 'qty_ordered' => 10,
            'unit_price' => 100, 'tax_rate' => 18, 'line_total' => 1180, 'status' => 'pending',
        ]);

        return $o;
    }

    // ─── Observer mode-switch ────────────────────────────────────────

    public function test_order_observer_enqueues_in_queue_mode(): void
    {
        config(['services.bridge.mode' => 'queue']);
        $order = $this->order();

        $order->update(['status' => 'delivered']);

        $this->assertSame(1, TallyOperation::count());
        $op = TallyOperation::first();
        $this->assertSame(TallyOperation::OP_PUSH_SALES_VOUCHER, $op->operation);
        $this->assertSame('order', $op->related_type);
        $this->assertSame($order->id, $op->related_id);
        $this->assertSame(TallyOperation::STATUS_PENDING, $op->status);
        $this->assertSame('Acme', $op->payload['customer_name']);
        $this->assertCount(1, $op->payload['line_items']);
        $this->assertEqualsWithDelta(10.0, $op->payload['line_items'][0]['qty'], 0.001);
    }

    public function test_order_observer_does_not_enqueue_in_direct_mode(): void
    {
        config(['services.bridge.mode' => 'direct', 'services.tally.enabled' => false]);
        $order = $this->order();

        $order->update(['status' => 'delivered']);

        // direct mode goes through TallySyncService, which writes to tally_sync_logs
        // but not to tally_operations.
        $this->assertSame(0, TallyOperation::count());
    }

    public function test_payment_observer_enqueues_receipt_in_queue_mode(): void
    {
        config(['services.bridge.mode' => 'queue']);
        $order = $this->order();

        Payment::create([
            'order_id' => $order->id, 'paid_on' => '2026-05-12', 'amount' => 500,
            'mode' => 'upi', 'reference' => 'UTR-X',
        ]);

        $op = TallyOperation::where('operation', TallyOperation::OP_PUSH_RECEIPT)->first();
        $this->assertNotNull($op);
        $this->assertEquals(500, $op->payload['amount']);
        $this->assertSame('UTR-X', $op->payload['reference']);
    }

    public function test_observer_does_not_enqueue_when_already_pushed(): void
    {
        config(['services.bridge.mode' => 'queue']);
        $order = $this->order(['tally_voucher_id' => 'TLY-EXISTING']);

        $order->update(['status' => 'delivered']);

        $this->assertSame(0, TallyOperation::count(), 'should not double-push');
    }

    // ─── API endpoints ───────────────────────────────────────────────

    public function test_api_rejects_missing_token(): void
    {
        $this->postJson('/api/bridge/claim')->assertUnauthorized();
        $this->getJson('/api/bridge/ping')->assertUnauthorized();
    }

    public function test_api_rejects_wrong_token(): void
    {
        $this->withHeaders(['Authorization' => 'Bearer wrong-token'])
            ->getJson('/api/bridge/ping')
            ->assertUnauthorized();
    }

    public function test_api_ping_accepts_correct_token(): void
    {
        $this->withHeaders(['Authorization' => 'Bearer '.self::TOKEN])
            ->getJson('/api/bridge/ping')
            ->assertOk()
            ->assertJson(['ok' => true]);
    }

    public function test_claim_marks_pending_rows_as_claimed_with_lease(): void
    {
        config(['services.bridge.mode' => 'queue']);
        $this->order()->update(['status' => 'delivered']);
        $this->order()->update(['status' => 'closed']);

        $response = $this->withHeaders(['Authorization' => 'Bearer '.self::TOKEN])
            ->postJson('/api/bridge/claim', ['max' => 10])
            ->assertOk();

        $ops = $response->json('operations');
        $this->assertCount(2, $ops);
        $rows = TallyOperation::all();
        foreach ($rows as $r) {
            $this->assertSame(TallyOperation::STATUS_CLAIMED, $r->status);
            $this->assertNotNull($r->claimed_at);
            $this->assertNotNull($r->lease_expires_at);
            $this->assertTrue($r->lease_expires_at->isFuture());
            $this->assertSame(1, $r->attempts);
        }
    }

    public function test_claim_respects_max_parameter(): void
    {
        config(['services.bridge.mode' => 'queue']);
        for ($i = 0; $i < 5; $i++) {
            $this->order()->update(['status' => 'delivered']);
        }

        $response = $this->withHeaders(['Authorization' => 'Bearer '.self::TOKEN])
            ->postJson('/api/bridge/claim', ['max' => 2])
            ->assertOk();

        $this->assertCount(2, $response->json('operations'));
        $this->assertSame(3, TallyOperation::where('status', TallyOperation::STATUS_PENDING)->count());
    }

    public function test_claim_reclaims_expired_leases(): void
    {
        config(['services.bridge.mode' => 'queue']);
        $this->order()->update(['status' => 'delivered']);

        // Simulate a stuck agent: claimed past its lease.
        $op = TallyOperation::first();
        $op->update([
            'status' => TallyOperation::STATUS_CLAIMED,
            'claimed_by' => 'stuck-agent',
            'claimed_at' => now()->subMinutes(20),
            'lease_expires_at' => now()->subMinutes(15),
            'attempts' => 1,
        ]);

        // A fresh agent claims — should pick this row back up.
        $response = $this->withHeaders(['Authorization' => 'Bearer '.self::TOKEN])
            ->postJson('/api/bridge/claim', ['max' => 5])
            ->assertOk();

        $this->assertCount(1, $response->json('operations'));
        $this->assertSame($op->id, $response->json('operations.0.id'));
        $this->assertSame(2, $op->fresh()->attempts);
    }

    public function test_claim_skips_done_and_failed_rows(): void
    {
        TallyOperation::create([
            'operation' => 'push_customer', 'payload' => ['x' => 1],
            'status' => TallyOperation::STATUS_DONE,
        ]);
        TallyOperation::create([
            'operation' => 'push_customer', 'payload' => ['x' => 2],
            'status' => TallyOperation::STATUS_FAILED,
        ]);

        $response = $this->withHeaders(['Authorization' => 'Bearer '.self::TOKEN])
            ->postJson('/api/bridge/claim', ['max' => 10])
            ->assertOk();

        $this->assertEmpty($response->json('operations'));
    }

    public function test_complete_stamps_tally_voucher_id_on_order(): void
    {
        config(['services.bridge.mode' => 'queue']);
        $order = $this->order();
        $order->update(['status' => 'delivered']);
        $op = TallyOperation::first();
        $op->update([
            'status' => TallyOperation::STATUS_CLAIMED,
            'claimed_at' => now(),
            'lease_expires_at' => now()->addMinutes(5),
        ]);

        $this->withHeaders(['Authorization' => 'Bearer '.self::TOKEN])
            ->postJson("/api/bridge/complete/{$op->id}", [
                'result' => ['tally_id' => 'TLY-VCH-789'],
            ])
            ->assertOk();

        $op->refresh();
        $this->assertSame(TallyOperation::STATUS_DONE, $op->status);
        $this->assertNotNull($op->completed_at);

        $order->refresh();
        $this->assertSame('TLY-VCH-789', $order->tally_voucher_id);
        $this->assertNotNull($order->tally_pushed_at);
    }

    public function test_complete_stamps_tally_voucher_id_on_payment(): void
    {
        config(['services.bridge.mode' => 'queue']);
        $order = $this->order();
        $payment = Payment::create([
            'order_id' => $order->id, 'paid_on' => '2026-05-12', 'amount' => 100, 'mode' => 'upi',
        ]);
        $op = TallyOperation::where('operation', TallyOperation::OP_PUSH_RECEIPT)->first();
        $op->update([
            'status' => TallyOperation::STATUS_CLAIMED,
            'lease_expires_at' => now()->addMinutes(5),
        ]);

        $this->withHeaders(['Authorization' => 'Bearer '.self::TOKEN])
            ->postJson("/api/bridge/complete/{$op->id}", [
                'result' => ['voucher_id' => 'TLY-RCP-12'],
            ])
            ->assertOk();

        $payment->refresh();
        $this->assertSame('TLY-RCP-12', $payment->tally_voucher_id);
    }

    public function test_fail_marks_row_failed_with_error(): void
    {
        $op = TallyOperation::create([
            'operation' => 'push_customer', 'payload' => [],
            'status' => TallyOperation::STATUS_CLAIMED,
            'lease_expires_at' => now()->addMinutes(5),
        ]);

        $this->withHeaders(['Authorization' => 'Bearer '.self::TOKEN])
            ->postJson("/api/bridge/fail/{$op->id}", ['error' => 'Tally timeout'])
            ->assertOk();

        $op->refresh();
        $this->assertSame(TallyOperation::STATUS_FAILED, $op->status);
        $this->assertSame('Tally timeout', $op->error_message);
        $this->assertNotNull($op->completed_at);
    }

    public function test_bridge_agent_command_bails_when_not_enabled(): void
    {
        config(['services.bridge.agent_enabled' => false]);

        $this->artisan('bridge:agent')
            ->expectsOutputToContain('BRIDGE_AGENT is not enabled')
            ->assertFailed();
    }

    public function test_bridge_agent_command_bails_when_remote_url_missing(): void
    {
        config([
            'services.bridge.agent_enabled' => true,
            'services.bridge.remote_url' => '',
            'services.bridge.agent_token' => 'something',
        ]);

        $this->artisan('bridge:agent')
            ->expectsOutputToContain('BRIDGE_REMOTE_URL and BRIDGE_AGENT_TOKEN must be set')
            ->assertFailed();
    }

    public function test_bridge_agent_command_bails_on_plaintext_http_remote(): void
    {
        config([
            'services.bridge.agent_enabled' => true,
            'services.bridge.remote_url' => 'http://occ.example.com',
            'services.bridge.agent_token' => 'something',
        ]);

        $this->artisan('bridge:agent')
            ->expectsOutputToContain('must use https://')
            ->assertFailed();
    }

    public function test_bridge_agent_command_allows_localhost_http(): void
    {
        config([
            'services.bridge.agent_enabled' => true,
            'services.bridge.remote_url' => 'http://127.0.0.1:8000',
            'services.bridge.agent_token' => 'something',
        ]);

        // The command will try to poll and fail at the HTTP call, but it
        // should at least get past the URL guard. We assert it does NOT
        // emit the "must use https://" error.
        $this->artisan('bridge:agent', ['--max' => 1])
            ->doesntExpectOutputToContain('must use https://');
    }

    // ─── Lease guards on complete / fail ─────────────────────────────

    public function test_complete_rejects_op_that_is_not_claimed(): void
    {
        $op = TallyOperation::create([
            'operation' => 'push_customer', 'payload' => ['x' => 1],
            'status' => TallyOperation::STATUS_PENDING,
        ]);

        $this->withHeaders(['Authorization' => 'Bearer '.self::TOKEN])
            ->postJson("/api/bridge/complete/{$op->id}", ['result' => ['tally_id' => 'X']])
            ->assertStatus(409);

        $this->assertSame(TallyOperation::STATUS_PENDING, $op->fresh()->status);
    }

    public function test_complete_rejects_op_with_expired_lease(): void
    {
        $op = TallyOperation::create([
            'operation' => 'push_customer', 'payload' => [],
            'status' => TallyOperation::STATUS_CLAIMED,
            'lease_expires_at' => now()->subMinutes(1),
        ]);

        $this->withHeaders(['Authorization' => 'Bearer '.self::TOKEN])
            ->postJson("/api/bridge/complete/{$op->id}", ['result' => ['tally_id' => 'X']])
            ->assertStatus(409);
    }

    public function test_complete_rejects_already_done_op_preventing_replay(): void
    {
        // Most important: a replayed `complete` must not overwrite the
        // voucher_id of an order that was already stamped.
        $op = TallyOperation::create([
            'operation' => 'push_sales_voucher', 'payload' => [],
            'status' => TallyOperation::STATUS_DONE,
            'result' => ['tally_id' => 'TLY-ORIGINAL'],
            'completed_at' => now()->subMinute(),
        ]);

        $this->withHeaders(['Authorization' => 'Bearer '.self::TOKEN])
            ->postJson("/api/bridge/complete/{$op->id}", ['result' => ['tally_id' => 'TLY-REPLAY']])
            ->assertStatus(409);

        $this->assertSame('TLY-ORIGINAL', $op->fresh()->result['tally_id']);
    }

    public function test_complete_validates_result_field_lengths(): void
    {
        $op = TallyOperation::create([
            'operation' => 'push_sales_voucher', 'payload' => [],
            'status' => TallyOperation::STATUS_CLAIMED,
            'lease_expires_at' => now()->addMinutes(5),
        ]);

        $this->withHeaders(['Authorization' => 'Bearer '.self::TOKEN])
            ->postJson("/api/bridge/complete/{$op->id}", [
                'result' => ['tally_id' => str_repeat('X', 200)],
            ])
            ->assertStatus(422);
    }

    public function test_bridge_zip_download_sets_no_store_cache_header(): void
    {
        // The zip contains .bat scripts the operator fills with the bridge
        // token — a cached copy on a CDN would leak.
        $owner = User::factory()->create(['role' => 'owner']);
        $response = $this->actingAs($owner)
            ->get(route('settings.tally.download-bridge'));

        $response->assertOk();
        $this->assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
    }

    public function test_fail_rejects_op_with_expired_lease(): void
    {
        $op = TallyOperation::create([
            'operation' => 'push_customer', 'payload' => [],
            'status' => TallyOperation::STATUS_CLAIMED,
            'lease_expires_at' => now()->subSeconds(1),
        ]);

        $this->withHeaders(['Authorization' => 'Bearer '.self::TOKEN])
            ->postJson("/api/bridge/fail/{$op->id}", ['error' => 'should not apply'])
            ->assertStatus(409);

        $this->assertSame(TallyOperation::STATUS_CLAIMED, $op->fresh()->status);
    }
}
