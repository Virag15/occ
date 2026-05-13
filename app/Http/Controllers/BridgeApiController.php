<?php

namespace App\Http\Controllers;

use App\Models\TallyOperation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Bridge API — endpoints the local Tally agent calls to claim and report
 * on queued operations. Authentication + tenant resolution lives in the
 * AuthenticateBridgeAgent middleware (runs per-request, even in tests
 * where the controller instance may be cached across requests). By the
 * time any method here runs, the tenant context is set to the token's
 * tenant.
 */
class BridgeApiController extends Controller
{
    /**
     * Claim up to N pending operations. Each claimed row gets a lease so
     * a second agent (or a retry by this one before timeout) doesn't
     * double-process.
     */
    public function claim(Request $request): JsonResponse
    {
        $max = max(1, min(50, (int) $request->input('max', 10)));
        $agentId = $request->ip().' / '.substr(hash('xxh128', $request->userAgent() ?? ''), 0, 8);
        $leaseMinutes = 5;

        $ops = DB::transaction(function () use ($max, $agentId, $leaseMinutes) {
            // Anything stuck in 'claimed' past its lease becomes pending again.
            TallyOperation::query()
                ->where('status', TallyOperation::STATUS_CLAIMED)
                ->where('lease_expires_at', '<', now())
                ->update([
                    'status' => TallyOperation::STATUS_PENDING,
                    'claimed_by' => null,
                    'claimed_at' => null,
                    'lease_expires_at' => null,
                ]);

            $candidates = TallyOperation::query()
                ->where('status', TallyOperation::STATUS_PENDING)
                ->orderBy('id')
                ->limit($max)
                ->lockForUpdate()
                ->get();

            foreach ($candidates as $op) {
                $op->update([
                    'status' => TallyOperation::STATUS_CLAIMED,
                    'claimed_by' => $agentId,
                    'claimed_at' => now(),
                    'lease_expires_at' => now()->addMinutes($leaseMinutes),
                    'attempts' => $op->attempts + 1,
                ]);
            }

            return $candidates;
        });

        return response()->json([
            'operations' => $ops->map(fn ($op) => [
                'id' => $op->id,
                'operation' => $op->operation,
                'payload' => $op->payload,
                'related_type' => $op->related_type,
                'related_id' => $op->related_id,
                'attempts' => $op->attempts,
            ])->all(),
        ]);
    }

    /**
     * Mark an operation done. The result body is whatever TallyClient returned.
     *
     * Only valid on a row whose lease is still live — guards against (a) replay
     * of a completed op overwriting an already-stamped voucher_id, (b) a stuck
     * agent finishing after its lease expired and another agent re-claimed.
     */
    public function complete(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'result' => ['nullable', 'array'],
            'result.tally_id' => ['nullable', 'string', 'max:100'],
            'result.voucher_id' => ['nullable', 'string', 'max:100'],
        ]);
        $op = TallyOperation::query()->findOrFail($id);
        $this->assertLeaseLive($op);

        $op->update([
            'status' => TallyOperation::STATUS_DONE,
            'result' => $data['result'] ?? null,
            'completed_at' => now(),
            'lease_expires_at' => null,
        ]);

        $this->stampVoucherIdIfApplicable($op);

        return response()->json(['ok' => true]);
    }

    /** Mark an operation failed. Agent will not retry; manual intervention. */
    public function fail(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['error' => ['nullable', 'string', 'max:500']]);
        $op = TallyOperation::query()->findOrFail($id);
        $this->assertLeaseLive($op);

        $op->update([
            'status' => TallyOperation::STATUS_FAILED,
            'error_message' => $data['error'] ?? null,
            'completed_at' => now(),
            'lease_expires_at' => null,
        ]);

        return response()->json(['ok' => true]);
    }

    /**
     * 409 if the op isn't currently claimed by a live lease. Stops replays,
     * stomps on already-done rows, and late writes from a reclaimed lease.
     */
    private function assertLeaseLive(TallyOperation $op): void
    {
        if ($op->status !== TallyOperation::STATUS_CLAIMED) {
            abort(409, 'Operation is not in claimed state.');
        }
        if ($op->lease_expires_at === null || $op->lease_expires_at->isPast()) {
            abort(409, 'Operation lease has expired; re-claim before completing.');
        }
    }

    /** Tiny ping endpoint so the agent can verify token + connectivity at start. */
    public function ping(): JsonResponse
    {
        return response()->json([
            'ok' => true,
            'app' => config('app.name'),
            'time' => now()->toIso8601String(),
        ]);
    }

    private function stampVoucherIdIfApplicable(TallyOperation $op): void
    {
        if (! $op->related_type || ! $op->related_id) {
            return;
        }
        $voucherId = $op->result['tally_id'] ?? $op->result['voucher_id'] ?? null;
        if (! $voucherId) {
            return;
        }
        match ($op->related_type) {
            'order' => DB::table('orders')->where('id', $op->related_id)
                ->update(['tally_voucher_id' => $voucherId, 'tally_pushed_at' => now()]),
            'payment' => DB::table('payments')->where('id', $op->related_id)
                ->update(['tally_voucher_id' => $voucherId, 'tally_pushed_at' => now()]),
            default => null,
        };
    }
}
