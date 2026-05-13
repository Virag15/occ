<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Reports — the "deep dive" view. Dashboard stays lean (at-a-glance); /reports
 * aggregates the bigger analytical cuts: brand mix, dispatch SLA per transporter,
 * full top-customers table, full aging breakdown.
 */
class ReportsController extends Controller
{
    public function index(): Response
    {
        $monthStart = now()->startOfMonth()->toDateString();

        // ─── Brand sales mix (this month) ─────────────────────────
        // brands is stored as JSON array on each order; explode it in PHP since
        // the data is small enough not to warrant a SQL-side unnest.
        $brandTotals = [];
        Order::query()
            ->whereDate('order_date', '>=', $monthStart)
            ->whereNotIn('status', ['cancelled'])
            ->whereNotNull('brands')
            ->get(['order_value', 'brands'])
            ->each(function (Order $o) use (&$brandTotals) {
                $brands = is_array($o->brands) ? $o->brands : [];
                if (empty($brands)) {
                    return;
                }
                // Split the order value evenly across each tagged brand —
                // an order labeled with two brands counts half/half.
                $share = (float) $o->order_value / max(1, count($brands));
                foreach ($brands as $brand) {
                    $brandTotals[$brand] = ($brandTotals[$brand] ?? 0) + $share;
                }
            });
        arsort($brandTotals);
        $brandMix = collect($brandTotals)->map(fn ($value, $brand) => [
            'brand' => $brand,
            'value' => round($value, 2),
        ])->values();

        // ─── Dispatch SLA per transporter ─────────────────────────
        // Avg days from order confirmed → first dispatch date, grouped by
        // transporter. Only counts orders that actually dispatched. Limit
        // to the last 90 days so the number reflects current performance.
        $cutoff = now()->subDays(90)->toDateString();
        $slaRows = DB::table('orders')
            ->join('shipments', 'shipments.order_id', '=', 'orders.id')
            ->leftJoin('transporters', 'transporters.id', '=', 'shipments.transporter_id')
            ->whereNotNull('shipments.dispatch_date')
            ->whereDate('orders.order_date', '>=', $cutoff)
            ->selectRaw('
                COALESCE(transporters.id, 0) as transporter_id,
                COALESCE(transporters.name, \'Unassigned\') as transporter_name,
                COUNT(DISTINCT orders.id) as shipments,
                AVG(julianday(shipments.dispatch_date) - julianday(orders.order_date)) as avg_dispatch_days,
                AVG(CASE WHEN shipments.delivered_date IS NOT NULL
                    THEN julianday(shipments.delivered_date) - julianday(shipments.dispatch_date)
                    ELSE NULL END) as avg_transit_days
            ')
            ->groupBy('transporters.id', 'transporters.name')
            ->orderByDesc('shipments')
            ->get();
        // Postgres path: julianday → DATE_PART
        if ($slaRows->isEmpty() && DB::getDriverName() !== 'sqlite') {
            $slaRows = DB::table('orders')
                ->join('shipments', 'shipments.order_id', '=', 'orders.id')
                ->leftJoin('transporters', 'transporters.id', '=', 'shipments.transporter_id')
                ->whereNotNull('shipments.dispatch_date')
                ->whereDate('orders.order_date', '>=', $cutoff)
                ->selectRaw('
                    COALESCE(transporters.id, 0) as transporter_id,
                    COALESCE(transporters.name, \'Unassigned\') as transporter_name,
                    COUNT(DISTINCT orders.id) as shipments,
                    AVG(EXTRACT(EPOCH FROM (shipments.dispatch_date::timestamp - orders.order_date::timestamp)) / 86400) as avg_dispatch_days,
                    AVG(CASE WHEN shipments.delivered_date IS NOT NULL
                        THEN EXTRACT(EPOCH FROM (shipments.delivered_date::timestamp - shipments.dispatch_date::timestamp)) / 86400
                        ELSE NULL END) as avg_transit_days
                ')
                ->groupBy('transporters.id', 'transporters.name')
                ->orderByDesc('shipments')
                ->get();
        }

        // ─── Top customers (this month, full list) ────────────────
        $topCustomersFull = Order::query()
            ->join('customers', 'customers.id', '=', 'orders.customer_id')
            ->whereDate('orders.order_date', '>=', $monthStart)
            ->whereNotIn('orders.status', ['cancelled'])
            ->selectRaw('customers.id, customers.name, customers.company, '
                .'COUNT(DISTINCT orders.id) as orders, COALESCE(SUM(orders.order_value), 0) as revenue')
            ->groupBy('customers.id', 'customers.name', 'customers.company')
            ->orderByDesc('revenue')
            ->limit(20)
            ->get();

        // ─── Full aging breakdown with order-level detail ─────────
        $todayDate = now()->startOfDay();
        $buckets = [
            '0-30' => ['label' => '1–30 days', 'count' => 0, 'value' => 0.0, 'orders' => []],
            '31-60' => ['label' => '31–60 days', 'count' => 0, 'value' => 0.0, 'orders' => []],
            '61-90' => ['label' => '61–90 days', 'count' => 0, 'value' => 0.0, 'orders' => []],
            '90+' => ['label' => '90+ days', 'count' => 0, 'value' => 0.0, 'orders' => []],
        ];
        $overdueOrders = Order::query()
            ->with('customer:id,name,company')
            ->whereIn('payment_status', ['pending', 'partial', 'overdue'])
            ->whereNotNull('payment_due_date')
            ->whereDate('payment_due_date', '<', $todayDate->toDateString())
            ->orderBy('payment_due_date')
            ->get(['id', 'order_code', 'customer_id', 'order_value', 'amount_received', 'payment_due_date']);
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
            $buckets[$key]['orders'][] = [
                'id' => $o->id,
                'order_code' => $o->order_code,
                'customer_name' => $o->customer?->name,
                'customer_company' => $o->customer?->company,
                'outstanding' => round($outstanding, 2),
                'days_overdue' => $age,
            ];
        }
        foreach ($buckets as &$b) {
            $b['value'] = round($b['value'], 2);
        }
        unset($b);

        return Inertia::render('Reports/Index', [
            'brand_mix' => $brandMix,
            'dispatch_sla' => $slaRows,
            'top_customers' => $topCustomersFull,
            'aging' => array_values($buckets),
            'month_label' => now()->format('F Y'),
        ]);
    }
}
