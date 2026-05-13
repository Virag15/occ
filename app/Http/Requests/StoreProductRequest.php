<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['owner', 'manager'], true);
    }

    public function rules(): array
    {
        return [
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
        ];
    }
}
