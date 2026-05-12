<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Transporter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Orders/Index', [
            // Closure makes 'rows' lazy so partial reloads (?only=rows) re-run just this query
            'rows' => fn () => Order::query()
                // Eager-load shipments so the order.transporter / lr_number / dispatch_date
                // accessors don't N+1 across the index.
                ->with([
                    'customer:id,name',
                    'shipments:id,order_id,transporter_id,lr_number,dispatch_date,delivered_date,expected_delivery',
                    'shipments.transporter:id,name',
                ])
                ->orderByDesc('order_date')
                ->orderByDesc('id')
                ->get(),
            'savedViews' => \App\Models\SavedView::query()
                ->where('user_id', \Illuminate\Support\Facades\Auth::id())
                ->where('database_type', 'order')
                ->orderByDesc('is_default')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function show(Order $order): Response
    {
        $order->load([
            'customer',
            'creator:id,name',
            'items.product:id,name,sku',
            // shipments must be loaded so order's transporter/lr_number/dispatch_date accessors work
            'shipments.transporter:id,name',
            'shipments.items.orderItem:id,product_name,unit',
            'returns' => fn ($q) => $q->latest('date_reported'),
            'returns.items.orderItem:id,product_name',
            'returns.creator:id,name',
            'payments' => fn ($q) => $q->orderByDesc('paid_on')->orderByDesc('id'),
            'payments.creator:id,name',
        ]);

        $auditLog = \App\Models\AuditLog::query()
            ->where('entity_type', 'order')
            ->where('entity_id', $order->id)
            ->orderByDesc('created_at')
            ->with('user:id,name')
            ->limit(50)
            ->get();

        return Inertia::render('Orders/Show', [
            'order' => $order,
            'auditLog' => $auditLog,
            'transporters' => Transporter::query()
                ->where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Orders/Create', [
            'customers' => Customer::query()->orderBy('name')->get(['id', 'name', 'company']),
            'products' => $this->productOptions(),
            'nextOrderCode' => $this->nextOrderCode(),
        ]);
    }

    public function edit(Order $order): Response
    {
        return Inertia::render('Orders/Edit', [
            'order' => $order->load(['customer:id,name,company', 'items']),
            'customers' => Customer::query()->orderBy('name')->get(['id', 'name', 'company']),
            'products' => $this->productOptions(),
        ]);
    }

    private function productOptions(): \Illuminate\Support\Collection
    {
        return Product::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'sku', 'brand', 'unit', 'default_sale_price', 'gst_rate']);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);
        $items = $this->validatedItems($request);
        $data['order_code'] ??= $this->nextOrderCode();
        $data['created_by'] = Auth::id();
        // Derive order_value from line totals minus the order-level discount
        if (!empty($items)) {
            $lineSum = collect($items)->sum(fn ($i) => (float) ($i['line_total'] ?? 0));
            $orderDiscount = max(0.0, (float) ($data['discount_amount'] ?? 0));
            $data['order_value'] = max(0.0, round($lineSum - $orderDiscount, 2));
        }

        $order = Order::create($data);
        $this->syncItems($order, $items);

        // AuditObserver handles 'created' automatically.
        return redirect()->route('orders.index');
    }

    public function update(Request $request, Order $order): RedirectResponse
    {
        $data = $this->validated($request);
        $items = $this->validatedItems($request);

        if (!empty($items)) {
            $lineSum = collect($items)->sum(fn ($i) => (float) ($i['line_total'] ?? 0));
            $orderDiscount = max(0.0, (float) ($data['discount_amount'] ?? $order->discount_amount ?? 0));
            $data['order_value'] = max(0.0, round($lineSum - $orderDiscount, 2));
        }
        $order->update($data);
        $this->syncItems($order, $items);

        // AuditObserver handles 'updated' / 'status_changed' / 'payment_status_changed' automatically.
        return redirect()->route('orders.index');
    }

    /**
     * Replace the order's line items with the submitted list.
     * Items with `id` get updated (preserving qty_packed/dispatched/etc.);
     * items without `id` are inserted fresh.
     */
    private function syncItems(Order $order, array $items): void
    {
        if (empty($items)) return;

        $keepIds = [];
        foreach ($items as $i) {
            $product = isset($i['product_id']) ? Product::find($i['product_id']) : null;
            $payload = [
                'product_id' => $i['product_id'] ?? null,
                'product_name' => $i['product_name'] ?? ($product?->name ?? 'Unnamed line'),
                'qty_ordered' => $i['qty_ordered'],
                'unit' => $i['unit'] ?? $product?->unit,
                'unit_price' => $i['unit_price'] ?? null,
                'discount_pct' => $i['discount_pct'] ?? 0,
                'tax_rate' => $i['tax_rate'] ?? null,
                'line_total' => $i['line_total'] ?? null,
                'notes' => $i['notes'] ?? null,
            ];

            if (!empty($i['id'])) {
                $oi = OrderItem::where('order_id', $order->id)->find($i['id']);
                if ($oi) {
                    $oi->update($payload);
                    $keepIds[] = $oi->id;
                    continue;
                }
            }

            $created = $order->items()->create($payload + ['status' => 'pending']);
            $keepIds[] = $created->id;
        }

        // Remove any items that weren't in the submitted list
        $order->items()->whereNotIn('id', $keepIds)->delete();
    }

    private function validatedItems(Request $request): array
    {
        if (!$request->has('items')) return [];

        return $request->validate([
            'items' => ['nullable', 'array'],
            'items.*.id' => ['nullable', 'integer'],
            'items.*.product_id' => ['nullable', 'integer', 'exists:products,id'],
            'items.*.product_name' => ['required_with:items', 'string', 'max:255'],
            'items.*.qty_ordered' => ['required_with:items', 'numeric', 'min:0.001'],
            'items.*.unit' => ['nullable', 'string', 'max:20'],
            'items.*.unit_price' => ['nullable', 'numeric', 'min:0'],
            'items.*.discount_pct' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'items.*.tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'items.*.line_total' => ['nullable', 'numeric', 'min:0'],
            'items.*.notes' => ['nullable', 'string'],
        ])['items'] ?? [];
    }

    public function destroy(Order $order): RedirectResponse
    {
        $order->delete();
        return redirect()->route('orders.index');
    }

    /**
     * Lookup the last N times this customer bought this product. Used by the
     * Order Form line item "info" popover so the user can quote a price that's
     * consistent with history (or deliberately deviate).
     */
    public function priceHistory(Request $request): \Illuminate\Http\JsonResponse
    {
        $data = $request->validate([
            'customer_id' => ['required', 'integer', 'exists:customers,id'],
            'product_id' => ['required', 'integer', 'exists:products,id'],
        ]);

        $rows = OrderItem::query()
            ->select(['order_items.id', 'order_items.order_id', 'order_items.qty_ordered', 'order_items.unit_price', 'order_items.discount_pct', 'order_items.tax_rate', 'order_items.line_total'])
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.customer_id', $data['customer_id'])
            ->where('order_items.product_id', $data['product_id'])
            ->where('orders.id', '!=', (int) $request->input('exclude_order_id', 0))
            ->addSelect('orders.order_code', 'orders.order_date', 'orders.status')
            ->orderByDesc('orders.order_date')
            ->orderByDesc('orders.id')
            ->limit(10)
            ->get();

        return response()->json([
            'rows' => $rows,
            'count' => $rows->count(),
        ]);
    }

    public function invoicePdf(Order $order): \Symfony\Component\HttpFoundation\Response
    {
        return $this->renderOrderPdf($order, 'invoice');
    }

    public function quotationPdf(Order $order): \Symfony\Component\HttpFoundation\Response
    {
        return $this->renderOrderPdf($order, 'quotation');
    }

    private function renderOrderPdf(Order $order, string $mode): \Symfony\Component\HttpFoundation\Response
    {
        $order->load(['customer', 'items.product:id,name,sku,hsn_code', 'creator:id,name']);
        $company = \App\Models\CompanySetting::current();

        // Log the download as a discrete action — the user did something (got a file)
        // even though no model was mutated.
        \App\Models\AuditLog::record(
            $mode === 'quotation' ? 'quotation_downloaded' : 'invoice_downloaded',
            $order,
            ['order_code' => ['from' => null, 'to' => $order->order_code]],
        );

        // Encode logo + signature as base64 data URIs so DomPDF can embed them without a network fetch
        $logoBase64 = $this->imageAsDataUri($company->logo_path);
        $signatureBase64 = $this->imageAsDataUri($company->signature_path);

        // Compute the grand total in rupees for "amount in words" — factor line + order discounts
        $grandTotal = 0.0;
        foreach ($order->items as $it) {
            $qty = (float) $it->qty_ordered;
            $rate = (float) ($it->unit_price ?? 0);
            $discPct = (float) ($it->discount_pct ?? 0);
            $taxRate = (float) ($it->tax_rate ?? 0);
            $taxable = $qty * $rate * (1 - $discPct / 100);
            $grandTotal += $taxable + ($taxable * $taxRate / 100);
        }
        $grandTotal = max(0.0, $grandTotal - (float) ($order->discount_amount ?? 0));
        $amountInWords = \App\Support\NumberToWords::rupees($grandTotal);

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.order-invoice', [
            'order' => $order,
            'company' => $company,
            'logoBase64' => $logoBase64,
            'signatureBase64' => $signatureBase64,
            'amountInWords' => $amountInWords,
            'mode' => $mode,
        ])->setPaper('a4', 'portrait');

        $filename = $mode === 'quotation'
            ? "quotation-{$order->order_code}.pdf"
            : "invoice-{$order->order_code}.pdf";

        return $pdf->download($filename);
    }

    private function imageAsDataUri(?string $relativePath): ?string
    {
        if (!$relativePath) return null;
        $disk = \Illuminate\Support\Facades\Storage::disk('public');
        if (!$disk->exists($relativePath)) return null;
        $absolute = $disk->path($relativePath);
        $mime = mime_content_type($absolute) ?: 'image/png';
        return 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($absolute));
    }

    public function updateStatus(Request $request, Order $order): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:new_order,confirmed,stock_check,packing,packed,ready_for_dispatch,dispatched,delivered,closed,on_hold,cancelled'],
        ]);

        // LR now lives only on shipments — require at least one shipment with an LR before dispatching
        $hasAnyLr = $order->shipments()->whereNotNull('lr_number')->exists();

        $errors = [];
        if ($data['status'] === 'dispatched' && !$hasAnyLr) {
            $errors['status'] = 'Add an LR number on a shipment before marking dispatched.';
        }
        if ($data['status'] === 'closed' && $order->payment_status !== 'paid') {
            $errors['status'] = 'Mark payment as paid before closing the order.';
        }
        if ($errors) {
            return back()->withErrors($errors);
        }

        $order->update(['status' => $data['status']]);
        // dispatch_date / delivered_date are now derived from shipments; nothing to write on the order.
        return back();
    }

    public function toggleLrShared(Order $order): RedirectResponse
    {
        $hasAnyLr = $order->shipments()->whereNotNull('lr_number')->exists();
        if (!$hasAnyLr) {
            return back()->withErrors(['lr_shared' => 'No LR number to share yet — add one on a shipment first.']);
        }

        $next = !$order->lr_shared_with_customer;
        $order->update(['lr_shared_with_customer' => $next]);
        return back();
    }

    public function toggleTriplicate(Order $order): RedirectResponse
    {
        $next = !$order->triplicate_received;
        $order->update(['triplicate_received' => $next]);
        return back();
    }

    public function togglePod(Order $order): RedirectResponse
    {
        $next = !$order->pod_received;
        $order->update(['pod_received' => $next]);
        return back();
    }

    public function uploadEvidence(Request $request, Order $order, string $kind): RedirectResponse
    {
        $allowed = ['pod', 'triplicate', 'lr', 'parcel'];
        abort_unless(in_array($kind, $allowed, true), 422);

        $request->validate([
            'photo' => ['required', 'image', 'max:10240'],
            'notes' => ['nullable', 'string', 'max:500'],
            'lr_number' => ['nullable', 'string', 'max:50'],
        ]);

        $path = $request->file('photo')->store("orders/{$order->id}/{$kind}", 'public');

        // Compress the uploaded photo in place (auto-rotate, resize to 2000px max, JPEG q82)
        $absolutePath = \Illuminate\Support\Facades\Storage::disk('public')->path($path);
        $compressedPath = \App\Support\ImageCompressor::compress($absolutePath);
        if ($compressedPath !== $absolutePath) {
            $path = preg_replace('/\.(png|webp|jpe?g)$/i', '.jpg', $path);
            if (!str_ends_with(strtolower($path), '.jpg')) $path .= '.jpg';
        }

        $url = \Illuminate\Support\Facades\Storage::url($path);

        // The photo storage moved to shipments. Each evidence type writes to the latest shipment,
        // creating a planning shipment on the fly if none exists yet (LR can be captured before
        // a shipment has been formally created).
        $shipment = $order->shipments()->latest('id')->first();
        if (!$shipment) {
            $shipment = $order->shipments()->create([
                'shipment_code' => \App\Models\Shipment::generateCode(),
                'status' => 'planning',
                'created_by' => \Illuminate\Support\Facades\Auth::id(),
            ]);
        }

        $shipmentPayload = [];
        $orderPayload = [];

        if ($kind === 'lr') {
            if ($request->filled('lr_number')) {
                $shipmentPayload['lr_number'] = $request->input('lr_number');
            }
            $shipmentPayload['lr_shared_at'] = now();
            $orderPayload['lr_shared_with_customer'] = true;
            // Auto-advance order status if upstream
            if (in_array($order->status, ['packed', 'ready_for_dispatch'], true)) {
                $orderPayload['status'] = 'dispatched';
                if (!$shipment->dispatch_date) $shipmentPayload['dispatch_date'] = now()->toDateString();
            }
        }

        if ($kind === 'pod') {
            $orderPayload['pod_received'] = true;
            $shipmentPayload['pod_received'] = true;
            if ($order->status === 'dispatched') {
                $orderPayload['status'] = 'delivered';
                if (!$shipment->delivered_date) $shipmentPayload['delivered_date'] = now()->toDateString();
            }
        }

        if ($kind === 'triplicate') {
            $orderPayload['triplicate_received'] = true;
            $shipmentPayload['triplicate_received'] = true;
            $shipmentPayload['triplicate_received_date'] = now()->toDateString();
            if ($order->status === 'delivered' && $order->payment_status === 'paid') {
                $orderPayload['status'] = 'closed';
            }
        }

        // The photo URLs are now ephemeral — stored as an action note in audit log.
        // (When we re-add per-shipment photo columns these can persist again.)
        if (!empty($shipmentPayload)) $shipment->update($shipmentPayload);
        if (!empty($orderPayload)) $order->update($orderPayload);

        \App\Models\AuditLog::record('evidence_uploaded', $order, [
            'kind' => ['from' => null, 'to' => $kind],
            'file' => ['from' => null, 'to' => $url],
        ]);

        return back();
    }

    public function quickUpdate(Request $request, Order $order): RedirectResponse
    {
        // Per-shipment fields (LR / dispatch / vehicle / driver) are no longer
        // editable inline from the order. Open the Order page to edit a shipment.
        $rules = [
            'invoice_number' => ['nullable', 'string', 'max:50'],
            'payment_status' => ['nullable', 'in:not_due,pending,partial,paid,overdue'],
            'priority' => ['nullable', 'in:urgent,high,normal,low'],
            'internal_notes' => ['nullable', 'string'],
        ];

        $data = $request->validate(array_intersect_key($rules, $request->all()));
        $order->update($data);

        return back();
    }

    private function nextOrderCode(): string
    {
        $year = now()->year;
        $prefix = "ORD-{$year}-";
        $lastNum = DB::table('orders')
            ->where('order_code', 'like', "{$prefix}%")
            ->orderByDesc('id')
            ->value('order_code');

        $next = $lastNum ? (int) substr($lastNum, strlen($prefix)) + 1 : 1;
        return $prefix . str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }

    private function validated(Request $request): array
    {
        // Only order-level fields validate here. Dispatch / LR / packing fields live
        // on shipments and are validated by ShipmentController. Payment fields are
        // either denormalized cache or live on the payments table.
        return $request->validate([
            'order_code' => ['nullable', 'string', 'max:20'],
            'customer_id' => ['required', 'exists:customers,id'],
            'order_date' => ['required', 'date'],
            'order_source' => ['nullable', 'in:whatsapp,email,phone,in_person,po'],
            'customer_reference_number' => ['nullable', 'string', 'max:100'],
            'customer_po_number' => ['nullable', 'string', 'max:100'],
            'brands' => ['nullable', 'array'],
            'brands.*' => ['string'],
            'order_value' => ['nullable', 'numeric', 'min:0'],
            'discount_amount' => ['nullable', 'numeric', 'min:0'],
            'status' => ['required', 'in:new_order,confirmed,stock_check,packing,packed,ready_for_dispatch,dispatched,delivered,closed,on_hold,cancelled'],
            'priority' => ['required', 'in:urgent,high,normal,low'],

            // Order-level aggregate flags (not duplicates of shipment data)
            'lr_shared_with_customer' => ['nullable', 'boolean'],
            'pod_received' => ['nullable', 'boolean'],
            'triplicate_received' => ['nullable', 'boolean'],

            // Invoice + payment metadata (amount_received is recomputed from payments)
            'invoice_number' => ['nullable', 'string', 'max:50'],
            'invoice_date' => ['nullable', 'date'],
            'payment_terms' => ['nullable', 'in:advance,cod,7_days,15_days,30_days,45_days,60_days'],
            'payment_due_date' => ['nullable', 'date'],
            'payment_status' => ['required', 'in:not_due,pending,partial,paid,overdue'],

            'internal_notes' => ['nullable', 'string'],
        ]);
    }
}
