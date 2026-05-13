<?php

namespace App\Http\Requests;

use App\Models\Order;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route middleware already gates by role; this is a redundant check that
        // also guards if the request is ever wired into a different route group.
        return in_array($this->user()?->role, ['owner', 'manager'], true);
    }

    /**
     * Rules for creating an order. Shipment-level fields (LR, dispatch_date,
     * vehicle) and payment-ledger fields (paid_on, amount) live elsewhere —
     * keep this surface to what's actually a column on `orders`.
     */
    public function rules(): array
    {
        return [
            'order_code' => ['nullable', 'string', 'max:20'],
            'customer_id' => ['required', 'exists:customers,id'],
            'order_date' => ['required', 'date'],
            'order_source' => ['nullable', Rule::in(['whatsapp', 'email', 'phone', 'in_person', 'po'])],
            'customer_reference_number' => ['nullable', 'string', 'max:100'],
            'customer_po_number' => ['nullable', 'string', 'max:100'],
            'brands' => ['nullable', 'array'],
            'brands.*' => ['string'],
            'order_value' => ['nullable', 'numeric', 'min:0'],
            'discount_amount' => ['nullable', 'numeric', 'min:0'],
            'status' => ['required', Rule::in(Order::STATUSES)],
            'priority' => ['required', Rule::in(Order::PRIORITIES)],
            'lr_shared_with_customer' => ['nullable', 'boolean'],
            'pod_received' => ['nullable', 'boolean'],
            'triplicate_received' => ['nullable', 'boolean'],
            'invoice_number' => ['nullable', 'string', 'max:50'],
            'invoice_date' => ['nullable', 'date'],
            'payment_terms' => ['nullable', Rule::in(['advance', 'cod', '7_days', '15_days', '30_days', '45_days', '60_days'])],
            'payment_due_date' => ['nullable', 'date'],
            'payment_status' => ['required', Rule::in(Order::PAYMENT_STATUSES)],
            'internal_notes' => ['nullable', 'string'],

            // Line items validated together so the request fails atomically if
            // any line item is malformed.
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
        ];
    }

    /**
     * Order-header subset of the validated payload, ready for Order::create().
     */
    public function orderData(): array
    {
        $data = $this->validated();
        unset($data['items']);

        return $data;
    }

    /** @return array<int, array<string,mixed>> */
    public function lineItems(): array
    {
        return $this->validated()['items'] ?? [];
    }
}
