<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $order_code
 * @property string|null $tracking_uuid
 * @property int $customer_id
 * @property Carbon|null $order_date
 * @property string|null $order_source
 * @property string|null $customer_reference_number
 * @property string|null $customer_po_number
 * @property array<int,string>|null $brands
 * @property string|null $order_value
 * @property string|null $discount_amount
 * @property string $status
 * @property string $priority
 * @property bool $lr_shared_with_customer
 * @property bool $pod_received
 * @property bool $triplicate_received
 * @property string|null $invoice_number
 * @property Carbon|null $invoice_date
 * @property string|null $payment_terms
 * @property Carbon|null $payment_due_date
 * @property string $payment_status
 * @property string|null $amount_received
 * @property Carbon|null $payment_received_date
 * @property string|null $payment_mode
 * @property string|null $tally_voucher_id
 * @property Carbon|null $tally_pushed_at
 * @property string|null $internal_notes
 * @property int|null $created_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Customer|null $customer
 * @property-read User|null $creator
 * @property-read Collection<int,OrderItem> $items
 * @property-read Collection<int,Shipment> $shipments
 * @property-read Collection<int,Payment> $payments
 * @property-read string|null $lr_number
 * @property-read string|null $dispatch_date
 * @property-read string|null $delivered_date
 * @property-read string|null $expected_delivery
 * @property-read int|null $transporter_id
 * @property-read Transporter|null $transporter
 */
class Order extends Model
{
    use BelongsToTenant, HasFactory, SoftDeletes;

    public const STATUSES = [
        'new_order', 'confirmed', 'stock_check', 'packing', 'packed',
        'ready_for_dispatch', 'dispatched', 'delivered', 'closed',
        'on_hold', 'cancelled',
    ];

    public const PRIORITIES = ['urgent', 'high', 'normal', 'low'];

    public const PAYMENT_STATUSES = ['not_due', 'pending', 'partial', 'paid', 'overdue'];

    protected static function booted(): void
    {
        // Auto-assign the public tracking UUID at create time so every order
        // can be linked to without an extra step. The migration backfills
        // existing rows, this covers all new ones.
        static::creating(function (Order $order) {
            if (empty($order->tracking_uuid)) {
                $order->tracking_uuid = (string) Str::uuid();
            }
        });
    }

    protected $fillable = [
        'order_code', 'tracking_uuid', 'customer_id', 'order_date', 'order_source',
        'customer_reference_number', 'customer_po_number',
        'brands', 'order_value', 'discount_amount', 'status', 'priority',
        // Order-level aggregate flags (not duplicates of shipment data — manually maintained)
        'lr_shared_with_customer', 'pod_received', 'triplicate_received',
        // Invoice + payment (payment cache rebuilt from payments table)
        'invoice_number', 'invoice_date', 'payment_terms', 'payment_due_date',
        'payment_status', 'amount_received', 'payment_received_date', 'payment_mode',
        'tally_voucher_id', 'tally_pushed_at',
        'internal_notes', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'order_date' => 'date',
            'brands' => 'array',
            'order_value' => 'decimal:2',
            'lr_shared_with_customer' => 'boolean',
            'pod_received' => 'boolean',
            'triplicate_received' => 'boolean',
            'invoice_date' => 'date',
            'payment_due_date' => 'date',
            'amount_received' => 'decimal:2',
            'payment_received_date' => 'date',
        ];
    }

    /**
     * Computed fields surfaced in JSON so existing frontend reads (order.lr_number,
     * order.dispatch_date, order.transporter, ...) keep working after the dispatch
     * columns moved to the shipments table.
     *
     * All accessors derive from the loaded `shipments` collection. Eager-load
     * shipments wherever you serialize Orders to avoid N+1.
     */
    protected $appends = [
        'lr_number', 'dispatch_date', 'delivered_date', 'expected_delivery',
        'transporter_id', 'transporter',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function returns(): HasMany
    {
        return $this->hasMany(ReturnCase::class, 'related_order_id');
    }

    public function communications(): HasMany
    {
        return $this->hasMany(Communication::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function shipments(): HasMany
    {
        return $this->hasMany(Shipment::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    // ─── Computed accessors backed by shipments ─────────────────────

    /**
     * The most recently-created shipment with the requested field present.
     * Returns null if shipments aren't loaded — callers must eager-load.
     */
    protected function shipmentField(string $field)
    {
        if (! $this->relationLoaded('shipments')) {
            return null;
        }

        return $this->shipments
            ->filter(fn ($s) => $s->{$field} !== null)
            ->sortByDesc('id')
            ->first()
            ?->{$field};
    }

    public function getLrNumberAttribute(): ?string
    {
        return $this->shipmentField('lr_number');
    }

    public function getDispatchDateAttribute()
    {
        return $this->shipmentField('dispatch_date');
    }

    public function getDeliveredDateAttribute()
    {
        return $this->shipmentField('delivered_date');
    }

    public function getExpectedDeliveryAttribute()
    {
        return $this->shipmentField('expected_delivery');
    }

    public function getTransporterIdAttribute(): ?int
    {
        return $this->shipmentField('transporter_id');
    }

    public function getTransporterAttribute(): ?Transporter
    {
        if (! $this->relationLoaded('shipments')) {
            return null;
        }
        $latest = $this->shipments->sortByDesc('id')->first(fn ($s) => $s->transporter_id !== null);

        return $latest?->transporter;
    }

    // ─── Query scopes ───────────────────────────────────────────────

    public function scopePendingLRShare(Builder $q): Builder
    {
        // "Has at least one shipment with an LR, but customer not yet notified"
        return $q->where('lr_shared_with_customer', false)
            ->whereHas('shipments', fn ($s) => $s->whereNotNull('lr_number'));
    }

    public function scopeOverduePayments(Builder $q): Builder
    {
        return $q->whereIn('payment_status', ['pending', 'partial'])
            ->whereDate('payment_due_date', '<', now()->toDateString());
    }

    public function scopeTriplicateAwaited(Builder $q): Builder
    {
        return $q->where('status', 'delivered')->where('triplicate_received', false);
    }

    public function scopeDispatchedToday(Builder $q): Builder
    {
        return $q->whereHas('shipments', fn ($s) => $s->whereDate('dispatch_date', now()->toDateString()));
    }
}
