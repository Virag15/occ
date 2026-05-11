<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\Order;
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

    public function create(): Response
    {
        return Inertia::render('Orders/Create', [
            'customers' => Customer::query()->orderBy('name')->get(['id', 'name', 'company']),
            'transporters' => Transporter::query()->where('status', 'active')->orderBy('name')->get(['id', 'name']),
            'nextOrderCode' => $this->nextOrderCode(),
        ]);
    }

    public function edit(Order $order): Response
    {
        return Inertia::render('Orders/Edit', [
            'order' => $order->load(['customer:id,name,company', 'transporter:id,name']),
            'customers' => Customer::query()->orderBy('name')->get(['id', 'name', 'company']),
            'transporters' => Transporter::query()->where('status', 'active')->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);
        $data['order_code'] ??= $this->nextOrderCode();
        $data['created_by'] = Auth::id();

        $order = Order::create($data);

        AuditLog::create([
            'user_id' => Auth::id(),
            'entity_type' => 'order',
            'entity_id' => $order->id,
            'action' => 'created',
            'changes' => ['status' => ['from' => null, 'to' => $order->status]],
        ]);

        return redirect()->route('orders.index');
    }

    public function update(Request $request, Order $order): RedirectResponse
    {
        $data = $this->validated($request);
        $oldStatus = $order->status;
        $oldPaymentStatus = $order->payment_status;

        $order->update($data);

        $changes = [];
        if ($oldStatus !== $order->status) {
            $changes['status'] = ['from' => $oldStatus, 'to' => $order->status];
        }
        if ($oldPaymentStatus !== $order->payment_status) {
            $changes['payment_status'] = ['from' => $oldPaymentStatus, 'to' => $order->payment_status];
        }

        if ($changes) {
            AuditLog::create([
                'user_id' => Auth::id(),
                'entity_type' => 'order',
                'entity_id' => $order->id,
                'action' => 'status_changed',
                'changes' => $changes,
            ]);
        }

        return redirect()->route('orders.index');
    }

    public function destroy(Order $order): RedirectResponse
    {
        $order->delete();
        return redirect()->route('orders.index');
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
