<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $order_id
 * @property int|null $product_id
 * @property string $product_name
 * @property string|float|int $qty_ordered
 * @property string|float|int $qty_packed
 * @property string|float|int $qty_dispatched
 * @property string|float|int $qty_delivered
 * @property string|float|int $qty_cancelled
 * @property string|float|int $qty_returned
 * @property string|null $unit
 * @property string|float|int|null $unit_price
 * @property string|float|int|null $discount_pct
 * @property string|float|int|null $tax_rate
 * @property string|float|int|null $line_total
 * @property string $status
 * @property string|null $notes
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Order|null $order
 * @property-read Product|null $product
 */
class OrderItem extends Model
{
    use BelongsToTenant, HasFactory;

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
