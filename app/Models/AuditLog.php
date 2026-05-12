<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

class AuditLog extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'user_id', 'entity_type', 'entity_id', 'action', 'changes', 'created_at',
    ];

    protected function casts(): array
    {
        return [
            'changes' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Manually record an action that isn't an Eloquent mutation (so AuditObserver
     * doesn't catch it). Use for downloads, prints, exports, and other "events".
     *
     * @param  string  $action  snake_case action name (e.g. 'invoice_downloaded')
     * @param  Model|null  $entity  the entity the action is about, if applicable
     * @param  array  $meta  optional context (e.g. ['kind' => 'pod', 'filename' => '...'])
     */
    public static function record(string $action, ?Model $entity = null, array $meta = []): self
    {
        return static::create([
            'user_id' => Auth::id(),
            'entity_type' => $entity ? static::deriveEntityType($entity) : 'system',
            'entity_id' => $entity?->getKey() ?? 0,
            'action' => $action,
            'changes' => $meta ?: null,
            'created_at' => now(),
        ]);
    }

    private static function deriveEntityType(Model $entity): string
    {
        $base = class_basename($entity);

        return strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $base));
    }
}
