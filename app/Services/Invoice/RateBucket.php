<?php

namespace App\Services\Invoice;

/**
 * Rate-wise tax summary row. One per distinct GST rate in the document.
 * Drives the HSN/rate summary block on the invoice (M4) and the per-rate
 * Output tax ledger entries in the Tally sales voucher (M4).
 */
final class RateBucket
{
    public function __construct(
        public readonly float $rate,
        public readonly float $taxable,
        public readonly float $tax,
        public readonly float $cgst,
        public readonly float $sgst,
        public readonly float $igst,
    ) {}
}
