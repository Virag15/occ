<?php

namespace App\Tenancy;

use App\Models\Tenant;

/**
 * Single source of truth for "who is the active tenant on this request."
 *
 * Set by SetCurrentTenant middleware (web), by console commands explicitly,
 * or by tests via the actingAsTenant() helper. Read by the BelongsToTenant
 * trait's global scope and creating hook, and by any service that needs to
 * scope work (e.g. queue jobs).
 *
 * Implemented as a singleton in the Laravel container so request-scoped
 * (web) and process-scoped (console) lifetimes both work without globals.
 */
class TenantContext
{
    private ?Tenant $current = null;

    /** Reading: which tenant is active right now? null = no tenant context (e.g. login page, public tracking). */
    public function current(): ?Tenant
    {
        return $this->current;
    }

    /** Reading: shortcut for the active tenant's primary key. */
    public function id(): ?int
    {
        return $this->current?->id;
    }

    /** Reading: true if any tenant is active. */
    public function has(): bool
    {
        return $this->current !== null;
    }

    /** Writing: set the active tenant. Middleware + console commands call this. */
    public function set(?Tenant $tenant): void
    {
        $this->current = $tenant;
    }

    /** Writing: clear the active tenant. Used at end of console commands or in tests. */
    public function clear(): void
    {
        $this->current = null;
    }

    /**
     * Run a callback with a temporary tenant override, restoring the previous
     * tenant afterwards (even if the callback throws). Useful for:
     *  - cross-tenant admin operations (impersonation, provisioning)
     *  - console commands that loop over tenants
     *  - tests that need to assert isolation
     */
    public function runAs(?Tenant $tenant, callable $callback): mixed
    {
        $previous = $this->current;
        $this->current = $tenant;
        try {
            return $callback();
        } finally {
            $this->current = $previous;
        }
    }
}
