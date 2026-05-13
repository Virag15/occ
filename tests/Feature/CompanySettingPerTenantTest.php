<?php

namespace Tests\Feature;

use App\Models\CompanySetting;
use App\Models\Tenant;
use App\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * CompanySetting becomes per-tenant: each tenant gets their own row,
 * created lazily with the tenant's name as default.
 */
class CompanySettingPerTenantTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $alpha;

    private Tenant $beta;

    private TenantContext $context;

    protected function setUp(): void
    {
        parent::setUp();
        $this->alpha = Tenant::create(['name' => 'Alpha MSME', 'slug' => 'alpha']);
        $this->beta = Tenant::create(['name' => 'Beta MSME', 'slug' => 'beta']);
        $this->context = app(TenantContext::class);
    }

    protected function tearDown(): void
    {
        $this->context->clear();
        parent::tearDown();
    }

    public function test_current_creates_row_for_active_tenant_on_first_access(): void
    {
        $this->context->set($this->alpha);
        $setting = CompanySetting::current();

        $this->assertSame($this->alpha->id, $setting->tenant_id);
        $this->assertSame('Alpha MSME', $setting->company_name, 'default name = tenant name');
    }

    public function test_each_tenant_has_an_isolated_row(): void
    {
        $alphaSetting = $this->context->runAs($this->alpha, fn () => CompanySetting::current());
        $betaSetting = $this->context->runAs($this->beta, fn () => CompanySetting::current());

        $this->assertNotSame($alphaSetting->id, $betaSetting->id);
        $this->assertSame($this->alpha->id, $alphaSetting->tenant_id);
        $this->assertSame($this->beta->id, $betaSetting->tenant_id);
    }

    public function test_subsequent_calls_return_the_same_row_not_duplicates(): void
    {
        $this->context->set($this->alpha);

        $first = CompanySetting::current();
        $second = CompanySetting::current();

        $this->assertSame($first->id, $second->id);
        $this->assertSame(1, CompanySetting::count(), 'still only one row for this tenant');
    }

    public function test_updates_to_one_tenants_settings_do_not_affect_another(): void
    {
        $this->context->runAs($this->alpha, function () {
            $s = CompanySetting::current();
            $s->update(['company_name' => 'Alpha Pvt Ltd', 'gstin' => '27AAAAA1234A1Z5']);
        });

        $betaName = $this->context->runAs($this->beta, fn () => CompanySetting::current()->company_name);

        $this->assertSame('Beta MSME', $betaName, 'Beta sees its own default, not Alpha\'s name');
    }

    public function test_current_without_tenant_context_uses_legacy_fallback(): void
    {
        // Pre-populate one row without a tenant (legacy path).
        $this->context->clear();
        CompanySetting::withoutGlobalScopes()->create([
            'company_name' => 'Legacy Co.',
            'country' => 'India',
        ]);

        $setting = CompanySetting::current();
        $this->assertSame('Legacy Co.', $setting->company_name);
    }
}
