<?php

namespace App\Services\Invoice;

use App\Models\OrderItem;

/** One computed invoice line. Money fields are raw (not yet display-rounded). */
final class InvoiceLine
{
    public function __construct(
        public readonly int $index,
        public readonly OrderItem $item,
        public readonly float $qty,
        public readonly float $rate,
        public readonly float $discountPct,
        public readonly float $taxRate,
        public readonly float $gross,
        public readonly float $lineDiscount,
        public readonly float $taxable,
        public readonly float $tax,
        public readonly float $lineTotal,
    ) {}
}
