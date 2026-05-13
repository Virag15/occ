<?php

namespace App\Http\Requests;

use App\Models\ReturnCase;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ResolveReturnRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['owner', 'manager', 'accounts', 'warehouse'], true);
    }

    public function rules(): array
    {
        return [
            'resolution_type' => ['required', Rule::in(ReturnCase::RESOLUTION_TYPES)],
            'resolution_date' => ['nullable', 'date'],
            'credit_note_number' => ['nullable', 'string', 'max:50'],
            'replacement_lr_number' => ['nullable', 'string', 'max:50'],
            'internal_notes' => ['nullable', 'string'],
        ];
    }
}
