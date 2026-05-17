<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use App\Tenancy\TenantContext;
use App\Tenancy\TenantScope;
use Illuminate\Database\Eloquent\Model;

/**
 * Per-tenant OCC → Tally ledger name map (M2). One row per tenant.
 *
 * The M4 sales-voucher builder reads this to decide which named Tally
 * ledgers each posting line targets. Rate-keyed maps are stored as
 * {rate => name} with the rate normalised the same way
 * InvoiceCalculator keys its RateBuckets ("18", "12.5", "0").
 *
 * @property array<string,string>|null $sales_ledgers
 * @property array<string,string>|null $purchase_ledgers
 */
class TallyLedgerMap extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'sales_ledgers', 'purchase_ledgers',
        'output_cgst_ledger', 'output_sgst_ledger', 'output_igst_ledger',
        'input_cgst_ledger', 'input_sgst_ledger', 'input_igst_ledger',
        'round_off_ledger', 'discount_ledger', 'freight_ledger',
        'default_bank_ledger', 'cash_ledger',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'sales_ledgers' => 'array',
            'purchase_ledgers' => 'array',
        ];
    }

    /**
     * The active tenant's map, creating an empty row on first access so
     * the settings form always has something to bind to. Mirrors
     * CompanySetting::current().
     */
    public static function current(): self
    {
        $context = app(TenantContext::class);

        return $context->has()
            ? static::firstOrCreate([])
            : static::withoutGlobalScope(TenantScope::class)->firstOrCreate(['tenant_id' => null]);
    }

    /** Sales ledger for a GST rate, keyed exactly like InvoiceCalculator. */
    public function salesLedgerForRate(float $rate): ?string
    {
        return $this->sales_ledgers[$this->rateKey($rate)] ?? null;
    }

    public function purchaseLedgerForRate(float $rate): ?string
    {
        return $this->purchase_ledgers[$this->rateKey($rate)] ?? null;
    }

    /**
     * Output-tax ledger names for one rate bucket. Returns the CGST+SGST
     * pair for intra-state or the single IGST ledger for inter-state.
     *
     * @return array<int,string|null>
     */
    public function outputTaxLedgers(bool $sameState): array
    {
        return $sameState
            ? [$this->output_cgst_ledger, $this->output_sgst_ledger]
            : [$this->output_igst_ledger];
    }

    /** Names referenced but not yet configured — drives the settings UI warning. */
    public function missingCriticalLedgers(): array
    {
        $missing = [];
        foreach ([
            'output_cgst_ledger', 'output_sgst_ledger', 'output_igst_ledger',
            'round_off_ledger', 'default_bank_ledger',
        ] as $field) {
            if (blank($this->{$field})) {
                $missing[] = $field;
            }
        }
        if (blank($this->sales_ledgers)) {
            $missing[] = 'sales_ledgers';
        }

        return $missing;
    }

    private function rateKey(float $rate): string
    {
        return rtrim(rtrim(number_format($rate, 2, '.', ''), '0'), '.') ?: '0';
    }
}
