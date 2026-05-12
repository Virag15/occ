<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TallySyncLog extends Model
{
    use HasFactory;

    public const STATUSES = ['running', 'success', 'partial', 'failed', 'demo'];

    public const ENTITY_TYPES = ['customers', 'products', 'stock', 'vouchers', 'all'];

    protected $fillable = [
        'entity_type', 'direction', 'status',
        'records_processed', 'records_created', 'records_updated', 'records_failed',
        'error_message', 'sample_payload',
        'started_at', 'completed_at', 'triggered_by',
    ];

    protected function casts(): array
    {
        return [
            'sample_payload' => 'array',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function trigger(): BelongsTo
    {
        return $this->belongsTo(User::class, 'triggered_by');
    }

    public function getDurationSecondsAttribute(): ?float
    {
        if (! $this->started_at || ! $this->completed_at) {
            return null;
        }

        return round($this->completed_at->diffInMilliseconds($this->started_at) / 1000, 2);
    }
}
