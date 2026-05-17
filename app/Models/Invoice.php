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
 * A tax invoice. Same shape as a Quotation (shares the PDF / preview
 * template) and usually converted from one. Tenant-scoped.
 *
 * @property int $tenant_id
 * @property string $invoice_code
 * @property string $status
 * @property float $total
 */
class Invoice extends Model
{
    use BelongsToTenant, HasFactory, SoftDeletes;

    public const STATUS_DRAFT = 'draft';

    public const STATUS_SENT = 'sent';

    public const STATUS_PAID = 'paid';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUSES = [
        self::STATUS_DRAFT,
        self::STATUS_SENT,
        self::STATUS_PAID,
        self::STATUS_CANCELLED,
    ];

    protected $fillable = [
        'invoice_code', 'quotation_id', 'customer_id', 'customer_name', 'customer_company',
        'customer_address', 'customer_gstin', 'customer_state', 'customer_state_code',
        'customer_phone', 'customer_email', 'buyer_ref', 'other_references',
        'dispatched_through', 'destination', 'payment_terms', 'delivery_terms',
        'invoice_date', 'due_date', 'status', 'discount_amount', 'hide_discount',
        'subtotal', 'tax_total', 'total', 'notes', 'terms', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'invoice_date' => 'date',
            'due_date' => 'date',
            'hide_discount' => 'boolean',
            'discount_amount' => 'decimal:2',
            'subtotal' => 'decimal:2',
            'tax_total' => 'decimal:2',
            'total' => 'decimal:2',
        ];
    }

    protected $attributes = [
        'status' => self::STATUS_DRAFT,
    ];

    /** @return HasMany<InvoiceItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function quotation(): BelongsTo
    {
        return $this->belongsTo(Quotation::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Allocate the next INV-YYYY-NNNN code for the active tenant, serialized
     * via a cache lock so concurrent creates can't claim the same number.
     */
    public static function nextCode(int $tenantId): string
    {
        return Cache::lock("invoice-code:{$tenantId}", 10)->block(5, function () use ($tenantId) {
            $year = now()->year;
            $prefix = "INV-{$year}-";
            $last = DB::table('invoices')
                ->where('tenant_id', $tenantId)
                ->where('invoice_code', 'like', "{$prefix}%")
                ->orderByDesc('id')
                ->value('invoice_code');
            $next = $last ? (int) substr($last, strlen($prefix)) + 1 : 1;

            return $prefix.str_pad((string) $next, 4, '0', STR_PAD_LEFT);
        });
    }
}
