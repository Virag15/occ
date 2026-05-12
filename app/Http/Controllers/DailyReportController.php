<?php

namespace App\Http\Controllers;

use App\Models\CompanySetting;
use App\Models\Order;
use App\Models\Payment;
use App\Models\ReturnCase;
use App\Models\Shipment;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Daily operations digest. Computed on demand for any date — no persistence
 * yet (the daily_reports table is a future home for scheduled/emailed runs).
 *
 * Mirrors the EOD digest shape the user shared: snapshot, pending actions,
 * top alerts, then drill-down tables for the day's activity.
 */
class DailyReportController extends Controller
{
    public function show(Request $request): Response
    {
        $date = $request->query('date')
            ? Carbon::parse($request->query('date'))->startOfDay()
            : now()->startOfDay();

        $dateStr = $date->toDateString();
        $tomorrowStr = $date->copy()->addDay()->toDateString();

        // ─── Today's snapshot ───────────────────────────────────────
        $newOrders = Order::query()->whereDate('order_date', $dateStr)->get(['id', 'order_value']);
        $dispatchedShipments = Shipment::query()
            ->whereDate('dispatch_date', $dateStr)
            ->with('order:id,order_value')
            ->get();
        $paymentsToday = Payment::query()->whereDate('paid_on', $dateStr)->sum('amount');

        $tomorrowPlanned = Order::query()
            ->whereIn('status', ['packed', 'ready_for_dispatch', 'confirmed', 'packing'])
            ->whereHas('shipments', fn ($q) => $q->whereDate('pickup_scheduled_date', $tomorrowStr))
            ->orWhere(function ($q) {
                $q->whereIn('status', ['packed', 'ready_for_dispatch']);
            })
            ->with(['customer:id,name'])
            ->limit(20)
            ->get(['id', 'order_code', 'customer_id', 'order_value', 'status', 'brands', 'priority', 'customer_reference_number']);

        $snapshot = [
            'new_orders_count' => $newOrders->count(),
            'new_orders_value' => (float) $newOrders->sum('order_value'),
            'dispatched_count' => $dispatchedShipments->count(),
            'dispatched_value' => (float) $dispatchedShipments->sum(fn ($s) => $s->order?->order_value ?? 0),
            'payments_today' => (float) $paymentsToday,
            'tomorrow_dispatches_count' => $tomorrowPlanned->count(),
        ];

        // ─── Pending actions ────────────────────────────────────────
        $lrSharingPending = Order::query()
            ->where('lr_shared_with_customer', false)
            ->whereHas('shipments', fn ($q) => $q->whereNotNull('lr_number')->whereDate('dispatch_date', '<=', $dateStr))
            ->with(['customer:id,name', 'shipments' => fn ($q) => $q->whereNotNull('lr_number')])
            ->get();

        $triplicatePending = Order::query()
            ->where('status', 'delivered')
            ->where('triplicate_received', false)
            ->with(['customer:id,name', 'shipments'])
            ->get();

        $paymentsOverdue = Order::query()
            ->whereIn('payment_status', ['pending', 'partial', 'overdue'])
            ->where(function ($q) use ($dateStr) {
                $q->where('payment_status', 'overdue')
                    ->orWhere(fn ($q2) => $q2->whereDate('payment_due_date', '<', $dateStr));
            })
            ->with(['customer:id,name'])
            ->get();

        $openReturns = ReturnCase::query()
            ->whereIn('case_status', ['reported', 'under_inspection'])
            ->with(['customer:id,name', 'order:id,order_code'])
            ->orderByDesc('severity')
            ->get();

        $paymentsOverdueAmount = (float) $paymentsOverdue->sum(fn ($o) => max(0, (float) $o->order_value - (float) $o->amount_received));
        $returnsValueAtRisk = (float) $openReturns->sum('value_at_risk');

        $pending = [
            'lr_sharing_pending_count' => $lrSharingPending->count(),
            'triplicate_pending_count' => $triplicatePending->count(),
            'payments_overdue_count' => $paymentsOverdue->count(),
            'payments_overdue_amount' => $paymentsOverdueAmount,
            'open_returns_count' => $openReturns->count(),
            'open_returns_value' => $returnsValueAtRisk,
        ];

        // ─── Top alerts ─────────────────────────────────────────────
        $alerts = [];
        if ($paymentsOverdue->count() > 0) {
            $oldest = $paymentsOverdue->sortBy('payment_due_date')->first();
            $alerts[] = [
                'severity' => 'red',
                'title' => "{$paymentsOverdue->count()} overdue payment".($paymentsOverdue->count() > 1 ? 's' : ''),
                'detail' => 'Total amount stuck: ₹ '.number_format($paymentsOverdueAmount, 0).
                    ($oldest ? '. Oldest overdue: '.($oldest->customer?->name ?? 'Unknown') : ''),
            ];
        }
        $critical = $openReturns->where('severity', 'critical')->count();
        if ($critical > 0) {
            $criticalValue = (float) $openReturns->where('severity', 'critical')->sum('value_at_risk');
            $alerts[] = [
                'severity' => 'red',
                'title' => "{$critical} critical return case".($critical > 1 ? 's' : '').' open',
                'detail' => 'Value at risk: ₹ '.number_format($criticalValue, 0).'. Requires immediate attention.',
            ];
        }
        if ($lrSharingPending->count() > 0) {
            $alerts[] = [
                'severity' => 'amber',
                'title' => "{$lrSharingPending->count()} LR".($lrSharingPending->count() > 1 ? 's' : '').' not shared with customers',
                'detail' => "These customers don't know where their orders are. Share LR photos on WhatsApp before close of day.",
            ];
        }

        // ─── Detail tables ──────────────────────────────────────────
        $dispatchedTodayRows = $dispatchedShipments->map(fn ($s) => [
            'order_code' => $s->order?->order_code,
            'order_id' => $s->order_id,
            'customer_ref' => $s->order?->customer_reference_number ?? $s->order?->customer?->name,
            'lr_number' => $s->lr_number,
            'value' => (float) ($s->order?->order_value ?? 0),
            'lr_shared' => (bool) $s->lr_shared_with_customer,
        ])->values();

        $lrPendingRows = $lrSharingPending->flatMap(fn ($o) => $o->shipments
            ->where('lr_number', '!=', null)
            ->map(fn ($s) => [
                'order_code' => $o->order_code,
                'order_id' => $o->id,
                'customer_ref' => $o->customer_reference_number ?? $o->customer?->name,
                'lr_number' => $s->lr_number,
                'dispatch_date' => $s->dispatch_date?->toDateString(),
            ])
        )->values();

        $triplicateRows = $triplicatePending->map(function ($o) use ($date) {
            $latest = $o->shipments->whereNotNull('delivered_date')->sortByDesc('delivered_date')->first()
                  ?? $o->shipments->whereNotNull('dispatch_date')->sortByDesc('dispatch_date')->first();
            $ref = $latest?->dispatch_date;
            $days = $ref ? $date->diffInDays(Carbon::parse($ref)) : 0;

            return [
                'order_code' => $o->order_code,
                'order_id' => $o->id,
                'customer_ref' => $o->customer_reference_number ?? $o->customer?->name,
                'lr_number' => $latest?->lr_number,
                'dispatch_date' => $latest?->dispatch_date?->toDateString(),
                'days_ago' => $days,
            ];
        })->values();

        $paymentsOverdueRows = $paymentsOverdue->map(function ($o) use ($date) {
            $due = $o->payment_due_date;
            $days = $due ? $date->diffInDays(Carbon::parse($due)) : 0;
            $outstanding = max(0, (float) $o->order_value - (float) $o->amount_received);

            return [
                'order_code' => $o->order_code,
                'order_id' => $o->id,
                'customer_ref' => $o->customer?->name,
                'invoice_number' => $o->invoice_number,
                'due_date' => $due?->toDateString(),
                'outstanding' => $outstanding,
                'days_overdue' => $days,
            ];
        })->values();

        $tomorrowRows = $tomorrowPlanned->map(fn ($o) => [
            'order_code' => $o->order_code,
            'order_id' => $o->id,
            'customer_ref' => $o->customer_reference_number ?? $o->customer?->name,
            'brands' => is_array($o->brands) ? implode(', ', $o->brands) : '',
            'value' => (float) ($o->order_value ?? 0),
            'status' => $o->status,
            'priority' => $o->priority,
        ])->values();

        $returnsRows = $openReturns->map(fn ($r) => [
            'case_code' => $r->case_code,
            'case_id' => $r->id,
            'case_title' => $r->case_title,
            'case_type' => $r->case_type,
            'brand' => $r->brand,
            'severity' => $r->severity,
            'case_status' => $r->case_status,
            'value_at_risk' => (float) ($r->value_at_risk ?? 0),
        ])->values();

        // ─── Brand-wise revenue (weighted by brand share per order) ─
        $brandRevenue = Order::query()
            ->whereNotIn('status', ['cancelled'])
            ->whereNotNull('brands')
            ->get(['order_value', 'brands'])
            ->reduce(function ($acc, $o) {
                $brands = is_array($o->brands) ? $o->brands : [];
                if (empty($brands)) {
                    return $acc;
                }
                $share = (float) $o->order_value / count($brands);
                foreach ($brands as $brand) {
                    $acc[$brand] = ($acc[$brand] ?? 0) + $share;
                }

                return $acc;
            }, []);

        // Sort descending by value
        arsort($brandRevenue);
        $brandRevenueList = collect($brandRevenue)
            ->map(fn ($v, $k) => ['brand' => $k, 'revenue' => round($v, 2)])
            ->values()
            ->all();

        return Inertia::render('Reports/Daily', [
            'report_date' => $dateStr,
            'snapshot' => $snapshot,
            'pending' => $pending,
            'alerts' => $alerts,
            'dispatched_today' => $dispatchedTodayRows,
            'lr_pending' => $lrPendingRows,
            'triplicate_pending' => $triplicateRows,
            'payments_overdue' => $paymentsOverdueRows,
            'tomorrow_dispatches' => $tomorrowRows,
            'open_returns' => $returnsRows,
            'brand_revenue' => $brandRevenueList,
            'company' => [
                'name' => CompanySetting::current()->company_name,
                'tagline' => CompanySetting::current()->invoice_footer_note,
                'city' => CompanySetting::current()->city,
            ],
        ]);
    }
}
