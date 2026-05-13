<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $entity_type
 * @property string $direction
 * @property string $status
 * @property int $records_processed
 * @property int $records_created
 * @property int $records_updated
 * @property int $records_failed
 * @property string|null $error_message
 * @property array<string,mixed>|null $sample_payload
 * @property Carbon|null $started_at
 * @property Carbon|null $completed_at
 * @property int|null $triggered_by
 * @property-read User|null $trigger
 * @property-read float|null $duration_seconds
 */
class TallySyncLog extends Model
{
    use BelongsToTenant, HasFactory;

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
