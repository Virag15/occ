<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Services\WhatsApp\WhatsAppService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * Send WhatsApp payment reminders to customers with overdue invoices.
 * Default cadence: D+1 (one day after due) and every 7 days after that.
 *
 *   php artisan reminders:send-payments
 *   php artisan reminders:send-payments --dry-run
 *   php artisan reminders:send-payments --days=14   # only those overdue >= N days
 */
class SendPaymentReminders extends Command
{
    protected $signature = 'reminders:send-payments
                            {--dry-run : Print what would be sent without actually sending}
                            {--days=1 : Minimum days overdue (default 1)}';

    protected $description = 'Send WhatsApp payment reminders to customers with overdue invoices.';

    public function handle(WhatsAppService $wa): int
    {
        $today = now()->startOfDay();
        $minDays = max(1, (int) $this->option('days'));
        $dryRun = (bool) $this->option('dry-run');

        // Eligibility: payment_status in (pending/partial/overdue), payment_due_date < today.
        // The recipient threshold (D+1, D+7, D+14, ...) is enforced in PHP since SQL
        // can't easily say "exactly 1 mod 7 days ago" portably.
        $orders = Order::query()
            ->with('customer:id,name,phone,whatsapp')
            ->whereIn('payment_status', ['pending', 'partial', 'overdue'])
            ->whereNotNull('payment_due_date')
            ->whereDate('payment_due_date', '<', $today->toDateString())
            ->get(['id', 'order_code', 'customer_id', 'order_value', 'amount_received', 'payment_due_date', 'tracking_uuid']);

        $sent = 0;
        $skipped = 0;
        foreach ($orders as $order) {
            /** @var Carbon $due */
            $due = $order->payment_due_date;
            $daysOverdue = (int) abs($due->diffInDays($today));

            // Cadence: D+1 (right after due), then weekly. Skip days that don't match.
            $matchesCadence = $daysOverdue === 1 || $daysOverdue % 7 === 0;
            if ($daysOverdue < $minDays || ! $matchesCadence) {
                $skipped++;

                continue;
            }

            $customer = $order->customer;
            $to = $customer?->whatsapp ?: $customer?->phone;
            if (! $to) {
                $this->warn(sprintf('Skip %s — no WhatsApp/phone on %s', $order->order_code, $customer?->name ?? 'unknown'));
                $skipped++;

                continue;
            }

            if ($dryRun) {
                $this->line(sprintf('[dry-run] %s → %s (%d days overdue)', $order->order_code, $to, $daysOverdue));
                $sent++;

                continue;
            }

            $wa->sendPaymentReminder($order, $daysOverdue);
            $sent++;
        }

        $this->info(sprintf(
            '%s %d reminder(s)%s · %d skipped.',
            $dryRun ? 'Would send' : 'Dispatched',
            $sent,
            $dryRun ? '' : ' (queued via WhatsAppService)',
            $skipped,
        ));

        return self::SUCCESS;
    }
}
