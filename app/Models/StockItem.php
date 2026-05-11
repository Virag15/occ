<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
