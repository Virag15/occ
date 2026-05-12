<?php

namespace App\Http\Controllers;

use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ProductShowController extends Controller
{
    public function __invoke(Product $product): Response
    {
        $product->load('stockItems');

        $totalStock = (float) $product->stockItems->sum('qty_closing');

        // ─── Sales analytics ─────────────────────────────────────────
        // OrderItems joined to orders so we get the order_date for grouping.
        $base = OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('order_items.product_id', $product->id);

        $totalQtySold = (float) (clone $base)->sum('order_items.qty_ordered');
        $totalRevenue = (float) (clone $base)->sum('order_items.line_total');
        $orderCount = (int) (clone $base)->distinct('order_items.order_id')->count('order_items.order_id');
        $avgSalePrice = $totalQtySold > 0 ? round($totalRevenue / $totalQtySold, 2) : 0.0;

        // Top 5 buyers — sum qty across all this product's lines
        $topBuyers = OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('customers', 'customers.id', '=', 'orders.customer_id')
            ->where('order_items.product_id', $product->id)
            ->selectRaw('customers.id, customers.name, customers.company, SUM(order_items.qty_ordered) as qty, SUM(order_items.line_total) as revenue, COUNT(DISTINCT orders.id) as orders')
            ->groupBy('customers.id', 'customers.name', 'customers.company')
            ->orderByDesc('qty')
            ->limit(5)
            ->get();

        // Monthly volume — same 12-month skeleton pattern as Customer Show
        $monthly = [];
        for ($i = 11; $i >= 0; $i--) {
            $d = now()->subMonths($i);
            $monthly[$d->format('Y-m')] = [
                'month' => $d->format('Y-m'),
                'label' => $d->format('M'),
                'qty' => 0.0,
                'revenue' => 0.0,
            ];
        }
        $driver = DB::getDriverName();
        $monthExpr = $driver === 'sqlite' ? "strftime('%Y-%m', orders.order_date)" : "to_char(orders.order_date, 'YYYY-MM')";
        $rows = OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('order_items.product_id', $product->id)
            ->where('orders.order_date', '>=', now()->subMonths(11)->startOfMonth()->toDateString())
            ->selectRaw("{$monthExpr} as ym, COALESCE(SUM(order_items.qty_ordered), 0) as qty, COALESCE(SUM(order_items.line_total), 0) as revenue")
            ->groupBy('ym')
            ->get();
        foreach ($rows as $r) {
            if (isset($monthly[$r->ym])) {
                $monthly[$r->ym]['qty'] = (float) $r->qty;
                $monthly[$r->ym]['revenue'] = (float) $r->revenue;
            }
        }

        return Inertia::render('Products/Show', [
            'product' => $product,
            'stats' => [
                'total_stock' => $totalStock,
                'godown_count' => $product->stockItems->count(),
                'is_below_min' => $product->min_order_level !== null && $totalStock < (float) $product->min_order_level,
                'is_below_reorder' => $product->reorder_level !== null && $totalStock <= (float) $product->reorder_level,
                'total_qty_sold' => $totalQtySold,
                'total_revenue' => $totalRevenue,
                'order_count' => $orderCount,
                'avg_sale_price' => $avgSalePrice,
            ],
            'top_buyers' => $topBuyers,
            'monthly_sales' => array_values($monthly),
        ]);
    }
}
