<?php

namespace App\Http\Controllers;

use App\Events\OrderStatusChanged;
use App\Http\Requests\StoreOrderRequest;
use App\Http\Requests\UpdateOrderRequest;
use App\Models\AuditLog;
use App\Models\CompanySetting;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\SavedView;
use App\Models\Shipment;
use App\Models\Transporter;
use App\Services\Invoice\InvoiceCalculator;
use App\Services\Ocr\OcrClient;
use App\Support\ImageCompressor;
use App\Support\NumberToWords;
use App\Tenancy\TenantContext;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    public function index(Request $request): Response
    {
        // Query-string filters drive the server-side query. Same names the
        // saved-view config uses, so applying a view just navigates with
        // ?status=...&q=... and the view dropdown round-trips.
        $q = trim((string) $request->query('q', ''));
        $statusFilter = (string) $request->query('status', '');
        $paymentFilter = (string) $request->query('payment_status', '');
        $priorityFilter = (string) $request->query('priority', '');
        $perPage = max(10, min(100, (int) $request->query('per_page', 50)));

        $query = Order::query()
            ->with([
                'customer:id,name',
                'shipments:id,order_id,transporter_id,lr_number,dispatch_date,delivered_date,expected_delivery',
                'shipments.transporter:id,name',
            ])
            ->when($q !== '', fn ($qq) => $qq->where(function ($w) use ($q) {
                $w->where('order_code', 'like', "%{$q}%")
                    ->orWhere('invoice_number', 'like', "%{$q}%")
                    ->orWhereHas('customer', fn ($c) => $c->where('name', 'like', "%{$q}%"))
                    ->orWhereHas('shipments', fn ($s) => $s->where('lr_number', 'like', "%{$q}%"));
            }))
            ->when($statusFilter !== '', fn ($qq) => $qq->where('status', $statusFilter))
            ->when($paymentFilter !== '', fn ($qq) => $qq->where('payment_status', $paymentFilter))
            ->when($priorityFilter !== '', fn ($qq) => $qq->where('priority', $priorityFilter))
            ->orderByDesc('order_date')
            ->orderByDesc('id');

        $paginated = $query->paginate($perPage)->withQueryString();

        return Inertia::render('Orders/Index', [
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
                'status' => $statusFilter,
                'payment_status' => $paymentFilter,
                'priority' => $priorityFilter,
                'per_page' => $perPage,
            ],
            'savedViews' => SavedView::query()
                ->where('user_id', Auth::id())
                ->where('database_type', 'order')
                ->orderByDesc('is_default')
                ->orderBy('name')
                ->get(),
            'transporters' => Transporter::query()->where('status', 'active')->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function kanban(): Response
    {
        return Inertia::render('Orders/Kanban', [
            'rows' => Order::query()
                ->with([
                    'customer:id,name,company',
                    'shipments:id,order_id,transporter_id,lr_number,dispatch_date,delivered_date,expected_delivery',
                ])
                ->orderByDesc('order_date')
                ->orderByDesc('id')
                ->limit(500) // Kanban is a workflow view, not an archive — cap so we never haul thousands
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

        $auditLog = AuditLog::query()
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

    private function productOptions(): Collection
    {
        return Product::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'sku', 'brand', 'unit', 'default_sale_price', 'gst_rate']);
    }

    public function store(StoreOrderRequest $request): RedirectResponse
    {
        $data = $request->orderData();
        $items = $request->lineItems();

        // Order header + line items must persist together or not at all — otherwise
        // a mid-write failure leaves an empty order claiming a code in the sequence.
        DB::transaction(function () use ($data, $items) {
            $data['order_code'] ??= $this->nextOrderCode();
            $data['created_by'] = Auth::id();
            if (! empty($items)) {
                $lineSum = collect($items)->sum(fn ($i) => (float) ($i['line_total'] ?? 0));
                $orderDiscount = max(0.0, (float) ($data['discount_amount'] ?? 0));
                $data['order_value'] = max(0.0, round($lineSum - $orderDiscount, 2));
            }

            $order = Order::create($data);
            $this->syncItems($order, $items);
        });

        // AuditObserver handles 'created' automatically.
        return redirect()->route('orders.index');
    }

    public function update(UpdateOrderRequest $request, Order $order): RedirectResponse
    {
        $data = $request->orderData();
        $items = $request->lineItems();

        DB::transaction(function () use ($order, $data, $items) {
            if (! empty($items)) {
                $lineSum = collect($items)->sum(fn ($i) => (float) ($i['line_total'] ?? 0));
                $orderDiscount = max(0.0, (float) ($data['discount_amount'] ?? $order->discount_amount ?? 0));
                $data['order_value'] = max(0.0, round($lineSum - $orderDiscount, 2));
            }
            $order->update($data);
            $this->syncItems($order, $items);
        });

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
        if (empty($items)) {
            return;
        }

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

            if (! empty($i['id'])) {
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
    public function priceHistory(Request $request): JsonResponse
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
        $company = CompanySetting::current();

        // Log the download as a discrete action — the user did something (got a file)
        // even though no model was mutated.
        AuditLog::record(
            $mode === 'quotation' ? 'quotation_downloaded' : 'invoice_downloaded',
            $order,
            ['order_code' => ['from' => null, 'to' => $order->order_code]],
        );

        // Encode logo + signature as base64 data URIs so DomPDF can embed them without a network fetch
        $logoBase64 = $this->imageAsDataUri($company->logo_path);
        $signatureBase64 = $this->imageAsDataUri($company->signature_path);

        // Single source of truth for all invoice money math (M3). The
        // blade renders this breakdown; it never recomputes tax itself.
        $breakdown = InvoiceCalculator::for($order, $company);
        $amountInWords = NumberToWords::rupees($breakdown->grandTotal);

        $pdf = Pdf::loadView('pdf.order-invoice', [
            'order' => $order,
            'company' => $company,
            'breakdown' => $breakdown,
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
        if (! $relativePath) {
            return null;
        }
        $disk = Storage::disk('public');
        if (! $disk->exists($relativePath)) {
            return null;
        }
        $absolute = $disk->path($relativePath);
        $mime = mime_content_type($absolute) ?: 'image/png';

        return 'data:'.$mime.';base64,'.base64_encode(file_get_contents($absolute));
    }

    /**
     * Bulk update priority and/or payment_status on multiple orders, or assign a
     * transporter across them. Status changes are NOT bulk-applicable because each
     * transition has its own preconditions (LR for dispatched, paid for closed) —
     * row-level updateStatus enforces those.
     *
     * Transporter assign writes to each order's latest shipment. Orders without
     * any shipment yet are skipped (the bulk path doesn't create shipments
     * implicitly — that should be an explicit decision per order).
     */
    public function bulkUpdate(Request $request): RedirectResponse
    {
        $data = $request->validate([
            // Hard cap to stop a tired manager (or a misbehaving script) from
            // submitting an order_ids array with thousands of entries and
            // queueing thousands of UPDATEs in one transaction.
            'order_ids' => ['required', 'array', 'min:1', 'max:500'],
            'order_ids.*' => ['integer', 'exists:orders,id'],
            'priority' => ['nullable', 'in:urgent,high,normal,low'],
            'payment_status' => ['nullable', 'in:not_due,pending,partial,paid,overdue'],
            'transporter_id' => ['nullable', 'integer', 'exists:transporters,id'],
        ]);

        $orderPayload = array_filter(
            ['priority' => $data['priority'] ?? null, 'payment_status' => $data['payment_status'] ?? null],
            fn ($v) => $v !== null,
        );
        $transporterId = $data['transporter_id'] ?? null;

        if (empty($orderPayload) && $transporterId === null) {
            return back()->withErrors(['priority' => 'Choose at least one field to change.']);
        }

        $skipped = 0;
        $orders = Order::whereIn('id', $data['order_ids'])->with('shipments')->get();
        foreach ($orders as $order) {
            if (! empty($orderPayload)) {
                $order->update($orderPayload);
            }
            if ($transporterId !== null) {
                $shipment = $order->shipments->sortByDesc('id')->first();
                if (! $shipment) {
                    $skipped++;

                    continue;
                }
                $shipment->update(['transporter_id' => $transporterId]);
            }
        }

        $msg = ($orders->count() - $skipped).' orders updated';
        if ($skipped > 0) {
            $msg .= " · {$skipped} skipped (no shipment yet)";
        }

        return back()->with('success', $msg);
    }

    public function updateStatus(Request $request, Order $order): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:new_order,confirmed,stock_check,packing,packed,ready_for_dispatch,dispatched,delivered,closed,on_hold,cancelled'],
        ]);

        // LR now lives only on shipments — require at least one shipment with an LR before dispatching
        $hasAnyLr = $order->shipments()->whereNotNull('lr_number')->exists();

        $errors = [];
        if ($data['status'] === 'dispatched' && ! $hasAnyLr) {
            $errors['status'] = 'Add an LR number on a shipment before marking dispatched.';
        }
        if ($data['status'] === 'closed' && $order->payment_status !== 'paid') {
            $errors['status'] = 'Mark payment as paid before closing the order.';
        }
        if ($errors) {
            return back()->withErrors($errors);
        }

        $oldStatus = $order->status;
        $order->update(['status' => $data['status']]);

        // Broadcast to any subscribed clients (kanban, dashboard). When
        // BROADCAST_CONNECTION is 'log' or 'null' this is a no-op; flip to
        // 'reverb' once that server is running.
        OrderStatusChanged::dispatch($order, $oldStatus, $data['status'], Auth::id());

        // dispatch_date / delivered_date are now derived from shipments; nothing to write on the order.
        return back();
    }

    public function toggleLrShared(Order $order): RedirectResponse
    {
        $hasAnyLr = $order->shipments()->whereNotNull('lr_number')->exists();
        if (! $hasAnyLr) {
            return back()->withErrors(['lr_shared' => 'No LR number to share yet — add one on a shipment first.']);
        }

        $next = ! $order->lr_shared_with_customer;
        $order->update(['lr_shared_with_customer' => $next]);

        return back();
    }

    public function toggleTriplicate(Order $order): RedirectResponse
    {
        $next = ! $order->triplicate_received;
        $order->update(['triplicate_received' => $next]);

        return back();
    }

    public function togglePod(Order $order): RedirectResponse
    {
        $next = ! $order->pod_received;
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

        // Evidence (POD / triplicate / LR) is private — store on the local disk and
        // serve via the gated orders.evidence-download route. We never expose these
        // through /storage because they're commercial documents. Stored under the
        // tenant prefix so one tenant's files can't collide with another's.
        $path = $request->file('photo')->store(
            app(TenantContext::class)->storagePath("orders/{$order->id}/{$kind}"),
            'local'
        );

        // Compress the uploaded photo in place (auto-rotate, resize to 2000px max, JPEG q82)
        $absolutePath = Storage::disk('local')->path($path);
        $compressedPath = ImageCompressor::compress($absolutePath);
        if ($compressedPath !== $absolutePath) {
            $path = preg_replace('/\.(png|webp|jpe?g)$/i', '.jpg', $path);
            if (! str_ends_with(strtolower($path), '.jpg')) {
                $path .= '.jpg';
            }
        }

        $url = route('orders.evidence-download', ['order' => $order->id, 'path' => $path]);

        // The photo storage moved to shipments. Each evidence type writes to the latest shipment,
        // creating a planning shipment on the fly if none exists yet (LR can be captured before
        // a shipment has been formally created).
        $shipment = $order->shipments()->latest('id')->first();
        if (! $shipment) {
            $shipment = $order->shipments()->create([
                'shipment_code' => Shipment::generateCode(),
                'status' => 'planning',
                'created_by' => Auth::id(),
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
                if (! $shipment->dispatch_date) {
                    $shipmentPayload['dispatch_date'] = now()->toDateString();
                }
            }
        }

        if ($kind === 'pod') {
            $orderPayload['pod_received'] = true;
            $shipmentPayload['pod_received'] = true;
            if ($order->status === 'dispatched') {
                $orderPayload['status'] = 'delivered';
                if (! $shipment->delivered_date) {
                    $shipmentPayload['delivered_date'] = now()->toDateString();
                }
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
        if (! empty($shipmentPayload)) {
            $shipment->update($shipmentPayload);
        }
        if (! empty($orderPayload)) {
            $order->update($orderPayload);
        }

        AuditLog::record('evidence_uploaded', $order, [
            'kind' => ['from' => null, 'to' => $kind],
            'file' => ['from' => null, 'to' => $url],
        ]);

        return back();
    }

    /**
     * Stream a private evidence file (POD/triplicate/LR/parcel photo) to an
     * authenticated user. The path must live under orders/{order}/ so the user
     * can't traverse outside the order's directory.
     */
    public function downloadEvidence(Request $request, Order $order): \Symfony\Component\HttpFoundation\Response
    {
        $path = (string) $request->query('path', '');
        $context = app(TenantContext::class);
        // The path MUST start with the active tenant's storage prefix +
        // "/orders/{order_id}/". Accepts the legacy non-tenant-prefixed
        // path for files uploaded before P1.4c (single-tenant era), so
        // historical evidence still downloads.
        $expectedTenantPath = $context->has()
            ? $context->current()->storagePrefix()."/orders/{$order->id}/"
            : null;
        $legacyPath = "orders/{$order->id}/";

        $isValid = ($expectedTenantPath && str_starts_with($path, $expectedTenantPath))
            || str_starts_with($path, $legacyPath);

        if (! $isValid || str_contains($path, '..') || str_contains($path, "\0")) {
            abort(404);
        }
        if (! Storage::disk('local')->exists($path)) {
            abort(404);
        }

        return Storage::disk('local')->response($path);
    }

    /**
     * Run OCR on an uploaded evidence image and return the suggested field
     * values without persisting anything. The UI can pre-fill the matching
     * fields (LR number for `lr`, delivered date for `pod`, etc.) so the
     * user confirms instead of typing.
     *
     * Demo mode (OCR_ENABLED=false) returns canned data — see OcrClient.
     */
    public function extractEvidence(Request $request, Order $order, string $kind): JsonResponse
    {
        $allowed = ['pod', 'triplicate', 'lr', 'parcel'];
        abort_unless(in_array($kind, $allowed, true), 422);

        $request->validate([
            'photo' => ['required', 'image', 'max:10240'],
        ]);

        // Stash on the local disk in a temp path so the OCR client can read
        // by filesystem path. We don't persist — the upload endpoint is
        // the one that commits; this is suggest-only. Tenant-scoped path.
        $tmpPath = $request->file('photo')->store(
            app(TenantContext::class)->storagePath("orders/{$order->id}/_ocr_tmp"),
            'local'
        );
        $absolutePath = Storage::disk('local')->path($tmpPath);

        try {
            $result = app(OcrClient::class)->extract($absolutePath, $kind);
        } finally {
            // Clean up the temp upload regardless of outcome.
            Storage::disk('local')->delete($tmpPath);
        }

        return response()->json($result);
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

        // Per-role field whitelist (defence in depth: route middleware already gates
        // who can hit this endpoint, but accounts shouldn't be able to flip priority
        // and warehouse shouldn't be able to touch payment_status).
        $role = $request->user()?->role;
        $allowed = match ($role) {
            'owner', 'manager' => ['invoice_number', 'payment_status', 'priority', 'internal_notes'],
            'accounts' => ['invoice_number', 'payment_status', 'internal_notes'],
            'warehouse' => ['priority', 'internal_notes'],
            default => [],
        };
        if (empty($allowed)) {
            abort(403, 'Your role cannot quick-update orders.');
        }

        $rules = array_intersect_key($rules, array_flip($allowed));
        $data = $request->validate(array_intersect_key($rules, $request->all()));
        $order->update($data);

        return back();
    }

    private function nextOrderCode(): string
    {
        // Serialize code allocation across concurrent requests. Cache::lock works on
        // file/redis drivers; the read+compute+return runs inside the lock so two
        // simultaneous order creates can't claim the same ORD-YYYY-NNNN.
        return Cache::lock('order-code:next', 10)->block(5, function () {
            $year = now()->year;
            $prefix = "ORD-{$year}-";
            $lastNum = DB::table('orders')
                ->where('order_code', 'like', "{$prefix}%")
                ->orderByDesc('id')
                ->value('order_code');

            $next = $lastNum ? (int) substr($lastNum, strlen($prefix)) + 1 : 1;

            return $prefix.str_pad((string) $next, 4, '0', STR_PAD_LEFT);
        });
    }
}
