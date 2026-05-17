<?php

namespace App\Services\Invoice;

use App\Models\CompanySetting;
use App\Models\Order;

/**
 * The single source of truth for invoice / quotation money math.
 *
 * Every consumer — the PDF blade, the Tally sales-voucher push, reports,
 * "amount in words" — MUST go through this class. If tax math appears
 * anywhere else, it is a bug: the OCC invoice total and the Tally
 * voucher total are required to agree to the paisa, and they can only
 * do that if they are computed once, here.
 *
 * GST model:
 *   per line:  gross   = qty × rate
 *              lineDisc = gross × discount_pct/100        (pre-tax — GST-correct)
 *              taxable  = gross − lineDisc
 *              lineTax  = taxable × tax_rate/100
 *   document:  taxable+tax summed, then a flat trade discount
 *              (order.discount_amount) is taken off the post-tax total,
 *              then the grand total is rounded to the nearest rupee with
 *              the difference exposed as a signed round-off (Tally posts
 *              this to a Round Off ledger).
 *
 * Intra- vs inter-state (CGST+SGST vs IGST) intentionally preserves the
 * historical blade behaviour for M3 (pure refactor): same-state only
 * when BOTH the seller state code and a buyer state code are present and
 * equal. An explicit place-of-supply override is accepted so M4 can fix
 * the B2C / no-GSTIN case without changing this class again.
 */
class InvoiceCalculator
{
    /**
     * Build the full breakdown for an order (invoice or quotation —
     * the math is identical; only the document title differs).
     *
     * @param  string|null  $placeOfSupplyStateCode  Explicit 2-digit GST
     *                                               state code of the place of supply. When null (default),
     *                                               it is derived from the buyer GSTIN prefix — preserving
     *                                               pre-M3 behaviour.
     */
    public static function for(
        Order $order,
        ?CompanySetting $company = null,
        ?string $placeOfSupplyStateCode = null,
    ): InvoiceBreakdown {
        $company ??= CompanySetting::current();
        $order->loadMissing(['customer', 'items']);

        $sellerState = strtoupper(trim((string) ($company->state_code ?? '')));
        $buyerState = $placeOfSupplyStateCode !== null
            ? strtoupper(trim($placeOfSupplyStateCode))
            : strtoupper(substr(trim((string) ($order->customer->gstin ?? '')), 0, 2));

        // Historical rule (pre-M3): same-state requires both codes
        // present AND equal. Missing buyer code ⇒ inter-state ⇒ IGST.
        $sameState = $sellerState !== '' && $buyerState !== '' && $sellerState === $buyerState;

        $lines = [];
        $subtotal = 0.0;
        $lineDiscountTotal = 0.0;
        $taxableTotal = 0.0;
        $taxTotal = 0.0;
        /** @var array<string, array{taxable: float, tax: float}> $byRate */
        $byRate = [];

        foreach ($order->items as $idx => $it) {
            $qty = (float) $it->qty_ordered;
            $rate = (float) ($it->unit_price ?? 0);
            $discPct = (float) ($it->discount_pct ?? 0);
            $taxRate = (float) ($it->tax_rate ?? 0);

            $gross = $qty * $rate;
            $lineDisc = $gross * $discPct / 100;
            $taxable = $gross - $lineDisc;
            $lineTax = $taxable * $taxRate / 100;

            $subtotal += $gross;
            $lineDiscountTotal += $lineDisc;
            $taxableTotal += $taxable;
            $taxTotal += $lineTax;

            $key = self::rateKey($taxRate);
            $byRate[$key]['taxable'] = ($byRate[$key]['taxable'] ?? 0) + $taxable;
            $byRate[$key]['tax'] = ($byRate[$key]['tax'] ?? 0) + $lineTax;

            $lines[] = new InvoiceLine(
                index: $idx,
                item: $it,
                qty: $qty,
                rate: $rate,
                discountPct: $discPct,
                taxRate: $taxRate,
                gross: $gross,
                lineDiscount: $lineDisc,
                taxable: $taxable,
                tax: $lineTax,
                lineTotal: $taxable + $lineTax,
            );
        }

        $tradeDiscount = max(0.0, (float) ($order->discount_amount ?? 0));
        $preRound = max(0.0, $taxableTotal + $taxTotal - $tradeDiscount);
        $grandTotal = round($preRound, 0);          // nearest rupee
        $roundOff = round($grandTotal - $preRound, 2); // signed; Tally Round Off ledger

        // Rate-wise / HSN summary buckets — M4 prints this on the invoice
        // and uses it to build per-rate Tally tax ledger entries.
        $rateBuckets = [];
        ksort($byRate, SORT_NUMERIC);
        foreach ($byRate as $key => $sums) {
            $r = (float) $key;
            $tax = round($sums['tax'], 2);
            $rateBuckets[] = new RateBucket(
                rate: $r,
                taxable: round($sums['taxable'], 2),
                tax: $tax,
                cgst: $sameState ? round($tax / 2, 2) : 0.0,
                sgst: $sameState ? round($tax / 2, 2) : 0.0,
                igst: $sameState ? 0.0 : $tax,
            );
        }

        return new InvoiceBreakdown(
            lines: $lines,
            rateBuckets: $rateBuckets,
            subtotal: round($subtotal, 2),
            lineDiscountTotal: round($lineDiscountTotal, 2),
            taxableTotal: round($taxableTotal, 2),
            taxTotal: round($taxTotal, 2),
            cgst: $sameState ? round($taxTotal / 2, 2) : 0.0,
            sgst: $sameState ? round($taxTotal / 2, 2) : 0.0,
            igst: $sameState ? 0.0 : round($taxTotal, 2),
            tradeDiscount: round($tradeDiscount, 2),
            roundOff: $roundOff,
            grandTotal: $grandTotal,
            sameState: $sameState,
            sellerStateCode: $sellerState,
            buyerStateCode: $buyerState,
        );
    }

    /** Normalise a tax rate to a stable map key ("18", "12.5", "0"). */
    private static function rateKey(float $rate): string
    {
        return rtrim(rtrim(number_format($rate, 2, '.', ''), '0'), '.') ?: '0';
    }
}
