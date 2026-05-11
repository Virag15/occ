<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Order;
use Inertia\Inertia;
use Inertia\Response;

class CustomerShowController extends Controller
{
    public function __invoke(Customer $customer): Response
    {
        $orders = Order::query()
            ->where('customer_id', $customer->id)
            ->with('transporter:id,name')
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

        return Inertia::render('Customers/Show', [
            'customer' => $customer,
            'orders' => $orders,
            'stats' => $stats,
            'brand_frequency' => $brandTallies,
        ]);
    }
}
