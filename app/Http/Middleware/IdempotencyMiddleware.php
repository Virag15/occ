<?php

namespace App\Http\Middleware;

use App\Models\IdempotencyKey;
use App\Tenancy\TenantContext;
use Closure;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

/**
 * Server-side idempotency (M7-B).
 *
 * Opt-in: does nothing unless the request is a mutation AND carries an
 * `Idempotency-Key` header. Existing flows (no header) are completely
 * unaffected — this is a safe, additive rollout. The PWA offline queue
 * (M7-C) is the only client that sends the header, on every replay.
 *
 * Contract:
 *   - First request for a key: run normally, capture the final response,
 *     store it, return it.
 *   - Replay of a completed key: return the stored response verbatim,
 *     WITHOUT re-running the controller (no duplicate order/voucher).
 *   - Replay while the first is still in flight: 409 (client retries
 *     later — the queue is serial so this is rare).
 *   - 5xx is never cached: the row is released so a retry can succeed.
 */
class IdempotencyMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $key = $request->header('Idempotency-Key');

        if (! $this->applies($request) || ! $this->validKey($key)) {
            return $next($request);
        }

        $tenantId = app(TenantContext::class)->has() ? app(TenantContext::class)->id() : null;

        // Claim the key. Unique constraint makes this the race arbiter:
        // exactly one inserter proceeds, everyone else is a replay.
        $claimed = false;
        try {
            DB::transaction(function () use ($key, $request, $tenantId, &$claimed) {
                IdempotencyKey::create([
                    'key' => $key,
                    'tenant_id' => $tenantId,
                    'user_id' => Auth::id(),
                    'method' => $request->method(),
                    'path' => mb_substr($request->path(), 0, 255),
                    'status' => 'processing',
                ]);
                $claimed = true;
            });
        } catch (QueryException) {
            $claimed = false; // duplicate key — this is a replay
        }

        if (! $claimed) {
            return $this->replay($key);
        }

        $response = $next($request);

        // Never persist a server error — let the client retry the op.
        if ($response->getStatusCode() >= 500) {
            IdempotencyKey::where('key', $key)->delete();

            return $response;
        }

        IdempotencyKey::where('key', $key)->update([
            'status' => 'completed',
            'response_status' => $response->getStatusCode(),
            'response_headers' => $this->headerSubset($response),
            'response_body' => $response->getContent(),
            'completed_at' => now(),
        ]);

        return $response;
    }

    private function replay(string $key): Response
    {
        $row = IdempotencyKey::where('key', $key)->first();

        if (! $row || $row->status !== 'completed') {
            // Original still in flight (or vanished mid-prune). Tell the
            // client to come back — its queue will re-attempt later.
            return response('Idempotent request already in progress.', 409);
        }

        return response(
            $row->response_body ?? '',
            $row->response_status ?? 200,
            array_merge($row->response_headers ?? [], ['X-Idempotent-Replay' => '1']),
        );
    }

    private function applies(Request $request): bool
    {
        return in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'], true);
    }

    private function validKey(?string $key): bool
    {
        return is_string($key) && strlen($key) >= 8 && strlen($key) <= 100
            && preg_match('/^[A-Za-z0-9._:-]+$/', $key) === 1;
    }

    /** Only the headers a replay must faithfully reproduce. */
    private function headerSubset(Response $response): array
    {
        $keep = [];
        foreach (['Location', 'Content-Type', 'X-Inertia', 'X-Inertia-Location'] as $h) {
            if ($response->headers->has($h)) {
                $keep[$h] = $response->headers->get($h);
            }
        }

        return $keep;
    }
}
