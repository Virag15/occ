<?php

namespace App\Http\Controllers;

use App\Jobs\SyncEntityToTally;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function index(Request $request): Response
    {
        $rows = Product::query()->orderBy('name')->get();

        return Inertia::render('Products/Index', [
            'rows' => $rows,
            'pagination' => ['total' => $rows->count(), 'per_page' => 50, 'current_page' => 1, 'last_page' => 1],
            'filters' => ['q' => $request->string('q')->value()],
            'peek' => null,
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
        $data['tally_id'] ??= 'LOCAL-' . Str::upper(Str::random(10));

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
            'is_active' => ['nullable', 'boolean'],
        ]);
    }
}
