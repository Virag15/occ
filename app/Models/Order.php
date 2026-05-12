<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    use HasFactory;

    public const STATUSES = [
        'new_order', 'confirmed', 'stock_check', 'packing', 'packed',
        'ready_for_dispatch', 'dispatched', 'delivered', 'closed',
        'on_hold', 'cancelled',
    ];

    public const PRIORITIES = ['urgent', 'high', 'normal', 'low'];

    public const PAYMENT_STATUSES = ['not_due', 'pending', 'partial', 'paid', 'overdue'];

    protected $fillable = [
        'order_code', 'customer_id', 'order_date', 'order_source',
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
        if (!$this->relationLoaded('shipments')) return null;
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
        if (!$this->relationLoaded('shipments')) return null;
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
