<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Stub. Real Tally bridge implementation lands in Phase 4 (per build plan).
 * For now we just log the intent so the rest of the app can rely on the contract.
 */
class SyncEntityToTally implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public Model $entity,
        public string $action, // created, updated, deleted
    ) {}

    public function handle(): void
    {
        Log::info('TallySync queued', [
            'entity' => $this->entity->getTable(),
            'id' => $this->entity->getKey(),
            'action' => $this->action,
            'tally_id' => $this->entity->tally_id ?? null,
        ]);

        // TODO Phase 4: push to Tally via ODBC / XML gateway and update tally_synced_at.
    }
}
