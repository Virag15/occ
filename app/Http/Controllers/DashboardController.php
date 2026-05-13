<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\ReturnCase;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response|RedirectResponse
    {
        // Role-based landing: warehouse heads straight to their queue, accounts
        // to the tasks board (payments + triplicate chase live there). Owner /
        // manager / viewer land on the dashboard below.
        $role = Auth::user()?->role;
        if ($role === 'warehouse') {
            return redirect()->route('warehouse.queue');
        }
        if ($role === 'accounts') {
            return redirect()->route('tasks');
        }

        $today = now()->toDateString();
        $monthStart = now()->startOfMonth()->toDateString();

        // ─── Headline KPI cards ─────────────────────────────────────
        $ordersToday = Order::query()->whereDate('order_date', $today)->count();
        $dispatchedToday = Order::query()
            ->whereHas('shipments', fn ($s) => $s->whereDate('dispatch_date', $today))
            ->count();

        // Pending dispatch: orders that are packed/ready_for_dispatch with no LR yet,
        // OR orders in dispatched state but missing LR (rare but recoverable signal).
        $pendingDispatch = Order::query()
            ->whereIn('status', ['packed', 'ready_for_dispatch'])
            ->count();

        $triplicatesAwaited = Order::query()
            ->where('status', 'delivered')
            ->where('triplicate_received', false)
            ->count();

        // Overdue payment value: outstanding amount across orders that are past due
        $overduePaymentsValue = (float) Order::query()
            ->whereIn('payment_status', ['pending', 'partial', 'overdue'])
            ->where(function ($q) use ($today) {
                $q->where('payment_status', 'overdue')
                    ->orWhere(fn ($q2) => $q2->whereDate('payment_due_date', '<', $today));
            })
            ->selectRaw('COALESCE(SUM(order_value - COALESCE(amount_received, 0)), 0) AS due')
            ->value('due');

        $revenueThisMonth = (float) Order::query()
            ->whereDate('order_date', '>=', $monthStart)
            ->whereNotIn('status', ['cancelled'])
            ->sum('order_value');

        $openOrders = Order::query()
            ->whereNotIn('status', ['closed', 'cancelled'])
            ->count();

        // ─── Charts ─────────────────────────────────────────────────
        // Orders by status — for the donut. Excludes closed + cancelled so the "in-flight" view is clean.
        $statusDistribution = Order::query()
            ->select('status', DB::raw('count(*) AS count'))
            ->whereNotIn('status', ['closed', 'cancelled'])
            ->groupBy('status')
            ->pluck('count', 'status');

        // Revenue last 14 days — for a quick sparkline / line chart
        $revenueByDay = Order::query()
            ->whereDate('order_date', '>=', now()->subDays(13)->toDateString())
            ->whereNotIn('status', ['cancelled'])
            ->selectRaw('order_date AS day, SUM(order_value) AS value')
            ->groupBy('order_date')
            ->orderBy('order_date')
            ->get();

        // ─── Action queue + recent activity ─────────────────────────
        $actionQueue = [
            'awaiting_lr' => Order::query()->whereIn('status', ['packed', 'ready_for_dispatch'])->count(),
            'pod_pending' => Order::query()->where('status', 'dispatched')->where('pod_received', false)->count(),
            'triplicate_pending' => $triplicatesAwaited,
            'payment_overdue' => Order::query()
                ->whereIn('payment_status', ['pending', 'partial', 'overdue'])
                ->where(function ($q) use ($today) {
                    $q->where('payment_status', 'overdue')
                        ->orWhere(fn ($q2) => $q2->whereDate('payment_due_date', '<', $today));
                })->count(),
            'returns_open' => ReturnCase::query()->whereIn('case_status', ['reported', 'under_inspection'])->count(),
        ];

        // ─── Top customers this month ──────────────────────────────
        // Leaderboard by sum(order_value) for the current month. Cancelled
        // orders excluded so the number reflects real bookings.
        $topCustomers = Order::query()
            ->join('customers', 'customers.id', '=', 'orders.customer_id')
            ->whereDate('orders.order_date', '>=', $monthStart)
            ->whereNotIn('orders.status', ['cancelled'])
            ->selectRaw('customers.id, customers.name, customers.company, '
                .'COUNT(DISTINCT orders.id) as orders, COALESCE(SUM(orders.order_value), 0) as revenue')
            ->groupBy('customers.id', 'customers.name', 'customers.company')
            ->orderByDesc('revenue')
            ->limit(5)
            ->get();

        // ─── Payment aging buckets ─────────────────────────────────
        // For each pending/partial/overdue order, classify by days past due.
        // Buckets follow standard accounting practice. The whereDate filter
        // below already excludes anything not yet due, so $age is always >= 1.
        $todayDate = now()->startOfDay();
        $buckets = [
            '0-30' => ['label' => '1–30 days', 'count' => 0, 'value' => 0.0],
            '31-60' => ['label' => '31–60 days', 'count' => 0, 'value' => 0.0],
            '61-90' => ['label' => '61–90 days', 'count' => 0, 'value' => 0.0],
            '90+' => ['label' => '90+ days', 'count' => 0, 'value' => 0.0],
        ];
        $overdueOrders = Order::query()
            ->whereIn('payment_status', ['pending', 'partial', 'overdue'])
            ->whereNotNull('payment_due_date')
            ->whereDate('payment_due_date', '<', $todayDate->toDateString())
            ->get(['id', 'order_value', 'amount_received', 'payment_due_date']);
        foreach ($overdueOrders as $o) {
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

        return Inertia::render('Dashboard', [
            'kpis' => [
                'orders_today' => $ordersToday,
                'dispatched_today' => $dispatchedToday,
                'pending_dispatch' => $pendingDispatch,
                'triplicates_awaited' => $triplicatesAwaited,
                'overdue_payments_value' => round($overduePaymentsValue, 2),
                'revenue_this_month' => round($revenueThisMonth, 2),
                'open_orders' => $openOrders,
            ],
            'status_distribution' => $statusDistribution,
            'revenue_by_day' => $revenueByDay,
            'action_queue' => $actionQueue,
            'top_customers' => $topCustomers,
            'payment_aging' => array_values($buckets),
        ]);
    }
}
