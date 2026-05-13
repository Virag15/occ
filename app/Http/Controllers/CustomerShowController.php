<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Order;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CustomerShowController extends Controller
{
    public function __invoke(Customer $customer): Response
    {
        // Order.transporter is an accessor on the latest shipment, not an Eloquent
        // relation. Eager-load via shipments so the accessor finds them in memory.
        $orders = Order::query()
            ->where('customer_id', $customer->id)
            ->with(['shipments:id,order_id,transporter_id', 'shipments.transporter:id,name'])
            ->orderByDesc('order_date')
            ->orderByDesc('id')
            ->limit(50)
            ->get();

        $allOrders = Order::query()->where('customer_id', $customer->id);

        $stats = [
            'total_orders' => $allOrders->count(),
            'lifetime_value' => (float) $allOrders->sum('order_value'),
            'amount_received' => (float) $allOrders->sum('amount_received'),
            'outstanding' => (float) $allOrders->whereIn('payment_status', ['pending', 'partial', 'overdue'])
                ->selectRaw('COALESCE(SUM(order_value), 0) - COALESCE(SUM(amount_received), 0) as outstanding')
                ->value('outstanding'),
            'last_order_date' => $allOrders->max('order_date'),
            'orders_by_status' => $allOrders->selectRaw('status, COUNT(*) as c')->groupBy('status')->pluck('c', 'status'),
        ];

        // Brand frequency across this customer's orders
        $brandTallies = [];
        foreach ($orders as $o) {
            foreach ((array) ($o->brands ?? []) as $b) {
                $brandTallies[$b] = ($brandTallies[$b] ?? 0) + 1;
            }
        }
        arsort($brandTallies);

        // Monthly order trend — last 12 months. Build an empty skeleton first so
        // gaps render as zero bars (a flatlined month is itself a useful signal).
        $monthly = [];
        for ($i = 11; $i >= 0; $i--) {
            $d = now()->subMonths($i);
            $monthly[$d->format('Y-m')] = [
                'month' => $d->format('Y-m'),
                'label' => $d->format('M'),
                'orders' => 0,
                'value' => 0.0,
            ];
        }
        $rows = Order::query()
            ->where('customer_id', $customer->id)
            ->where('order_date', '>=', now()->subMonths(11)->startOfMonth()->toDateString())
            ->selectRaw("strftime('%Y-%m', order_date) as ym, COUNT(*) as c, COALESCE(SUM(order_value), 0) as v")
            ->groupBy('ym')
            ->get();
        // Postgres uses to_char; SQLite uses strftime. Try strftime first (dev),
        // fall back to PHP-side grouping for production Postgres.
        if ($rows->isEmpty() && DB::getDriverName() !== 'sqlite') {
            $rows = Order::query()
                ->where('customer_id', $customer->id)
                ->where('order_date', '>=', now()->subMonths(11)->startOfMonth()->toDateString())
                ->selectRaw("to_char(order_date, 'YYYY-MM') as ym, COUNT(*) as c, COALESCE(SUM(order_value), 0) as v")
                ->groupBy('ym')
                ->get();
        }
        foreach ($rows as $r) {
            if (isset($monthly[$r->ym])) {
                $monthly[$r->ym]['orders'] = (int) $r->c;
                $monthly[$r->ym]['value'] = (float) $r->v;
            }
        }

        // Payment aging buckets — scoped to this customer (same logic as
        // DashboardController; per-customer view drives one-on-one dunning).
        $todayDate = now()->startOfDay();
        $buckets = [
            '0-30' => ['label' => '1–30 days', 'count' => 0, 'value' => 0.0],
            '31-60' => ['label' => '31–60 days', 'count' => 0, 'value' => 0.0],
            '61-90' => ['label' => '61–90 days', 'count' => 0, 'value' => 0.0],
            '90+' => ['label' => '90+ days', 'count' => 0, 'value' => 0.0],
        ];
        $overdueForCustomer = Order::query()
            ->where('customer_id', $customer->id)
            ->whereIn('payment_status', ['pending', 'partial', 'overdue'])
            ->whereNotNull('payment_due_date')
            ->whereDate('payment_due_date', '<', $todayDate->toDateString())
            ->get(['id', 'order_value', 'amount_received', 'payment_due_date']);
        foreach ($overdueForCustomer as $o) {
            /** @var Carbon $due */
            $due = $o->payment_due_date;
            $age = (int) abs($due->diffInDays($todayDate));
            $outstanding = max(0.0, (float) $o->order_value - (float) ($o->amount_received ?? 0));
            $key = match (true) {
                $age <= 30 => '0-30',
                $age <= 60 => '31-60',
                $age <= 90 => '61-90',
                default => '90+',
            };
            $buckets[$key]['count']++;
            $buckets[$key]['value'] += $outstanding;
        }
        foreach ($buckets as &$b) {
            $b['value'] = round($b['value'], 2);
        }
        unset($b);

        return Inertia::render('Customers/Show', [
            'customer' => $customer,
            'orders' => $orders,
            'stats' => $stats,
            'brand_frequency' => $brandTallies,
            'monthly_trend' => array_values($monthly),
            'payment_aging' => array_values($buckets),
        ]);
    }
}
