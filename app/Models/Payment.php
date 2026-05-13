<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $order_id
 * @property Carbon|null $paid_on
 * @property string $amount
 * @property string $mode
 * @property string|null $reference
 * @property string|null $notes
 * @property int|null $created_by
 * @property string|null $tally_voucher_id
 * @property Carbon|null $tally_pushed_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Order|null $order
 * @property-read User|null $creator
 */
class Payment extends Model
{
    use HasFactory;

    public const MODES = ['neft', 'rtgs', 'upi', 'cheque', 'cash'];

    protected $fillable = [
        'order_id', 'paid_on', 'amount', 'mode', 'reference', 'notes', 'created_by',
        'tally_voucher_id', 'tally_pushed_at',
    ];

    protected function casts(): array
    {
        return [
            'paid_on' => 'date',
            'amount' => 'decimal:2',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
