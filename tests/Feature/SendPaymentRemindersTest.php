<?php

namespace Tests\Feature;

use App\Models\Communication;
use App\Models\Customer;
use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/**
 * Verifies the reminders cadence + dry-run flag. WHATSAPP_ENABLED is off
 * in the test env (.env.example default), so WhatsAppService routes
 * through demo mode — sends become Communication rows tagged 'sent'
 * with a DEMO- external id.
 */
class SendPaymentRemindersTest extends TestCase
{
    use RefreshDatabase;

    private Customer $customer;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2026-05-13 10:00:00'));
        $this->customer = Customer::create([
            'tally_id' => 'C', 'name' => 'X', 'phone' => '+91 99999 00000',
            'whatsapp' => '+91 99999 00000', 'status' => 'active',
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function overdueOrder(int $daysAgo, string $paymentStatus = 'pending'): Order
    {
        return Order::create([
            'order_code' => 'ORD-R-'.uniqid(),
            'customer_id' => $this->customer->id,
            'order_date' => Carbon::parse('2026-04-01')->toDateString(),
            'status' => 'delivered',
            'priority' => 'normal',
            'order_value' => 50000,
            'amount_received' => 0,
            'payment_status' => $paymentStatus,
            'payment_due_date' => now()->subDays($daysAgo)->toDateString(),
        ]);
    }

    public function test_dry_run_lists_matching_orders_without_sending(): void
    {
        $this->overdueOrder(1);  // D+1 → match
        $this->overdueOrder(7);  // D+7 → match
        $this->overdueOrder(14); // D+14 → match (weekly cadence)
        $this->overdueOrder(2);  // skipped (not D+1 and not multiple of 7)

        $this->artisan('reminders:send-payments', ['--dry-run' => true])
            ->expectsOutputToContain('Would send 3 reminder(s)')
            ->assertSuccessful();

        $this->assertSame(0, Communication::count());
    }

    public function test_real_run_writes_communication_rows(): void
    {
        $this->overdueOrder(1);
        $this->overdueOrder(7);

        $this->artisan('reminders:send-payments')
            ->expectsOutputToContain('Dispatched 2 reminder(s)')
            ->assertSuccessful();

        $this->assertSame(2, Communication::where('template_name', 'payment_reminder')->count());
        // Demo mode (WHATSAPP_ENABLED=false in test env) — sends are still
        // marked 'sent' but with a DEMO- id.
        $this->assertSame(2, Communication::where('status', 'sent')->where('external_id', 'like', 'DEMO-%')->count());
    }

    public function test_orders_without_phone_or_whatsapp_skipped(): void
    {
        $customer = Customer::create(['tally_id' => 'C2', 'name' => 'No Contact', 'status' => 'active']);
        Order::create([
            'order_code' => 'ORD-R-X',
            'customer_id' => $customer->id,
            'order_date' => '2026-04-01',
            'status' => 'delivered',
            'priority' => 'normal',
            'order_value' => 50000,
            'payment_status' => 'pending',
            'payment_due_date' => now()->subDays(1)->toDateString(),
        ]);

        $this->artisan('reminders:send-payments')
            ->expectsOutputToContain('Dispatched 0 reminder(s)')
            ->assertSuccessful();

        $this->assertSame(0, Communication::count());
    }

    public function test_days_flag_raises_the_floor(): void
    {
        $this->overdueOrder(1);  // would match default
        $this->overdueOrder(14); // matches floor=14

        $this->artisan('reminders:send-payments', ['--dry-run' => true, '--days' => 14])
            ->expectsOutputToContain('Would send 1 reminder(s)')
            ->assertSuccessful();
    }
}
