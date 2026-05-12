<?php

namespace App\Http\Controllers;

use App\Models\CompanySetting;
use App\Models\Order;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Public order tracking — accessed by customers via an unguessable UUID URL.
 * No auth, but no sensitive data either: prices/qty are shown (the customer
 * placed the order), but internal notes, audit log, and payment details
 * stay private.
 */
class TrackingController extends Controller
{
    public function show(string $uuid): Response
    {
        $order = Order::query()
            ->where('tracking_uuid', $uuid)
            ->with([
                'customer:id,name,company,city',
                'items:id,order_id,product_name,qty_ordered,unit,unit_price,line_total',
                'shipments:id,order_id,transporter_id,lr_number,dispatch_date,delivered_date,expected_delivery,status',
                'shipments.transporter:id,name',
            ])
            ->firstOrFail(['id', 'order_code', 'tracking_uuid', 'customer_id', 'order_date',
                'customer_reference_number', 'customer_po_number', 'brands', 'order_value',
                'status', 'lr_shared_with_customer', 'pod_received', 'triplicate_received',
            ]);

        $company = CompanySetting::current();

        return Inertia::render('Tracking/Show', [
            'order' => $order,
            'company' => [
                'name' => $company->company_name ?? config('app.name'),
                'phone' => $company->phone ?? null,
                'email' => $company->email ?? null,
            ],
        ]);
    }
}
