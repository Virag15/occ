<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $return_id
 * @property int $order_item_id
 * @property string $qty_returned
 * @property string $condition
 * @property string|null $reason
 * @property int|null $replacement_order_item_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read ReturnCase|null $return
 * @property-read OrderItem|null $orderItem
 * @property-read OrderItem|null $replacementOrderItem
 */
class ReturnItem extends Model
{
    use HasFactory;

    public const CONDITIONS = [
        'damaged_in_transit',
        'manufacturing_defect',
        'wrong_item',
        'excess',
        'other',
    ];

    protected $fillable = [
        'return_id',
        'order_item_id',
        'qty_returned',
        'condition',
        'reason',
        'replacement_order_item_id',
    ];

    protected function casts(): array
    {
        return [
            'qty_returned' => 'decimal:3',
        ];
    }

    public function return(): BelongsTo
    {
        return $this->belongsTo(ReturnCase::class, 'return_id');
    }

    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class);
    }

    public function replacementOrderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class, 'replacement_order_item_id');
    }
}
