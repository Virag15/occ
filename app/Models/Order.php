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
        'brands', 'order_value', 'status', 'priority',
        'packing_slip_generated', 'packed_by', 'items_packed_count',
        'parcel_weight_kg', 'number_of_boxes', 'parcel_photo_url',
        'pickup_scheduled_date', 'transporter_id', 'driver_name',
        'driver_contact', 'vehicle_number', 'dispatch_date',
        'lr_number', 'lr_photo_url', 'lr_shared_with_customer', 'lr_shared_at',
        'expected_delivery',
        'delivered_date', 'pod_received', 'pod_photo_url',
        'triplicate_received', 'triplicate_received_date', 'triplicate_photo_url',
        'invoice_number', 'invoice_date', 'payment_terms', 'payment_due_date',
        'payment_status', 'amount_received', 'payment_received_date', 'payment_mode',
        'internal_notes', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'order_date' => 'date',
            'brands' => 'array',
            'order_value' => 'decimal:2',
            'packing_slip_generated' => 'boolean',
            'parcel_weight_kg' => 'decimal:2',
            'parcel_photo_url' => 'array',
            'pickup_scheduled_date' => 'date',
            'dispatch_date' => 'date',
            'lr_photo_url' => 'array',
            'lr_shared_with_customer' => 'boolean',
            'lr_shared_at' => 'datetime',
            'expected_delivery' => 'date',
            'delivered_date' => 'date',
            'pod_received' => 'boolean',
            'pod_photo_url' => 'array',
            'triplicate_received' => 'boolean',
            'triplicate_received_date' => 'date',
            'triplicate_photo_url' => 'array',
            'invoice_date' => 'date',
            'payment_due_date' => 'date',
            'amount_received' => 'decimal:2',
            'payment_received_date' => 'date',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function transporter(): BelongsTo
    {
        return $this->belongsTo(Transporter::class);
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

    public function scopePendingLRShare(Builder $q): Builder
    {
        return $q->whereNotNull('lr_number')->where('lr_shared_with_customer', false);
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
        return $q->whereDate('dispatch_date', now()->toDateString());
    }
}
