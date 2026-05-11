<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'tally_id', 'tally_guid', 'tally_synced_at',
        'sku', 'name', 'brand', 'category', 'description',
        'hsn_code', 'unit', 'gst_rate',
        'mrp', 'default_sale_price', 'default_purchase_price',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'gst_rate' => 'decimal:2',
            'mrp' => 'decimal:2',
            'default_sale_price' => 'decimal:2',
            'default_purchase_price' => 'decimal:2',
            'is_active' => 'boolean',
            'tally_synced_at' => 'datetime',
        ];
    }

    public function stockItems(): HasMany
    {
        return $this->hasMany(StockItem::class);
    }
}
