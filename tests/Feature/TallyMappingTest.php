<?php

namespace Tests\Feature;

use App\Models\TallyLedgerMap;
use App\Models\User;
use App\Tenancy\TenantScope;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TallyMappingTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_view_the_mapping_page(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'owner']));

        $this->get('/settings/tally-mapping')
            ->assertOk()
            ->assertInertia(fn ($p) => $p->component('Settings/TallyMapping')->has('map')->has('missing'));
    }

    public function test_non_owner_is_forbidden(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'accounts']));

        $this->get('/settings/tally-mapping')->assertForbidden();
    }

    public function test_update_persists_and_normalises_rate_keyed_ledgers(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'owner']));

        $this->post('/settings/tally-mapping', [
            'sales_ledgers' => ['18.00' => 'Sales - GST 18%', '12' => 'Sales - GST 12%', '5' => ''],
            'output_cgst_ledger' => 'Output CGST',
            'output_sgst_ledger' => 'Output SGST',
            'round_off_ledger' => 'Round Off',
        ])->assertRedirect('/settings/tally-mapping');

        $map = TallyLedgerMap::withoutGlobalScope(TenantScope::class)->firstOrFail();

        // "18.00" normalised to "18"; blank-ledger 5% row dropped.
        $this->assertSame(['12' => 'Sales - GST 12%', '18' => 'Sales - GST 18%'], $map->sales_ledgers);
        $this->assertSame('Output CGST', $map->output_cgst_ledger);
        $this->assertSame('Sales - GST 18%', $map->salesLedgerForRate(18.0));
    }
}
