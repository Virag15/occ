<?php

namespace App\Observers;

use App\Models\AuditLog;
use App\Models\ReturnCase;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class AuditObserver
{
    /**
     * Flip to false (e.g. inside the seeder) to suppress audit writes during bulk imports.
     */
    public static bool $enabled = true;

    private const SKIP_FIELDS = [
        'password', 'remember_token', 'updated_at', 'created_at',
        'tally_synced_at', // sync metadata, not a user action
    ];

    public function created(Model $model): void
    {
        if (! self::$enabled) {
            return;
        }

        $this->log($model, 'created', $this->snapshot($model));
    }

    public function updated(Model $model): void
    {
        if (! self::$enabled) {
            return;
        }

        $changes = [];
        foreach ($model->getChanges() as $field => $newValue) {
            if (in_array($field, self::SKIP_FIELDS, true)) {
                continue;
            }
            $changes[$field] = [
                'from' => $this->cast($model->getOriginal($field)),
                'to' => $this->cast($newValue),
            ];
        }

        if (empty($changes)) {
            return;
        }

        // Promote important transitions to specific action labels — readers should
        // see 'Inspection started' not 'Status changed: reported → under_inspection'
        $action = match (true) {
            $model instanceof ReturnCase && isset($changes['case_status']) => match ($changes['case_status']['to'] ?? null) {
                'under_inspection' => 'return_inspection_started',
                'resolved' => 'return_resolved',
                'rejected' => 'return_rejected',
                default => 'case_status_changed',
            },
            isset($changes['status']) => 'status_changed',
            isset($changes['payment_status']) => 'payment_status_changed',
            isset($changes['role']) => 'role_changed',
            isset($changes['lr_shared_with_customer']) => 'lr_shared_toggled',
            default => 'updated',
        };

        $this->log($model, $action, $changes);
    }

    public function deleted(Model $model): void
    {
        if (! self::$enabled) {
            return;
        }

        // Capture key identifying fields before they're gone
        $key = $this->keyFields($model);
        $this->log($model, 'deleted', $key);
    }

    private function snapshot(Model $model): array
    {
        $out = [];
        foreach ($model->getAttributes() as $field => $value) {
            if (in_array($field, self::SKIP_FIELDS, true)) {
                continue;
            }
            $out[$field] = ['from' => null, 'to' => $this->cast($value)];
        }

        return $out;
    }

    private function keyFields(Model $model): array
    {
        $candidates = ['name', 'email', 'order_code', 'customer_code', 'transporter_code', 'sku', 'case_code', 'role'];
        $out = [];
        foreach ($candidates as $f) {
            if ($model->getAttribute($f) !== null) {
                $out[$f] = ['from' => $this->cast($model->getAttribute($f)), 'to' => null];
            }
        }

        return $out ?: ['id' => ['from' => $model->getKey(), 'to' => null]];
    }

    private function log(Model $model, string $action, array $changes): void
    {
        AuditLog::create([
            'user_id' => Auth::id(),
            'entity_type' => $this->entityType($model),
            'entity_id' => $model->getKey(),
            'action' => $action,
            'changes' => $changes,
        ]);
    }

    private function entityType(Model $model): string
    {
        $base = class_basename(get_class($model));

        return strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $base));
    }

    /**
     * @return mixed
     */
    private function cast($value)
    {
        if (is_null($value) || is_scalar($value) || is_array($value)) {
            return $value;
        }

        return (string) $value;
    }
}
