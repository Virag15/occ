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
 *  2. Auth::user()->tenant_id fallback. This covers the brief window
 *     before SetCurrentTenant middleware runs — specifically, Laravel's
 *     SubstituteBindings runs BEFORE custom appended web middleware, so
 *     route-model binding would otherwise see "no tenant" and allow
 *     cross-tenant access by id. The auth fallback closes that window.
 *  3. If neither: no-op. Login page, public tracking, migrations all
 *     keep working.
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

        $user = Auth::user();
        if ($user && isset($user->tenant_id)) {
            $builder->where($model->qualifyColumn('tenant_id'), $user->tenant_id);
        }
    }
}
