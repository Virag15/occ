<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $shipment_id
 * @property int $order_item_id
 * @property string $qty
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Shipment|null $shipment
 * @property-read OrderItem|null $orderItem
 */
class ShipmentItem extends Model
{
    use HasFactory;

    protected $fillable = ['shipment_id', 'order_item_id', 'qty'];

    protected function casts(): array
    {
        return ['qty' => 'decimal:3'];
    }

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class);
    }
}
