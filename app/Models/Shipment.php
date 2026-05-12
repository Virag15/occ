<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Cache;

class Shipment extends Model
{
    use HasFactory;

    public const STATUSES = [
        'planning', 'picking', 'packing', 'packed',
        'dispatched', 'in_transit', 'delivered', 'closed', 'cancelled',
    ];

    protected $fillable = [
        'shipment_code', 'order_id', 'transporter_id',
        'packed_by', 'number_of_boxes', 'parcel_weight_kg',
        'picking_slip_generated_at', 'packing_slip_generated_at',
        'pickup_scheduled_date', 'driver_name', 'driver_contact', 'vehicle_number',
        'dispatch_date', 'lr_number', 'lr_shared_with_customer', 'lr_shared_at',
        'expected_delivery',
        'delivered_date', 'pod_received', 'triplicate_received', 'triplicate_received_date',
        'status', 'notes', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'parcel_weight_kg' => 'decimal:2',
            'picking_slip_generated_at' => 'datetime',
            'packing_slip_generated_at' => 'datetime',
            'pickup_scheduled_date' => 'date',
            'dispatch_date' => 'date',
            'lr_shared_with_customer' => 'boolean',
            'lr_shared_at' => 'datetime',
            'expected_delivery' => 'date',
            'delivered_date' => 'date',
            'pod_received' => 'boolean',
            'triplicate_received' => 'boolean',
            'triplicate_received_date' => 'date',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function transporter(): BelongsTo
    {
        return $this->belongsTo(Transporter::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(ShipmentItem::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Sequential SHP-YYYY-NNNN code generator. Called when a shipment is created
     * either via the dialog or implicitly during evidence upload.
     */
    public static function generateCode(): string
    {
        // Serialize across concurrent shipment creates so two requests can't claim
        // the same SHP-YYYY-NNNN. See OrderController::nextOrderCode for the same pattern.
        return Cache::lock('shipment-code:next', 10)->block(5, function () {
            $year = now()->year;
            $prefix = "SHP-{$year}-";
            $last = static::query()->where('shipment_code', 'like', "{$prefix}%")->orderByDesc('id')->value('shipment_code');
            $next = $last ? (int) substr($last, strlen($prefix)) + 1 : 1;

            return $prefix.str_pad((string) $next, 4, '0', STR_PAD_LEFT);
        });
    }
}
