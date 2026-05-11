<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Read-only — products come from the Tally sync bridge.
 */
class ProductController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Product::query()->with('stockItems');

        if ($q = $request->string('q')->trim()->value()) {
            $query->where(function ($w) use ($q) {
                $w->where('name', 'like', "%{$q}%")
                    ->orWhere('sku', 'like', "%{$q}%")
                    ->orWhere('brand', 'like', "%{$q}%")
                    ->orWhere('hsn_code', 'like', "%{$q}%");
            });
        }

        $rows = $query->orderBy('name')->paginate(50)->withQueryString();

        $peek = null;
        if ($peekId = $request->integer('peek')) {
            $peek = Product::with('stockItems')->find($peekId);
        }

        return Inertia::render('Products/Index', [
            'rows' => $rows->items(),
            'pagination' => [
                'total' => $rows->total(),
                'per_page' => $rows->perPage(),
                'current_page' => $rows->currentPage(),
                'last_page' => $rows->lastPage(),
            ],
            'filters' => ['q' => $q ?? ''],
            'peek' => $peek,
        ]);
    }
}
