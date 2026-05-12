<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    use HasFactory;

    public const STATUSES = [
        'pending', 'partially_packed', 'packed', 'dispatched',
        'delivered', 'closed', 'cancelled', 'backordered',
    ];

    protected $fillable = [
        'order_id', 'product_id', 'product_name',
        'qty_ordered', 'qty_packed', 'qty_dispatched', 'qty_delivered',
        'qty_cancelled', 'qty_returned',
        'unit', 'unit_price', 'discount_pct', 'tax_rate', 'line_total',
        'status', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'qty_ordered' => 'decimal:3',
            'qty_packed' => 'decimal:3',
            'qty_dispatched' => 'decimal:3',
            'qty_delivered' => 'decimal:3',
            'qty_cancelled' => 'decimal:3',
            'qty_returned' => 'decimal:3',
            'unit_price' => 'decimal:2',
            'tax_rate' => 'decimal:2',
            'line_total' => 'decimal:2',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Open quantity remaining to pack against this line.
     */
    public function getOpenQtyAttribute(): float
    {
        return (float) $this->qty_ordered - (float) $this->qty_packed - (float) $this->qty_cancelled;
    }

    /**
     * Re-derive line status from quantities. Returns the new status (call save() yourself).
     */
    public function deriveStatus(): string
    {
        $ordered = (float) $this->qty_ordered;
        $packed = (float) $this->qty_packed;
        $dispatched = (float) $this->qty_dispatched;
        $delivered = (float) $this->qty_delivered;
        $cancelled = (float) $this->qty_cancelled;

        if ($cancelled >= $ordered) {
            return 'cancelled';
        }
        if ($delivered >= $ordered - $cancelled) {
            return 'delivered';
        }
        if ($dispatched >= $ordered - $cancelled) {
            return 'dispatched';
        }
        if ($packed >= $ordered - $cancelled) {
            return 'packed';
        }
        if ($packed > 0) {
            return 'partially_packed';
        }

        return 'pending';
    }
}
