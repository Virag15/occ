<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string|null $tally_id
 * @property string|null $tally_guid
 * @property Carbon|null $tally_synced_at
 * @property string|null $sku
 * @property string $name
 * @property string|null $brand
 * @property string|null $category
 * @property string|null $description
 * @property string|null $hsn_code
 * @property string|null $unit
 * @property string|null $gst_rate
 * @property string|null $mrp
 * @property string|null $default_sale_price
 * @property string|null $default_purchase_price
 * @property string|null $min_order_level
 * @property string|null $reorder_level
 * @property string|null $negative_stock_reason
 * @property bool $is_active
 * @property string $status
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Collection<int,StockItem> $stockItems
 */
class Product extends Model
{
    use BelongsToTenant, HasFactory, SoftDeletes;

    protected $fillable = [
        'tally_id', 'tally_guid', 'tally_synced_at',
        'sku', 'name', 'brand', 'category', 'description',
        'hsn_code', 'unit', 'gst_rate',
        'mrp', 'default_sale_price', 'default_purchase_price',
        'min_order_level', 'reorder_level', 'negative_stock_reason',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'gst_rate' => 'decimal:2',
            'mrp' => 'decimal:2',
            'default_sale_price' => 'decimal:2',
            'default_purchase_price' => 'decimal:2',
            'min_order_level' => 'decimal:3',
            'reorder_level' => 'decimal:3',
            'is_active' => 'boolean',
            'tally_synced_at' => 'datetime',
        ];
    }

    public function stockItems(): HasMany
    {
        return $this->hasMany(StockItem::class);
    }
}
