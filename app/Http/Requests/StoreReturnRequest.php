<?php

namespace App\Http\Requests;

use App\Models\ReturnItem;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreReturnRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['owner', 'manager', 'accounts', 'warehouse'], true);
    }

    public function rules(): array
    {
        return [
            'related_order_id' => ['required', 'exists:orders,id'],
            'customer_id' => ['required', 'exists:customers,id'],
            'date_reported' => ['required', 'date'],
            'severity' => ['nullable', Rule::in(['low', 'medium', 'high', 'critical'])],
            'reported_via' => ['nullable', Rule::in(['whatsapp', 'phone', 'email', 'in_person'])],
            'case_title' => ['nullable', 'string', 'max:255'],
            'reason_detail' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.order_item_id' => ['required', 'integer', 'exists:order_items,id'],
            'items.*.qty_returned' => ['required', 'numeric', 'min:0.001'],
            'items.*.condition' => ['required', Rule::in(ReturnItem::CONDITIONS)],
            'items.*.reason' => ['nullable', 'string'],
        ];
    }
}
