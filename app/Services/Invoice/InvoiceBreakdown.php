<?php

namespace App\Services\Invoice;

/**
 * Immutable result of InvoiceCalculator::for(). All money fields are
 * already rounded for display/posting; consumers must not re-derive.
 */
final class InvoiceBreakdown
{
    /**
     * @param  list<InvoiceLine>  $lines
     * @param  list<RateBucket>  $rateBuckets  Rate-wise/HSN tax summary
     */
    public function __construct(
        public readonly array $lines,
        public readonly array $rateBuckets,
        public readonly float $subtotal,
        public readonly float $lineDiscountTotal,
        public readonly float $taxableTotal,
        public readonly float $taxTotal,
        public readonly float $cgst,
        public readonly float $sgst,
        public readonly float $igst,
        public readonly float $tradeDiscount,
        public readonly float $roundOff,
        public readonly float $grandTotal,
        public readonly bool $sameState,
        public readonly string $sellerStateCode,
        public readonly string $buyerStateCode,
    ) {}

    public function hasLineDiscount(): bool
    {
        return $this->lineDiscountTotal > 0;
    }

    public function hasTradeDiscount(): bool
    {
        return $this->tradeDiscount > 0;
    }

    public function hasRoundOff(): bool
    {
        return abs($this->roundOff) >= 0.005;
    }
}
