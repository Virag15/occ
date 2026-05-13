<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['owner', 'manager', 'accounts'], true);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'company' => ['nullable', 'string', 'max:255'],
            'gstin' => ['nullable', 'string', 'max:15'],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
            'whatsapp' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'billing_address' => ['nullable', 'string'],
            'delivery_address' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'payment_terms' => ['nullable', Rule::in(['advance', 'cod', '7_days', '15_days', '30_days', '45_days', '60_days'])],
            'credit_limit' => ['nullable', 'numeric', 'min:0'],
            'customer_type' => ['nullable', Rule::in(['dealer', 'contractor', 'oem', 'end_user', 'government'])],
            'status' => ['nullable', Rule::in(['active', 'inactive', 'credit_hold', 'new'])],
            'notes' => ['nullable', 'string'],
        ];
    }
}
