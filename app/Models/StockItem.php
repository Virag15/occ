<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $product_id
 * @property string $godown_name
 * @property string $qty_opening
 * @property string $qty_inward
 * @property string $qty_outward
 * @property string $qty_closing
 * @property Carbon|null $as_of_date
 * @property Carbon|null $tally_synced_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Product|null $product
 */
class StockItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id', 'godown_name',
        'qty_opening', 'qty_inward', 'qty_outward', 'qty_closing',
        'as_of_date', 'tally_synced_at',
    ];

    protected function casts(): array
    {
        return [
            'qty_opening' => 'decimal:3',
            'qty_inward' => 'decimal:3',
            'qty_outward' => 'decimal:3',
            'qty_closing' => 'decimal:3',
            'as_of_date' => 'date',
            'tally_synced_at' => 'datetime',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
