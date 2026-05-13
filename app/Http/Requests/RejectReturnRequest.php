<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RejectReturnRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['owner', 'manager', 'accounts', 'warehouse'], true);
    }

    public function rules(): array
    {
        return [
            'internal_notes' => ['nullable', 'string'],
        ];
    }
}
