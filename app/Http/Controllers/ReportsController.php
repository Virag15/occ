<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Payment;
use App\Models\ReturnCase;
use App\Models\Shipment;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Unified reports page — merged daily digest + analytical reports.
 * Date range drives all range-scoped queries; "as of now" cards (aging,
 * pending actions) ignore the range and always show current state.
 */
class ReportsController extends Controller
{
    public function index(Request $request): Response
    {
        // Default range: today only (= daily report behaviour). The user can
        // widen the range from the page to see weekly/monthly cuts.
        $from = $request->query('from')
            ? Carbon::parse((string) $request->query('from'))->startOfDay()
            : now()->startOfDay();
        $to = $request->query('to')
            ? Carbon::parse((string) $request->query('to'))->endOfDay()
            : now()->endOfDay();

        // Defensive: if user inverted from/to, swap silently.
        if ($from->greaterThan($to)) {
            [$from, $to] = [$to->copy()->startOfDay(), $from->copy()->endOfDay()];
        }

        $fromDate = $from->toDateString();
        $toDate = $to->toDateString();

        // ─── Range KPIs ────────────────────────────────────────────
        $ordersInRange = Order::query()
            ->whereDate('order_date', '>=', $fromDate)
            ->whereDate('order_date', '<=', $toDate)
            ->whereNotIn('status', ['cancelled'])
            ->get(['id', 'order_value']);
        $dispatchedInRange = Shipment::query()
            ->whereDate('dispatch_date', '>=', $fromDate)
            ->whereDate('dispatch_date', '<=', $toDate)
            ->with('order:id,order_value')
            ->get();
        $paymentsInRange = (float) Payment::query()
            ->whereDate('paid_on', '>=', $fromDate)
            ->whereDate('paid_on', '<=', $toDate)
            ->sum('amount');

        $kpis = [
            'orders_count' => $ordersInRange->count(),
            'orders_value' => round((float) $ordersInRange->sum('order_value'), 2),
            'dispatched_count' => $dispatchedInRange->count(),
            'dispatched_value' => round((float) $dispatchedInRange->sum(fn ($s) => $s->order?->order_value ?? 0), 2),
            'payments_received' => round($paymentsInRange, 2),
        ];

        // ─── Brand sales mix (range-scoped) ───────────────────────
        $brandTotals = [];
        Order::query()
            ->whereDate('order_date', '>=', $fromDate)
            ->whereDate('order_date', '<=', $toDate)
            ->whereNotIn('status', ['cancelled'])
            ->whereNotNull('brands')
            ->get(['order_value', 'brands'])
            ->each(function (Order $o) use (&$brandTotals) {
                $brands = is_array($o->brands) ? $o->brands : [];
                if (empty($brands)) {
                    return;
                }
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

        // ─── Dispatch SLA per transporter (range-scoped) ──────────
        $driver = DB::getDriverName();
        $isSqlite = $driver === 'sqlite';
        $dispatchExpr = $isSqlite
            ? '(julianday(shipments.dispatch_date) - julianday(orders.order_date))'
            : '(EXTRACT(EPOCH FROM (shipments.dispatch_date::timestamp - orders.order_date::timestamp)) / 86400)';
        $transitExpr = $isSqlite
            ? '(julianday(shipments.delivered_date) - julianday(shipments.dispatch_date))'
            : '(EXTRACT(EPOCH FROM (shipments.delivered_date::timestamp - shipments.dispatch_date::timestamp)) / 86400)';

        $slaRows = DB::table('orders')
            ->join('shipments', 'shipments.order_id', '=', 'orders.id')
            ->leftJoin('transporters', 'transporters.id', '=', 'shipments.transporter_id')
            ->whereNotNull('shipments.dispatch_date')
            ->whereDate('shipments.dispatch_date', '>=', $fromDate)
            ->whereDate('shipments.dispatch_date', '<=', $toDate)
            ->selectRaw("
                COALESCE(transporters.id, 0) as transporter_id,
                COALESCE(transporters.name, 'Unassigned') as transporter_name,
                COUNT(DISTINCT orders.id) as shipments,
                AVG({$dispatchExpr}) as avg_dispatch_days,
                AVG(CASE WHEN shipments.delivered_date IS NOT NULL THEN {$transitExpr} ELSE NULL END) as avg_transit_days
            ")
            ->groupBy('transporters.id', 'transporters.name')
            ->orderByDesc('shipments')
            ->get();

        // ─── Top customers (range-scoped) ─────────────────────────
        $topCustomers = Order::query()
            ->join('customers', 'customers.id', '=', 'orders.customer_id')
            ->whereDate('orders.order_date', '>=', $fromDate)
            ->whereDate('orders.order_date', '<=', $toDate)
            ->whereNotIn('orders.status', ['cancelled'])
            ->selectRaw('customers.id, customers.name, customers.company, '
                .'COUNT(DISTINCT orders.id) as orders, COALESCE(SUM(orders.order_value), 0) as revenue')
            ->groupBy('customers.id', 'customers.name', 'customers.company')
            ->orderByDesc('revenue')
            ->limit(20)
            ->get();

        // ─── Payment aging (always "as of now") ───────────────────
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

        // ─── Action items (always "as of now") ────────────────────
        $actionItems = [
            'lr_pending' => Order::query()
                ->where('lr_shared_with_customer', false)
                ->whereHas('shipments', fn ($q) => $q->whereNotNull('lr_number'))
                ->count(),
            'triplicate_pending' => Order::query()
                ->where('status', 'delivered')
                ->where('triplicate_received', false)
                ->count(),
            'pod_pending' => Order::query()
                ->where('status', 'dispatched')
                ->where('pod_received', false)
                ->count(),
            'returns_open' => ReturnCase::query()
                ->whereIn('case_status', ['reported', 'under_inspection'])
                ->count(),
        ];

        return Inertia::render('Reports/Index', [
            'range' => [
                'from' => $fromDate,
                'to' => $toDate,
                'is_single_day' => $fromDate === $toDate,
            ],
            'kpis' => $kpis,
            'brand_mix' => $brandMix,
            'dispatch_sla' => $slaRows,
            'top_customers' => $topCustomers,
            'aging' => array_values($buckets),
            'action_items' => $actionItems,
        ]);
    }
}
