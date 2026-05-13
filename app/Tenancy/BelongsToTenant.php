<?php

namespace App\Tenancy;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Trait every tenant-owned model uses. Hooks two things into the Eloquent
 * lifecycle:
 *
 *  1. A global scope (TenantScope) that auto-filters queries to the active
 *     tenant. `Customer::all()` returns only the current tenant's customers.
 *     `Customer::find($id)` returns null if $id belongs to another tenant.
 *
 *  2. A `creating` event listener that auto-fills tenant_id from the active
 *     context. Means controllers don't need `'tenant_id' => $tenant->id`
 *     boilerplate on every Model::create() call.
 *
 * To bypass the scope intentionally (admin/support tooling, migrations):
 *   - Model::withoutGlobalScope(TenantScope::class)
 *   - or wrap in $context->runAs(null, fn() => ...)
 */
trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        // Global scope: add WHERE tenant_id = <current> to every query.
        static::addGlobalScope(new TenantScope);

        // Creating hook: stamp tenant_id from the active context if missing.
        // If no tenant context is set AND the column is not nullable,
        // the DB will reject the insert — that's the desired failure mode.
        static::creating(function ($model) {
            if ($model->tenant_id !== null) {
                return; // explicit set (admin tooling, provisioning) — respect it
            }
            $context = app(TenantContext::class);
            if ($context->has()) {
                $model->tenant_id = $context->id();
            }
        });
    }

    /** Relationship — every tenant-owned model belongs to one Tenant. */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
