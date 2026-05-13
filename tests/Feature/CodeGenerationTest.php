<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Order;
use App\Models\Shipment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Code generators (ORD-/SHP-/RET-) are protected by Cache::lock so that
 * concurrent inserts can't claim the same sequential number. This test
 * exercises the *correctness* of the locked path — we can't truly run
 * parallel requests in a single PHPUnit process, but we can verify:
 *
 *   1. Sequential creates always increment
 *   2. The year rolls into the code
 *   3. The format stays consistent across many creates
 *
 * Real concurrency is verified in production via the unique constraint —
 * if two requests race and the lock fails, the DB will reject the dupe.
 */
class CodeGenerationTest extends TestCase
{
    use RefreshDatabase;

    private Customer $customer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::factory()->create(['role' => 'manager']));
        $this->customer = Customer::create(['tally_id' => 'C', 'name' => 'X', 'status' => 'active']);
    }

    public function test_order_codes_increment_sequentially_within_the_year(): void
    {
        $codes = [];
        for ($i = 0; $i < 5; $i++) {
            $this->post(route('orders.store'), [
                'customer_id' => $this->customer->id,
                'order_date' => '2026-05-12',
                'status' => 'new_order',
                'priority' => 'normal',
                'payment_status' => 'not_due',
                'order_value' => 100,
                'items' => [],
            ])->assertRedirect();
            $codes[] = Order::query()->latest('id')->value('order_code');
        }

        // All codes follow ORD-YYYY-NNNN, year matches, and the trailing
        // number strictly increases.
        $year = now()->year;
        $previous = 0;
        foreach ($codes as $code) {
            $this->assertMatchesRegularExpression("/^ORD-{$year}-\d{4}$/", $code, "Bad code: {$code}");
            $num = (int) substr($code, strrpos($code, '-') + 1);
            $this->assertGreaterThan($previous, $num, 'Codes should strictly increase');
            $previous = $num;
        }
    }

    public function test_shipment_codes_increment_independently_of_orders(): void
    {
        // Create one order to have something to ship against
        $order = Order::create([
            'order_code' => 'ORD-EXISTING', 'customer_id' => $this->customer->id, 'order_date' => '2026-05-12',
            'status' => 'new_order', 'priority' => 'normal', 'payment_status' => 'not_due', 'order_value' => 0,
        ]);

        $codes = [];
        for ($i = 0; $i < 3; $i++) {
            $codes[] = Shipment::generateCode();
            // Persist so the next gen sees the new max
            Shipment::create([
                'shipment_code' => $codes[$i],
                'order_id' => $order->id,
                'status' => 'planning',
                'created_by' => null,
            ]);
        }

        $year = now()->year;
        foreach ($codes as $code) {
            $this->assertMatchesRegularExpression("/^SHP-{$year}-\d{4}$/", $code);
        }
        // Strictly increasing
        $nums = array_map(fn ($c) => (int) substr($c, strrpos($c, '-') + 1), $codes);
        $this->assertSame($nums, array_unique($nums), 'No duplicate shipment codes');
        $sorted = $nums;
        sort($sorted);
        $this->assertSame($sorted, $nums, 'Shipment codes should be in insertion order');
    }

    public function test_code_generator_recovers_correctly_after_a_partial_year(): void
    {
        // Seed an order with a high number in the same year, then verify the
        // next gen picks up at +1, not 1.
        $year = now()->year;
        Order::create([
            'order_code' => "ORD-{$year}-9999",
            'customer_id' => $this->customer->id, 'order_date' => '2026-05-12',
            'status' => 'new_order', 'priority' => 'normal', 'payment_status' => 'not_due', 'order_value' => 0,
        ]);

        $this->post(route('orders.store'), [
            'customer_id' => $this->customer->id,
            'order_date' => '2026-05-12',
            'status' => 'new_order',
            'priority' => 'normal',
            'payment_status' => 'not_due',
            'order_value' => 100,
            'items' => [],
        ])->assertRedirect();

        $this->assertSame("ORD-{$year}-10000", Order::query()->latest('id')->value('order_code'));
    }
}
