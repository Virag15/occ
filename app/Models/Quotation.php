<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * A standalone quotation. Independent of orders — you can quote a
 * prospect who has no Customer record and no Order. Optionally links
 * to a Customer if one is chosen.
 *
 * @property int $tenant_id
 * @property string $quotation_code
 * @property string $status
 * @property float $total
 */
class Quotation extends Model
{
    use BelongsToTenant, HasFactory, SoftDeletes;

    public const STATUS_DRAFT = 'draft';

    public const STATUS_SENT = 'sent';

    public const STATUS_ACCEPTED = 'accepted';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_EXPIRED = 'expired';

    public const STATUSES = [
        self::STATUS_DRAFT,
        self::STATUS_SENT,
        self::STATUS_ACCEPTED,
        self::STATUS_REJECTED,
        self::STATUS_EXPIRED,
    ];

    protected $fillable = [
        'quotation_code', 'customer_id', 'customer_name', 'customer_company',
        'customer_address', 'customer_gstin', 'customer_phone', 'customer_email',
        'quotation_date', 'valid_until', 'status', 'discount_amount',
        'subtotal', 'tax_total', 'total', 'notes', 'terms', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'quotation_date' => 'date',
            'valid_until' => 'date',
            'discount_amount' => 'decimal:2',
            'subtotal' => 'decimal:2',
            'tax_total' => 'decimal:2',
            'total' => 'decimal:2',
        ];
    }

    protected $attributes = [
        'status' => self::STATUS_DRAFT,
    ];

    public function items(): HasMany
    {
        return $this->hasMany(QuotationItem::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Allocate the next QUO-YYYY-NNNN code for the active tenant.
     * Serialized via a cache lock so two concurrent creates can't claim
     * the same number (mirrors OrderController::nextOrderCode).
     */
    public static function nextCode(int $tenantId): string
    {
        return Cache::lock("quotation-code:{$tenantId}", 10)->block(5, function () use ($tenantId) {
            $year = now()->year;
            $prefix = "QUO-{$year}-";
            $last = DB::table('quotations')
                ->where('tenant_id', $tenantId)
                ->where('quotation_code', 'like', "{$prefix}%")
                ->orderByDesc('id')
                ->value('quotation_code');
            $next = $last ? (int) substr($last, strlen($prefix)) + 1 : 1;

            return $prefix.str_pad((string) $next, 4, '0', STR_PAD_LEFT);
        });
    }
}
