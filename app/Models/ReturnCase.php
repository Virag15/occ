<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReturnCase extends Model
{
    use HasFactory;

    protected $table = 'returns';

    protected $fillable = [
        'case_code', 'related_order_id', 'customer_id', 'case_title',
        'date_reported', 'case_type', 'brand', 'item_description',
        'quantity_affected', 'value_at_risk', 'reason_detail',
        'evidence_photo_urls', 'customer_communication_urls',
        'reported_via', 'severity', 'case_status',
        'resolution_type', 'resolution_date',
        'replacement_lr_number', 'credit_note_number',
        'responsible_party', 'internal_notes', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'date_reported' => 'date',
            'value_at_risk' => 'decimal:2',
            'evidence_photo_urls' => 'array',
            'customer_communication_urls' => 'array',
            'resolution_date' => 'date',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'related_order_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
