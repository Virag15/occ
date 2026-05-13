<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
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

    /** All bridge agent tokens (including revoked ones for the audit trail). */
    public function bridgeAgentTokens(): HasMany
    {
        return $this->hasMany(BridgeAgentToken::class);
    }

    /**
     * Mint a new bridge agent token for this tenant. The plaintext token
     * is returned ONCE and never stored — only its sha256 hash goes to
     * the DB. Caller is responsible for showing the plaintext to the
     * user immediately and then forgetting it.
     *
     * @return array{token: string, model: BridgeAgentToken}
     */
    public function issueBridgeToken(string $name): array
    {
        // 32 random bytes → 64-char hex. Plenty of entropy; easy to
        // type in if needed (no special chars).
        $plaintext = bin2hex(random_bytes(32));
        /** @var BridgeAgentToken $model */
        $model = $this->bridgeAgentTokens()->create([
            'name' => $name,
            'token_hash' => BridgeAgentToken::hashToken($plaintext),
        ]);

        return ['token' => $plaintext, 'model' => $model];
    }
}
