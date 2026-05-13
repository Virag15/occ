<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int|null $order_id
 * @property string $channel
 * @property string $template_name
 * @property string $to_recipient
 * @property string|null $body
 * @property string $status
 * @property string|null $external_id
 * @property Carbon|null $sent_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Order|null $order
 */
class Communication extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id', 'channel', 'template_name', 'to_recipient',
        'body', 'status', 'external_id', 'sent_at',
    ];

    protected function casts(): array
    {
        return [
            'sent_at' => 'datetime',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
