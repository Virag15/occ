<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ReturnCase extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'returns';

    public const STATUSES = ['reported', 'under_inspection', 'resolved', 'rejected'];
    public const RESOLUTION_TYPES = ['replacement', 'credit_note', 'refund', 'repair'];

    protected $fillable = [
        'case_code', 'related_order_id', 'customer_id', 'case_title',
        'date_reported', 'case_type', 'brand', 'item_description',
        'quantity_affected', 'value_at_risk', 'reason_detail',
        'evidence_photo_urls', 'customer_communication_urls',
        'reported_via', 'severity', 'case_status',
        'inspection_started_at', 'inspected_by',
        'resolution_type', 'resolution_date', 'resolved_by',
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
            'inspection_started_at' => 'datetime',
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

    public function items(): HasMany
    {
        return $this->hasMany(ReturnItem::class, 'return_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function inspector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'inspected_by');
    }

    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}
