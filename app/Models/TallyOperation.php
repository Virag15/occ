<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $operation
 * @property array<string,mixed> $payload
 * @property string $status
 * @property string|null $claimed_by
 * @property Carbon|null $claimed_at
 * @property Carbon|null $lease_expires_at
 * @property array<string,mixed>|null $result
 * @property string|null $error_message
 * @property int $attempts
 * @property string|null $related_type
 * @property int|null $related_id
 * @property Carbon|null $completed_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class TallyOperation extends Model
{
    use BelongsToTenant, HasFactory;

    /** Operation type slugs — used by the agent to pick the right TallyClient method. */
    public const OP_PUSH_CUSTOMER = 'push_customer';

    public const OP_PUSH_SALES_VOUCHER = 'push_sales_voucher';

    public const OP_PUSH_RECEIPT = 'push_receipt';

    public const OP_PULL_MASTERS = 'pull_masters';

    public const OP_PULL_STOCK = 'pull_stock';

    public const OP_PULL_VOUCHERS = 'pull_vouchers';

    public const STATUS_PENDING = 'pending';

    public const STATUS_CLAIMED = 'claimed';

    public const STATUS_DONE = 'done';

    public const STATUS_FAILED = 'failed';

    protected $fillable = [
        'operation', 'payload', 'status', 'claimed_by', 'claimed_at',
        'lease_expires_at', 'result', 'error_message', 'attempts',
        'related_type', 'related_id', 'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'result' => 'array',
            'claimed_at' => 'datetime',
            'lease_expires_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }
}
