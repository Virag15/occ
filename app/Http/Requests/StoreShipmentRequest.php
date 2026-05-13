<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreShipmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['owner', 'manager', 'warehouse'], true);
    }

    public function rules(): array
    {
        return [
            'transporter_id' => ['nullable', 'exists:transporters,id'],
            'pickup_scheduled_date' => ['nullable', 'date'],
            'lr_number' => ['nullable', 'string', 'max:50'],
            'vehicle_number' => ['nullable', 'string', 'max:20'],
            'driver_name' => ['nullable', 'string', 'max:255'],
            'driver_contact' => ['nullable', 'string', 'max:20'],
            'expected_delivery' => ['nullable', 'date'],
            'packed_by' => ['nullable', 'string', 'max:255'],
            'number_of_boxes' => ['nullable', 'integer', 'min:0'],
            'parcel_weight_kg' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.order_item_id' => ['required', 'integer', 'exists:order_items,id'],
            'items.*.qty' => ['required', 'numeric', 'min:0.001'],
        ];
    }
}
