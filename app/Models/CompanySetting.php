<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use App\Tenancy\TenantContext;
use App\Tenancy\TenantScope;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Per-tenant config row for company-wide settings used on invoices, slips,
 * dashboards. Access via CompanySetting::current() — caller treats it as
 * a per-tenant singleton.
 */
class CompanySetting extends Model
{
    use BelongsToTenant, HasFactory;

    protected $guarded = [];

    /**
     * Get (or lazily create) the active tenant's settings row.
     *
     *  - With an active tenant context: returns that tenant's row,
     *    creating it on first access with the tenant's name as default.
     *    BelongsToTenant trait stamps tenant_id.
     *  - Without a tenant context (public tracking page, console without
     *    a set tenant): falls back to the first row globally so legacy
     *    code paths keep rendering. Production traffic always has a
     *    tenant set by the SetCurrentTenant middleware.
     */
    public static function current(): self
    {
        $tenant = app(TenantContext::class)->current();

        if ($tenant === null) {
            $row = static::withoutGlobalScope(TenantScope::class)->first();
            if ($row) {
                return $row;
            }

            return static::create(['company_name' => 'OCC', 'country' => 'India']);
        }

        return static::firstOrCreate(
            [],
            ['company_name' => $tenant->name, 'country' => 'India'],
        );
    }

    /**
     * Two parties are in the same state for GST purposes if state_code matches.
     * Used to decide CGST+SGST vs IGST on the invoice.
     */
    public function isSameState(?string $buyerStateCode): bool
    {
        if (! $this->state_code || ! $buyerStateCode) {
            return true;
        } // Conservative default

        return strtoupper(trim($this->state_code)) === strtoupper(trim($buyerStateCode));
    }
}
