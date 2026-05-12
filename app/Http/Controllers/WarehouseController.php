<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Mobile-first dispatch queue for warehouse role (Phase 5.1).
 * Surfaces today's actionable orders as a single-column card list — large
 * touch targets for status advance and POD/triplicate capture.
 */
class WarehouseController extends Controller
{
    public function index(): Response
    {
        $withShipments = [
            'customer:id,name,company,phone',
            'shipments:id,order_id,transporter_id,lr_number,dispatch_date,delivered_date,pod_received,triplicate_received',
            'shipments.transporter:id,name',
        ];

        // The three workflows the warehouse handles, in priority order:
        // 1) Packed + ready — need LR / dispatch
        // 2) Dispatched without POD — capture POD when delivered
        // 3) Delivered without triplicate — chase triplicate
        $awaitingDispatch = Order::query()
            ->whereIn('status', ['packed', 'ready_for_dispatch'])
            ->with($withShipments)
            ->orderByRaw("CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END")
            ->orderBy('order_date')
            ->get(['id', 'order_code', 'tracking_uuid', 'customer_id', 'order_date', 'order_value', 'brands', 'status', 'priority', 'pod_received', 'triplicate_received']);

        $podPending = Order::query()
            ->where('status', 'dispatched')
            ->where('pod_received', false)
            ->with($withShipments)
            ->orderBy('order_date')
            ->get(['id', 'order_code', 'tracking_uuid', 'customer_id', 'order_date', 'order_value', 'brands', 'status', 'priority', 'pod_received', 'triplicate_received']);

        $triplicatePending = Order::query()
            ->where('status', 'delivered')
            ->where('triplicate_received', false)
            ->with($withShipments)
            ->orderBy('order_date')
            ->get(['id', 'order_code', 'tracking_uuid', 'customer_id', 'order_date', 'order_value', 'brands', 'status', 'priority', 'pod_received', 'triplicate_received']);

        return Inertia::render('Warehouse/Queue', [
            'awaiting_dispatch' => $awaitingDispatch,
            'pod_pending' => $podPending,
            'triplicate_pending' => $triplicatePending,
        ]);
    }
}
