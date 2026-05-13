<?php

namespace App\Tenancy;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

/**
 * Global Eloquent scope that adds `WHERE tenant_id = <current>` to every
 * query on a model using the BelongsToTenant trait.
 *
 * When no tenant is active (login page, public tracking, console-without-
 * tenant) the scope is a no-op so framework operations (login query,
 * migrations) keep working. The trait's creating hook will still refuse
 * to insert a row without a tenant when one is required.
 */
class TenantScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $tenant = app(TenantContext::class);
        if (! $tenant->has()) {
            return;
        }
        $builder->where($model->qualifyColumn('tenant_id'), $tenant->id());
    }
}
