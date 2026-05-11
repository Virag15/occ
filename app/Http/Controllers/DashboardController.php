<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Order;
use App\Models\Shipment;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $today = now()->toDateString();
        $monthStart = now()->startOfMonth()->toDateString();

        // ─── Headline KPI cards ─────────────────────────────────────
        $ordersToday = Order::query()->whereDate('order_date', $today)->count();
        $dispatchedToday = Order::query()->whereDate('dispatch_date', $today)->count();

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
            'returns_open' => \App\Models\ReturnCase::query()->whereIn('case_status', ['reported', 'under_inspection'])->count(),
        ];

        $recentActivity = AuditLog::query()
            ->with('user:id,name')
            ->orderByDesc('id')
            ->limit(8)
            ->get();

        $recentOrders = Order::query()
            ->with('customer:id,name,company')
            ->orderByDesc('id')
            ->limit(5)
            ->get(['id', 'order_code', 'customer_id', 'order_date', 'order_value', 'status', 'payment_status']);

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
            'recent_activity' => $recentActivity,
            'recent_orders' => $recentOrders,
        ]);
    }
}
