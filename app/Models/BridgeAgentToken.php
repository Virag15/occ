<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Bridge agent token. One row per Windows PC that authenticates against
 * /api/bridge/* on the cloud OCC. Plaintext token is never stored —
 * Tenant::issueBridgeToken() returns it once at creation time.
 *
 * @property int $tenant_id
 * @property string $name
 * @property string $token_hash
 * @property Carbon|null $last_seen_at
 * @property Carbon|null $revoked_at
 */
class BridgeAgentToken extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'name', 'token_hash', 'last_seen_at', 'revoked_at',
    ];

    protected function casts(): array
    {
        return [
            'last_seen_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    /** Constant-time hash of a presented bearer token. */
    public static function hashToken(string $plain): string
    {
        return hash('sha256', $plain);
    }

    public function isActive(): bool
    {
        return $this->revoked_at === null;
    }

    public function touch($attribute = null)
    {
        // Used after a successful auth — bump last_seen_at without
        // bumping updated_at every single request (low write churn).
        return $this->forceFill(['last_seen_at' => now()])->save();
    }
}
