<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Inertia\Inertia;
use Inertia\Response;

class ProductShowController extends Controller
{
    public function __invoke(Product $product): Response
    {
        $product->load('stockItems');

        $totalStock = (float) $product->stockItems->sum('qty_closing');

        return Inertia::render('Products/Show', [
            'product' => $product,
            'stats' => [
                'total_stock' => $totalStock,
                'godown_count' => $product->stockItems->count(),
                'is_below_min' => $product->min_order_level !== null && $totalStock < (float) $product->min_order_level,
                'is_below_reorder' => $product->reorder_level !== null && $totalStock <= (float) $product->reorder_level,
            ],
        ]);
    }
}
