<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTransporterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['owner', 'manager'], true);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'primary_phone' => ['nullable', 'string', 'max:20'],
            'secondary_phone' => ['nullable', 'string', 'max:20'],
            'whatsapp' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'office_address' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:100'],
            'gstin' => ['nullable', 'string', 'max:15'],
            'avg_transit_days' => ['nullable', 'integer', 'min:0', 'max:30'],
            'cost_per_kg' => ['nullable', 'numeric', 'min:0'],
            'triplicate_reliability' => ['nullable', 'integer', 'between:1,5'],
            'payment_terms' => ['nullable', Rule::in(['advance', 'weekly', 'fortnightly', 'monthly'])],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
            'notes' => ['nullable', 'string'],
        ];
    }
}
