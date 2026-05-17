<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * One row per client-supplied Idempotency-Key (M7-B). Deliberately NOT
 * tenant-scoped via the global scope: the middleware claims/looks up
 * rows before the tenant guard is meaningful, and the key itself is a
 * globally-unique UUID. tenant_id is recorded for audit/pruning only.
 */
class IdempotencyKey extends Model
{
    protected $fillable = [
        'key', 'tenant_id', 'user_id', 'method', 'path',
        'status', 'response_status', 'response_headers', 'response_body',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'response_headers' => 'array',
            'completed_at' => 'datetime',
        ];
    }
}
