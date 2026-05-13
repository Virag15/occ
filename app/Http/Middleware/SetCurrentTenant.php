<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Tenancy\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the active tenant from the authenticated user and registers it
 * with TenantContext. Runs on every authed web request.
 *
 * Resolution order:
 *  1. If a user is authenticated, use their tenant_id.
 *  2. Otherwise, leave the context empty (no tenant scoping applies).
 *
 * If the user belongs to a tenant that is suspended or cancelled, the
 * middleware returns a 402/410 instead of letting them in. Soft-deleted
 * tenants never resolve.
 *
 * Note: this runs AFTER the auth middleware in the web group so that
 * Auth::user() is populated by the time we look at it.
 */
class SetCurrentTenant
{
    public function __construct(private TenantContext $context) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        if ($user && $user->tenant_id !== null) {
            $tenant = Tenant::find($user->tenant_id);

            // Soft-deleted or non-existent tenant — log the user out
            // defensively. Should never happen in practice because we
            // restrictOnDelete the FK and don't hard-delete tenants.
            if (! $tenant) {
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return redirect()->route('login')
                    ->with('status', 'Your workspace is no longer active. Contact support.');
            }

            if ($tenant->status === Tenant::STATUS_CANCELLED) {
                Auth::logout();

                return redirect()->route('login')
                    ->with('status', 'This workspace has been cancelled.');
            }

            if ($tenant->status === Tenant::STATUS_SUSPENDED && ! $request->isMethod('GET')) {
                // Read-only: GET requests still work so the user can pay
                // their bill, but mutations are blocked.
                abort(402, 'Workspace is suspended for billing — please update your subscription.');
            }

            $this->context->set($tenant);
        }

        return $next($request);
    }
}
