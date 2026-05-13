<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

/**
 * Tenant = one MSME customer of OCC. Owns everything: users, customers,
 * orders, payments, settings, bridge tokens, storage paths.
 *
 * Lifecycle:
 *  - trial (status=active, trial_ends_at in future): full access, no billing
 *  - active: paid, full access
 *  - suspended: billing lapsed; auth still works but writes are blocked
 *  - cancelled: soft-deleted; data retained for 30 days then purged
 */
class Tenant extends Model
{
    use HasFactory, SoftDeletes;

    public const STATUS_ACTIVE = 'active';

    public const STATUS_SUSPENDED = 'suspended';

    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'uuid', 'name', 'slug', 'status', 'trial_ends_at', 'suspended_at', 'plan',
    ];

    /** Model-level defaults so freshly-created tenants have status/plan in memory. */
    protected $attributes = [
        'status' => self::STATUS_ACTIVE,
        'plan' => 'starter',
    ];

    protected function casts(): array
    {
        return [
            'trial_ends_at' => 'datetime',
            'suspended_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Tenant $tenant) {
            if (empty($tenant->uuid)) {
                $tenant->uuid = (string) Str::uuid();
            }
        });
    }

    /** Active = paid & not suspended. Used by middleware to gate writes. */
    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    /** Root path for this tenant's file storage. Use everywhere we store files. */
    public function storagePrefix(): string
    {
        return "tenants/{$this->uuid}";
    }
}
