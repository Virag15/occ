<?php

namespace Tests\Feature;

use App\Models\TallyLedgerMap;
use App\Tenancy\TenantScope;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TallyLedgerMapTest extends TestCase
{
    use RefreshDatabase;

    public function test_current_creates_a_single_row_and_is_idempotent(): void
    {
        $a = TallyLedgerMap::current();
        $b = TallyLedgerMap::current();

        $this->assertSame($a->id, $b->id);
        $this->assertSame(1, TallyLedgerMap::withoutGlobalScope(TenantScope::class)->count());
    }

    public function test_rate_keyed_lookup_matches_invoice_calculator_keying(): void
    {
        $map = TallyLedgerMap::current();
        $map->update([
            'sales_ledgers' => ['18' => 'Sales - GST 18%', '12.5' => 'Sales - GST 12.5%'],
        ]);

        $this->assertSame('Sales - GST 18%', $map->salesLedgerForRate(18.0));
        $this->assertSame('Sales - GST 18%', $map->salesLedgerForRate(18.00));
        $this->assertSame('Sales - GST 12.5%', $map->salesLedgerForRate(12.5));
        $this->assertNull($map->salesLedgerForRate(28.0));
    }

    public function test_output_tax_ledgers_switch_on_state(): void
    {
        $map = TallyLedgerMap::current();
        $map->update([
            'output_cgst_ledger' => 'Output CGST',
            'output_sgst_ledger' => 'Output SGST',
            'output_igst_ledger' => 'Output IGST',
        ]);

        $this->assertSame(['Output CGST', 'Output SGST'], $map->outputTaxLedgers(true));
        $this->assertSame(['Output IGST'], $map->outputTaxLedgers(false));
    }

    public function test_missing_critical_ledgers_flags_unconfigured_map(): void
    {
        $map = TallyLedgerMap::current();

        $this->assertContains('sales_ledgers', $map->missingCriticalLedgers());
        $this->assertContains('output_igst_ledger', $map->missingCriticalLedgers());
    }
}
