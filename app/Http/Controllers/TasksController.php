<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\ReturnCase;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The Tasks page is a daily punch list — every open thing the staff needs to do.
 * Pulls from across the entity model, not its own data store.
 */
class TasksController extends Controller
{
    public function index(): Response
    {
        $today = now()->toDateString();

        // ─── Awaiting LR / dispatch ──────────────────────────────
        // Common eager loads — lr_number / transporter / dispatch_date / delivered_date all
        // come from the order's shipment-backed accessors, so shipments must be loaded.
        $withShipments = ['customer:id,name,company', 'shipments:id,order_id,transporter_id,lr_number,dispatch_date,delivered_date', 'shipments.transporter:id,name'];

        $awaitingLr = Order::query()
            ->whereIn('status', ['packed', 'ready_for_dispatch'])
            ->with($withShipments)
            ->orderByDesc('priority')
            ->orderBy('order_date')
            ->get(['id', 'order_code', 'customer_id', 'order_date', 'order_value', 'status', 'priority']);

        // ─── POD pending ─────────────────────────────────────────
        $podPending = Order::query()
            ->where('status', 'dispatched')
            ->where('pod_received', false)
            ->with($withShipments)
            ->get(['id', 'order_code', 'customer_id', 'order_date', 'order_value']);

        // ─── Triplicate awaited ──────────────────────────────────
        $triplicatePending = Order::query()
            ->where('status', 'delivered')
            ->where('triplicate_received', false)
            ->with($withShipments)
            ->get(['id', 'order_code', 'customer_id']);

        // ─── Payments overdue ────────────────────────────────────
        $paymentsOverdue = Order::query()
            ->whereIn('payment_status', ['pending', 'partial', 'overdue'])
            ->where(function ($q) use ($today) {
                $q->where('payment_status', 'overdue')
                  ->orWhere(fn ($q2) => $q2->whereDate('payment_due_date', '<', $today));
            })
            ->with('customer:id,name,company,phone')
            ->orderBy('payment_due_date')
            ->get(['id', 'order_code', 'customer_id', 'invoice_number', 'order_value', 'amount_received', 'payment_due_date', 'payment_status']);

        // ─── Open return cases ───────────────────────────────────
        $openReturns = ReturnCase::query()
            ->whereIn('case_status', ['reported', 'under_inspection'])
            ->with('customer:id,name,company', 'order:id,order_code')
            ->orderByDesc('severity')
            ->orderBy('date_reported')
            ->get(['id', 'case_code', 'customer_id', 'related_order_id', 'date_reported', 'severity', 'case_status', 'value_at_risk', 'case_title']);

        return Inertia::render('Tasks/Index', [
            'awaiting_lr' => $awaitingLr,
            'pod_pending' => $podPending,
            'triplicate_pending' => $triplicatePending,
            'payments_overdue' => $paymentsOverdue,
            'open_returns' => $openReturns,
            'today' => $today,
        ]);
    }
}
