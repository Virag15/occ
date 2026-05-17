<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A line on a quotation. tenant_id is denormalised so the global tenant
 * scope protects line items directly.
 *
 * @property int $tenant_id
 * @property int $quotation_id
 * @property float $qty
 * @property float $unit_price
 * @property float $line_total
 */
class QuotationItem extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'quotation_id', 'product_id', 'product_name', 'hsn_code',
        'qty', 'unit', 'unit_price', 'discount_pct', 'tax_rate',
        'line_total', 'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'qty' => 'decimal:3',
            'unit_price' => 'decimal:2',
            'discount_pct' => 'decimal:2',
            'tax_rate' => 'decimal:2',
            'line_total' => 'decimal:2',
        ];
    }

    public function quotation(): BelongsTo
    {
        return $this->belongsTo(Quotation::class);
    }
}
