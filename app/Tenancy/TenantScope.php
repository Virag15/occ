<?php

namespace App\Tenancy;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

/**
 * Global Eloquent scope that adds `WHERE tenant_id = <current>` to every
 * query on a model using the BelongsToTenant trait.
 *
 * Resolution order:
 *  1. TenantContext (set by SetCurrentTenant middleware, BridgeAgent auth,
 *     console commands, tests via runAs/set).
 *  2. The ALREADY-RESOLVED authed user's tenant_id. This covers the brief
 *     window before SetCurrentTenant middleware runs — Laravel's
 *     SubstituteBindings runs BEFORE custom appended web middleware, so
 *     route-model binding would otherwise see "no tenant" and allow
 *     cross-tenant access by id.
 *  3. If neither: no-op. Login page, public tracking, migrations all
 *     keep working.
 *
 * CRITICAL: step 2 uses Auth::hasUser(), NOT Auth::user(). The User model
 * itself uses BelongsToTenant → this scope. The session guard resolves
 * the authenticated user via `User::find($id)`, which applies this scope.
 * Calling Auth::user() here would re-trigger user resolution → which
 * queries User → which applies this scope → infinite recursion (a silent
 * stack blow-out: empty HTTP 500, no catchable exception). Auth::hasUser()
 * returns true only if the user is ALREADY loaded, so the User-resolution
 * query is left unscoped (correct: you must find a user by id regardless
 * of tenant — the tenant is derived FROM the user). Tests passed before
 * because actingAs() pre-loads the user object and never hits the guard's
 * DB resolution path.
 */
class TenantScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $tenant = app(TenantContext::class);
        if ($tenant->has()) {
            $builder->where($model->qualifyColumn('tenant_id'), $tenant->id());

            return;
        }

        // Only use the user if it's already resolved — never trigger
        // resolution from inside a scope (see class doc: recursion).
        if (Auth::hasUser()) {
            $user = Auth::user();
            if ($user && isset($user->tenant_id)) {
                $builder->where($model->qualifyColumn('tenant_id'), $user->tenant_id);
            }
        }
    }
}
