<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gates the platform admin console (/admin/*). Members of the OCC team
 * (Delta System staff) have users.is_platform_admin=true and can manage
 * the sales pipeline, see all tenants, etc.
 *
 * Tenant owners with role='owner' do NOT inherit this — they own a
 * single workspace, not the platform itself. Virag has both flags
 * because he runs both Delta System and GC Communication.
 */
class EnsurePlatformAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user || ! $user->is_platform_admin) {
            abort(403, 'Platform admin access required.');
        }

        return $next($request);
    }
}
