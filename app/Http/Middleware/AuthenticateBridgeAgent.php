<?php

namespace App\Http\Middleware;

use App\Models\BridgeAgentToken;
use App\Models\Tenant;
use App\Tenancy\TenantContext;
use App\Tenancy\TenantScope;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Authenticates a bridge agent by bearer token and registers the active
 * tenant on TenantContext for the rest of the request.
 *
 * Lives as a middleware (not a controller constructor) because in tests
 * PHPUnit may cache the controller instance across multiple HTTP calls,
 * leaving the previous request's tenant context active. Middleware runs
 * fresh on every request.
 *
 * Token lookup: hash the bearer with sha256, look up in bridge_agent_tokens.
 * Bypasses the global tenant scope on that table because we don't yet
 * know which tenant the caller belongs to.
 */
class AuthenticateBridgeAgent
{
    public function __construct(private TenantContext $context) {}

    public function handle(Request $request, Closure $next): Response
    {
        $bearer = $request->bearerToken();
        if (! $bearer) {
            abort(401, 'Missing agent token.');
        }

        $token = BridgeAgentToken::withoutGlobalScope(TenantScope::class)
            ->where('token_hash', BridgeAgentToken::hashToken($bearer))
            ->whereNull('revoked_at')
            ->first();

        if (! $token) {
            abort(401, 'Invalid agent token.');
        }

        // Register the active tenant. Every Eloquent query inside the
        // request (TallyOperation, Order, Payment) is now scoped to it.
        /** @var Tenant $tenant */
        $tenant = $token->tenant;
        $this->context->set($tenant);
        $token->touch();

        return $next($request);
    }
}
