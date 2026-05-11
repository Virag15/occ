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
            'rows' => Order::query()
                ->with(['customer:id,name', 'transporter:id,name'])
                ->orderByDesc('order_date')
                ->orderByDesc('id')
                ->get(),
        ]);
    }

    public function show(Order $order): Response
    {
        $order->load([
            'customer',
            'transporter',
            'creator:id,name',
            'items.product:id,name,sku',
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
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Orders/Create', [
            'customers' => Customer::query()->orderBy('name')->get(['id', 'name', 'company']),
            'transporters' => Transporter::query()->where('status', 'active')->orderBy('name')->get(['id', 'name']),
            'products' => $this->productOptions(),
            'nextOrderCode' => $this->nextOrderCode(),
        ]);
    }

    public function edit(Order $order): Response
    {
        return Inertia::render('Orders/Edit', [
            'order' => $order->load(['customer:id,name,company', 'transporter:id,name', 'items']),
            'customers' => Customer::query()->orderBy('name')->get(['id', 'name', 'company']),
            'transporters' => Transporter::query()->where('status', 'active')->orderBy('name')->get(['id', 'name']),
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
        // Derive order_value from sum of line totals when items present
        if (!empty($items)) {
            $data['order_value'] = collect($items)->sum(fn ($i) => (float) ($i['line_total'] ?? 0));
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
            $data['order_value'] = collect($items)->sum(fn ($i) => (float) ($i['line_total'] ?? 0));
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

    public function updateStatus(Request $request, Order $order): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:new_order,confirmed,stock_check,packing,packed,ready_for_dispatch,dispatched,delivered,closed,on_hold,cancelled'],
        ]);

        $errors = [];
        if ($data['status'] === 'dispatched' && !$order->lr_number) {
            $errors['status'] = 'Add an LR number before marking dispatched.';
        }
        if ($data['status'] === 'closed' && $order->payment_status !== 'paid') {
            $errors['status'] = 'Mark payment as paid before closing the order.';
        }
        if ($errors) {
            return back()->withErrors($errors);
        }

        $payload = ['status' => $data['status']];
        if ($data['status'] === 'dispatched' && !$order->dispatch_date) {
            $payload['dispatch_date'] = now()->toDateString();
        }
        if ($data['status'] === 'delivered' && !$order->delivered_date) {
            $payload['delivered_date'] = now()->toDateString();
        }

        $order->update($payload);
        // AuditObserver writes 'status_changed' automatically.
        return back();
    }

    public function toggleLrShared(Order $order): RedirectResponse
    {
        $next = !$order->lr_shared_with_customer;
        $order->update([
            'lr_shared_with_customer' => $next,
            'lr_shared_at' => $next ? now() : null,
        ]);
        // AuditObserver writes 'lr_shared_toggled' automatically.
        return back();
    }

    public function toggleTriplicate(Order $order): RedirectResponse
    {
        $next = !$order->triplicate_received;
        $order->update([
            'triplicate_received' => $next,
            'triplicate_received_date' => $next ? now()->toDateString() : null,
        ]);
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
        ]);

        $path = $request->file('photo')->store("orders/{$order->id}/{$kind}", 'public');
        $url = \Illuminate\Support\Facades\Storage::url($path);

        $fieldMap = [
            'pod' => 'pod_photo_url',
            'triplicate' => 'triplicate_photo_url',
            'lr' => 'lr_photo_url',
            'parcel' => 'parcel_photo_url',
        ];
        $field = $fieldMap[$kind];

        $existing = is_array($order->{$field}) ? $order->{$field} : [];
        $existing[] = $url;

        $payload = [$field => $existing];
        if ($kind === 'pod') $payload['pod_received'] = true;
        if ($kind === 'triplicate') {
            $payload['triplicate_received'] = true;
            $payload['triplicate_received_date'] = now()->toDateString();
        }

        $order->update($payload);
        return back();
    }

    public function quickUpdate(Request $request, Order $order): RedirectResponse
    {
        $rules = [
            'lr_number' => ['nullable', 'string', 'max:50'],
            'vehicle_number' => ['nullable', 'string', 'max:20'],
            'driver_name' => ['nullable', 'string', 'max:255'],
            'driver_contact' => ['nullable', 'string', 'max:20'],
            'invoice_number' => ['nullable', 'string', 'max:50'],
            'amount_received' => ['nullable', 'numeric', 'min:0'],
            'payment_received_date' => ['nullable', 'date'],
            'payment_mode' => ['nullable', 'in:neft,rtgs,upi,cheque,cash'],
            'payment_status' => ['nullable', 'in:not_due,pending,partial,paid,overdue'],
            'expected_delivery' => ['nullable', 'date'],
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
        return $request->validate([
            'order_code' => ['nullable', 'string', 'max:20'],
            'customer_id' => ['required', 'exists:customers,id'],
            'order_date' => ['required', 'date'],
            'order_source' => ['nullable', 'in:whatsapp,email,phone,in_person,po'],
            'brands' => ['nullable', 'array'],
            'brands.*' => ['string'],
            'order_value' => ['nullable', 'numeric', 'min:0'],
            'status' => ['required', 'in:new_order,confirmed,stock_check,packing,packed,ready_for_dispatch,dispatched,delivered,closed,on_hold,cancelled'],
            'priority' => ['required', 'in:urgent,high,normal,low'],

            'packing_slip_generated' => ['nullable', 'boolean'],
            'packed_by' => ['nullable', 'string', 'max:255'],
            'items_packed_count' => ['nullable', 'integer', 'min:0'],
            'parcel_weight_kg' => ['nullable', 'numeric', 'min:0'],
            'number_of_boxes' => ['nullable', 'integer', 'min:0'],

            'pickup_scheduled_date' => ['nullable', 'date'],
            'transporter_id' => ['nullable', 'exists:transporters,id'],
            'driver_name' => ['nullable', 'string', 'max:255'],
            'driver_contact' => ['nullable', 'string', 'max:20'],
            'vehicle_number' => ['nullable', 'string', 'max:20'],
            'dispatch_date' => ['nullable', 'date'],
            'lr_number' => ['nullable', 'string', 'max:50'],
            'lr_shared_with_customer' => ['nullable', 'boolean'],
            'expected_delivery' => ['nullable', 'date'],

            'delivered_date' => ['nullable', 'date'],
            'pod_received' => ['nullable', 'boolean'],
            'triplicate_received' => ['nullable', 'boolean'],
            'triplicate_received_date' => ['nullable', 'date'],

            'invoice_number' => ['nullable', 'string', 'max:50'],
            'invoice_date' => ['nullable', 'date'],
            'payment_terms' => ['nullable', 'in:advance,cod,7_days,15_days,30_days,45_days,60_days'],
            'payment_due_date' => ['nullable', 'date'],
            'payment_status' => ['required', 'in:not_due,pending,partial,paid,overdue'],
            'amount_received' => ['nullable', 'numeric', 'min:0'],
            'payment_received_date' => ['nullable', 'date'],
            'payment_mode' => ['nullable', 'in:neft,rtgs,upi,cheque,cash'],

            'internal_notes' => ['nullable', 'string'],
        ]);
    }
}
