<?php

namespace App\Http\Controllers;

use App\Jobs\SyncEntityToTally;
use App\Models\Product;
use App\Models\SavedView;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function index(Request $request): Response
    {
        $q = trim((string) $request->query('q', ''));
        $brandFilter = (string) $request->query('brand', '');
        $activeFilter = (string) $request->query('active', ''); // '', 'active', 'inactive'
        $perPage = max(10, min(100, (int) $request->query('per_page', 50)));

        $paginated = Product::query()
            ->withSum('stockItems as total_stock', 'qty_closing')
            ->when($q !== '', fn ($qq) => $qq->where(function ($w) use ($q) {
                $w->where('name', 'like', "%{$q}%")
                    ->orWhere('sku', 'like', "%{$q}%")
                    ->orWhere('brand', 'like', "%{$q}%")
                    ->orWhere('hsn_code', 'like', "%{$q}%");
            }))
            ->when($brandFilter !== '', fn ($qq) => $qq->where('brand', $brandFilter))
            ->when($activeFilter === 'active', fn ($qq) => $qq->where('is_active', true))
            ->when($activeFilter === 'inactive', fn ($qq) => $qq->where('is_active', false))
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        // Brand options for the filter dropdown — distinct brands across the full table.
        $brands = Product::query()->whereNotNull('brand')->distinct()->orderBy('brand')->pluck('brand');

        return Inertia::render('Products/Index', [
            'rows' => $paginated->items(),
            'pagination' => [
                'total' => $paginated->total(),
                'per_page' => $paginated->perPage(),
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'from' => $paginated->firstItem(),
                'to' => $paginated->lastItem(),
            ],
            'filters' => [
                'q' => $q,
                'brand' => $brandFilter,
                'active' => $activeFilter,
                'per_page' => $perPage,
            ],
            'brands' => $brands,
            'savedViews' => SavedView::query()
                ->where('user_id', Auth::id())
                ->where('database_type', 'product')
                ->orderByDesc('is_default')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Products/Create');
    }

    public function edit(Product $product): Response
    {
        return Inertia::render('Products/Edit', ['product' => $product->load('stockItems')]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);
        $data['tally_id'] ??= 'LOCAL-'.Str::upper(Str::random(10));

        $product = Product::create($data);
        SyncEntityToTally::dispatch($product, 'created');

        return redirect()->route('products.index');
    }

    public function update(Request $request, Product $product): RedirectResponse
    {
        $product->update($this->validated($request));
        SyncEntityToTally::dispatch($product, 'updated');

        return redirect()->route('products.index');
    }

    public function destroy(Product $product): RedirectResponse
    {
        SyncEntityToTally::dispatch($product, 'deleted');
        $product->delete();

        return redirect()->route('products.index');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'sku' => ['nullable', 'string', 'max:100'],
            'name' => ['required', 'string', 'max:255'],
            'brand' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'hsn_code' => ['nullable', 'string', 'max:20'],
            'unit' => ['nullable', 'string', 'max:20'],
            'gst_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'mrp' => ['nullable', 'numeric', 'min:0'],
            'default_sale_price' => ['nullable', 'numeric', 'min:0'],
            'default_purchase_price' => ['nullable', 'numeric', 'min:0'],
            'min_order_level' => ['nullable', 'numeric', 'min:0'],
            'reorder_level' => ['nullable', 'numeric', 'min:0'],
            'negative_stock_reason' => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
        ]);
    }
}
