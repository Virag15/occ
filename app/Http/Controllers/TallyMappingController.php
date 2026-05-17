<?php

namespace App\Http\Controllers;

use App\Models\TallyLedgerMap;
use App\Services\Tally\TallyClient;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Settings → Tally mapping (M2). Owner-only. Lets the tenant point each
 * OCC posting concept at a named ledger in their TallyPrime company.
 *
 * Ledger names are free-typed until M1 lands a live ledger pull; once
 * it does, `availableLedgers` is populated and the UI turns these into
 * pick-lists validated against the real chart of accounts.
 */
class TallyMappingController extends Controller
{
    public function edit(TallyClient $client): Response
    {
        $map = TallyLedgerMap::current();

        return Inertia::render('Settings/TallyMapping', [
            'map' => $map,
            'missing' => $map->missingCriticalLedgers(),
            // Empty until M1 implements fetchLedgers() against live Tally.
            'availableLedgers' => method_exists($client, 'fetchLedgers') && $client->isEnabled()
                ? $client->fetchLedgers()
                : [],
            'tally_enabled' => $client->isEnabled(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'sales_ledgers' => ['nullable', 'array'],
            'sales_ledgers.*' => ['nullable', 'string', 'max:200'],
            'purchase_ledgers' => ['nullable', 'array'],
            'purchase_ledgers.*' => ['nullable', 'string', 'max:200'],
            'output_cgst_ledger' => ['nullable', 'string', 'max:200'],
            'output_sgst_ledger' => ['nullable', 'string', 'max:200'],
            'output_igst_ledger' => ['nullable', 'string', 'max:200'],
            'input_cgst_ledger' => ['nullable', 'string', 'max:200'],
            'input_sgst_ledger' => ['nullable', 'string', 'max:200'],
            'input_igst_ledger' => ['nullable', 'string', 'max:200'],
            'round_off_ledger' => ['nullable', 'string', 'max:200'],
            'discount_ledger' => ['nullable', 'string', 'max:200'],
            'freight_ledger' => ['nullable', 'string', 'max:200'],
            'default_bank_ledger' => ['nullable', 'string', 'max:200'],
            'cash_ledger' => ['nullable', 'string', 'max:200'],
        ]);

        // Drop blank rate→ledger entries and normalise the rate keys so a
        // lookup by 18 / 18.0 / "18.00" all resolve (matches
        // InvoiceCalculator + TallyLedgerMap::rateKey).
        $data['sales_ledgers'] = $this->cleanRateMap($data['sales_ledgers'] ?? []);
        $data['purchase_ledgers'] = $this->cleanRateMap($data['purchase_ledgers'] ?? []);

        $map = TallyLedgerMap::current();
        $map->fill($data);
        $map->updated_by = Auth::id();
        $map->save();

        return redirect()
            ->route('settings.tally-mapping')
            ->with('success', 'Tally ledger mapping saved.');
    }

    /**
     * @param  array<int|string,string|null>  $raw
     * @return array<string,string>
     */
    private function cleanRateMap(array $raw): array
    {
        $out = [];
        foreach ($raw as $rate => $ledger) {
            $ledger = is_string($ledger) ? trim($ledger) : '';
            if ($ledger === '' || ! is_numeric($rate)) {
                continue;
            }
            $key = rtrim(rtrim(number_format((float) $rate, 2, '.', ''), '0'), '.') ?: '0';
            $out[$key] = $ledger;
        }
        ksort($out, SORT_NUMERIC);

        return $out;
    }
}
