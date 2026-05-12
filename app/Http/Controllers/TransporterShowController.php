<?php

namespace App\Http\Controllers;

use App\Models\Shipment;
use App\Models\Transporter;
use Inertia\Inertia;
use Inertia\Response;

class TransporterShowController extends Controller
{
    public function __invoke(Transporter $transporter): Response
    {
        $shipments = Shipment::query()
            ->where('transporter_id', $transporter->id)
            ->with('order:id,order_code,customer_id,order_value,status', 'order.customer:id,name,company')
            ->orderByDesc('dispatch_date')
            ->orderByDesc('id')
            ->limit(50)
            ->get();

        $allShipments = Shipment::query()->where('transporter_id', $transporter->id);
        $totalCount = $allShipments->count();
        $deliveredCount = (clone $allShipments)->where('status', 'delivered')->count();

        // Average transit time from dispatch_date → delivered_date, in days
        $transitRows = (clone $allShipments)
            ->whereNotNull('dispatch_date')
            ->whereNotNull('delivered_date')
            ->get(['dispatch_date', 'delivered_date']);
        $avgTransitDays = $transitRows->count() > 0
            ? round($transitRows->avg(fn ($s) => max(0, $s->dispatch_date->diffInDays($s->delivered_date))), 1)
            : null;

        // On-time delivery rate: delivered_date <= expected_delivery
        $onTimeRows = (clone $allShipments)
            ->whereNotNull('expected_delivery')
            ->whereNotNull('delivered_date')
            ->get(['expected_delivery', 'delivered_date']);
        $onTimePct = $onTimeRows->count() > 0
            ? round(100 * $onTimeRows->filter(fn ($s) => $s->delivered_date->lte($s->expected_delivery))->count() / $onTimeRows->count(), 0)
            : null;

        // Triplicate return rate (compliance health)
        $triplicateRows = (clone $allShipments)->where('status', 'delivered')->get(['triplicate_received']);
        $triplicateRate = $triplicateRows->count() > 0
            ? round(100 * $triplicateRows->where('triplicate_received', true)->count() / $triplicateRows->count(), 0)
            : null;

        $stats = [
            'total_shipments' => $totalCount,
            'delivered' => $deliveredCount,
            'in_transit' => (clone $allShipments)->whereIn('status', ['dispatched', 'in_transit'])->count(),
            'cancelled' => (clone $allShipments)->where('status', 'cancelled')->count(),
            'avg_transit_days' => $avgTransitDays,
            'on_time_pct' => $onTimePct,
            'triplicate_return_pct' => $triplicateRate,
            'last_used_date' => (clone $allShipments)->whereNotNull('dispatch_date')->max('dispatch_date'),
            'value_handled' => (float) (clone $allShipments)
                ->join('orders', 'orders.id', '=', 'shipments.order_id')
                ->sum('orders.order_value'),
        ];

        return Inertia::render('Transporters/Show', [
            'transporter' => $transporter,
            'shipments' => $shipments,
            'stats' => $stats,
        ]);
    }
}
