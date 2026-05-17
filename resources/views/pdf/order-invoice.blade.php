<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Tax Invoice — {{ $order->order_code }}</title>
    <style>
        @page { size: A4 portrait; margin: 10mm; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 9pt; color: #1f1d1a; line-height: 1.35; margin: 0; padding: 0; }
        h1, h2, h3, h4, p { margin: 0; padding: 0; }
        .label { font-size: 6.5pt; letter-spacing: 0.6pt; text-transform: uppercase; color: #6b6660; }
        .mono { font-family: DejaVu Sans Mono, monospace; }
        .num { text-align: right; }
        .border { border: 0.5pt solid #2a2722; }
        .border-b { border-bottom: 0.5pt solid #2a2722; }
        .border-t { border-top: 0.5pt solid #2a2722; }
        .accent { background: #f5f1e8; }

        /* Header */
        .header { padding: 6pt 0 8pt; border-bottom: 1pt solid #2a2722; }
        .header table { width: 100%; }
        .header .logo { width: 60pt; height: 60pt; vertical-align: top; }
        .header .company-name { font-size: 14pt; font-weight: bold; letter-spacing: 0.3pt; }
        .header .tagline { font-size: 7pt; color: #6b6660; }
        .header .invoice-title { font-size: 16pt; font-weight: bold; letter-spacing: 0.5pt; text-align: right; }

        /* Top info grid */
        .info-grid { display: table; width: 100%; margin-top: 6pt; border-collapse: collapse; }
        .info-grid .row { display: table-row; }
        .info-grid .cell { display: table-cell; padding: 6pt 8pt; vertical-align: top; }
        .info-grid .cell.split-left  { width: 50%; border: 0.5pt solid #2a2722; }
        .info-grid .cell.split-right { width: 50%; border: 0.5pt solid #2a2722; border-left: 0; }
        .info-grid .label-row { font-weight: bold; font-size: 8pt; margin-bottom: 2pt; }

        /* Reference strip */
        .ref-strip { margin-top: 6pt; }
        .ref-strip table { width: 100%; border-collapse: collapse; }
        .ref-strip td { border: 0.5pt solid #2a2722; padding: 4pt 6pt; vertical-align: top; width: 25%; }

        /* Items table */
        table.items { width: 100%; border-collapse: collapse; margin-top: 8pt; }
        table.items thead th { background: #f5f1e8; padding: 5pt 4pt; border: 0.5pt solid #2a2722; font-size: 7.5pt; text-align: left; }
        table.items thead th.num { text-align: right; }
        table.items tbody td { padding: 5pt 4pt; border: 0.5pt solid #c5beb2; vertical-align: top; }
        table.items tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
        table.items tfoot td { padding: 4pt 4pt; border: 0.5pt solid #2a2722; font-weight: bold; }
        table.items tfoot td.num { text-align: right; }
        table.items tfoot tr.grand td { background: #f5f1e8; font-size: 10pt; padding: 6pt 4pt; }

        /* Summary */
        .summary-row { display: table; width: 100%; margin-top: 6pt; }
        .summary-row .left, .summary-row .right { display: table-cell; vertical-align: top; }
        .summary-row .left { width: 60%; padding-right: 6pt; }
        .summary-row .right { width: 40%; }

        .frame { border: 0.5pt solid #2a2722; padding: 5pt 7pt; }
        .terms { font-size: 7.5pt; line-height: 1.5; }
        .sig-block { margin-top: 10pt; display: table; width: 100%; }
        .sig-block .left, .sig-block .right { display: table-cell; vertical-align: top; }
        .sig-block .right { text-align: right; width: 40%; }
        .sig-line { display: inline-block; min-width: 140pt; border-bottom: 0.5pt dashed #6b6660; margin-top: 26pt; }
    </style>
</head>
<body>

@php
    $cs = $company; // app/Models/CompanySetting current row
    $cust = $order->customer;

    // Mode: 'invoice' (default) | 'quotation'
    $mode = $mode ?? 'invoice';
    $isQuotation = $mode === 'quotation';
    $docTitle = $isQuotation ? 'QUOTATION' : 'TAX INVOICE';
    $docSubtitle = $isQuotation ? 'Pro-forma — not a tax invoice' : 'Original for Recipient';
    $shipToLabel = $isQuotation ? 'Quote to' : 'Ship to';
    $billToLabel = $isQuotation ? 'Quote for' : 'Bill to';
    $validUntil = $isQuotation ? (\Carbon\Carbon::parse($order->order_date)->addDays(15)->format('d M Y')) : null;

    // ALL money math comes from the single InvoiceCalculator (M3). This
    // blade must not recompute tax — the Tally voucher uses the same
    // breakdown so the totals are guaranteed to agree to the paisa.
    $b = $breakdown;
    $sameState = $b->sameState;
    $buyerState = $b->buyerStateCode;
    $subtotal = $b->subtotal;
    $lineDiscountTotal = $b->lineDiscountTotal;
    $taxableTotal = $b->taxableTotal;
    $taxTotal = $b->taxTotal;
    $orderDiscount = $b->tradeDiscount;
    $grandTotal = $b->grandTotal;
@endphp

{{-- HEADER --}}
<div class="header">
    <table>
        <tr>
            <td>
                @if ($logoBase64)
                    <img src="{{ $logoBase64 }}" class="logo" />
                @endif
            </td>
            <td style="padding-left: 8pt; vertical-align: top;">
                <p class="company-name">{{ $cs->company_name }}</p>
                @if ($cs->legal_name && $cs->legal_name !== $cs->company_name)
                    <p style="font-size: 8pt;">{{ $cs->legal_name }}</p>
                @endif
                <p class="tagline">{{ $cs->invoice_footer_note }}</p>
                <p style="font-size: 7.5pt; margin-top: 2pt;">
                    @if ($cs->address_line_1){{ $cs->address_line_1 }}@endif
                    @if ($cs->address_line_2), {{ $cs->address_line_2 }}@endif
                    @if ($cs->city), {{ $cs->city }}@endif
                    @if ($cs->state) — {{ $cs->state }}@endif
                    @if ($cs->pincode) {{ $cs->pincode }}@endif
                </p>
                <p style="font-size: 7.5pt;">
                    @if ($cs->gstin)<span class="mono">GSTIN: {{ $cs->gstin }}</span>@endif
                    @if ($cs->pan)  · <span class="mono">PAN: {{ $cs->pan }}</span>@endif
                    @if ($cs->phone) · {{ $cs->phone }}@endif
                    @if ($cs->email) · {{ $cs->email }}@endif
                </p>
            </td>
            <td style="vertical-align: top; text-align: right; width: 130pt;">
                <p class="invoice-title">{{ $docTitle }}</p>
                <p class="mono" style="font-size: 10pt; margin-top: 4pt;">{{ $isQuotation ? $order->order_code : ($order->invoice_number ?? $order->order_code) }}</p>
                <p style="font-size: 7.5pt; color: #6b6660;">Date: {{ optional($order->invoice_date ?? $order->order_date)->format('d M Y') }}</p>
                @if ($validUntil)
                    <p style="font-size: 7.5pt; color: #6b6660;">Valid until: {{ $validUntil }}</p>
                @endif
                <p style="font-size: 7pt; color: #6b6660;">{{ $docSubtitle }}</p>
            </td>
        </tr>
    </table>
</div>

{{-- BUYER & SHIPMENT --}}
<div class="info-grid">
    <div class="row">
        <div class="cell split-left">
            <p class="label-row">{{ $billToLabel }}</p>
            <p style="font-weight: bold; font-size: 10pt;">{{ $cust->name }}</p>
            @if ($cust->company)<p>{{ $cust->company }}</p>@endif
            @if ($cust->billing_address)<p style="font-size: 8pt;">{!! nl2br(e($cust->billing_address)) !!}</p>@endif
            <p style="font-size: 8pt;">
                @if ($cust->city){{ $cust->city }}@endif
                @if ($cust->state) — {{ $cust->state }}@endif
            </p>
            @if ($cust->gstin)<p class="mono" style="font-size: 8pt; margin-top: 2pt;">GSTIN: {{ $cust->gstin }}</p>@endif
            @if ($cust->phone)<p class="mono" style="font-size: 8pt;">Phone: {{ $cust->phone }}</p>@endif
        </div>
        <div class="cell split-right">
            <p class="label-row">{{ $shipToLabel }}</p>
            <p style="font-weight: bold; font-size: 10pt;">{{ $cust->name }}</p>
            @if ($cust->delivery_address)<p style="font-size: 8pt;">{!! nl2br(e($cust->delivery_address)) !!}</p>
            @elseif ($cust->billing_address)<p style="font-size: 8pt;">{!! nl2br(e($cust->billing_address)) !!}</p>@endif
            <p style="font-size: 8pt;">
                @if ($cust->city){{ $cust->city }}@endif
                @if ($cust->state) — {{ $cust->state }}@endif
            </p>
            <p class="label" style="margin-top: 4pt;">Place of supply</p>
            <p style="font-size: 8pt;">{{ $cust->state ?? '—' }} @if ($buyerState)({{ $buyerState }})@endif</p>
        </div>
    </div>
</div>

{{-- REFERENCE STRIP --}}
<div class="ref-strip">
    <table>
        <tr>
            <td>
                <p class="label">Our order #</p>
                <p class="mono" style="font-weight: bold;">{{ $order->order_code }}</p>
            </td>
            <td>
                <p class="label">Order date</p>
                <p>{{ optional($order->order_date)->format('d M Y') ?? '—' }}</p>
            </td>
            <td>
                <p class="label">Customer ref</p>
                <p class="mono">{{ $order->customer_reference_number ?? '—' }}</p>
            </td>
            <td>
                <p class="label">Customer PO</p>
                <p class="mono">{{ $order->customer_po_number ?? '—' }}</p>
            </td>
        </tr>
    </table>
</div>

{{-- ITEMS TABLE --}}
<table class="items">
    <thead>
        <tr>
            <th style="width: 18pt;">Sr</th>
            <th>Description of goods</th>
            <th style="width: 48pt;">HSN/SAC</th>
            <th class="num" style="width: 38pt;">Qty</th>
            <th style="width: 24pt;">Unit</th>
            <th class="num" style="width: 56pt;">Rate (₹)</th>
            <th class="num" style="width: 32pt;">Disc %</th>
            <th class="num" style="width: 30pt;">Tax %</th>
            <th class="num" style="width: 64pt;">Amount (₹)</th>
        </tr>
    </thead>
    <tbody>
        @foreach ($b->lines as $line)
            @php $it = $line->item; @endphp
            <tr>
                <td class="num">{{ $line->index + 1 }}</td>
                <td>
                    <strong>{{ $it->product_name }}</strong>
                    @if ($it->product?->sku)<br><span class="mono" style="font-size: 7pt; color: #6b6660;">{{ $it->product->sku }}</span>@endif
                </td>
                <td class="mono" style="font-size: 8pt;">{{ $it->product?->hsn_code ?? '—' }}</td>
                <td class="num">{{ rtrim(rtrim(number_format($line->qty, 3, '.', ''), '0'), '.') }}</td>
                <td>{{ $it->unit }}</td>
                <td class="num">{{ number_format($line->rate, 2) }}</td>
                <td class="num">{{ $line->discountPct > 0 ? number_format($line->discountPct, 2) : '—' }}</td>
                <td class="num">{{ number_format($line->taxRate, 2) }}</td>
                <td class="num"><strong>{{ number_format($line->lineTotal, 2) }}</strong></td>
            </tr>
        @endforeach

        {{-- Empty rows to keep the table looking full when there are few items --}}
        @for ($i = count($order->items); $i < 4; $i++)
            <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
        @endfor
    </tbody>
    <tfoot>
        <tr>
            <td colspan="8" class="num">Gross subtotal</td>
            <td class="num">₹ {{ number_format($subtotal, 2) }}</td>
        </tr>
        @if ($lineDiscountTotal > 0)
            <tr>
                <td colspan="8" class="num">Less: line discounts</td>
                <td class="num">− ₹ {{ number_format($lineDiscountTotal, 2) }}</td>
            </tr>
            <tr>
                <td colspan="8" class="num">Taxable value</td>
                <td class="num">₹ {{ number_format($taxableTotal, 2) }}</td>
            </tr>
        @endif
        @if ($sameState)
            <tr>
                <td colspan="8" class="num">CGST</td>
                <td class="num">₹ {{ number_format($b->cgst, 2) }}</td>
            </tr>
            <tr>
                <td colspan="8" class="num">SGST</td>
                <td class="num">₹ {{ number_format($b->sgst, 2) }}</td>
            </tr>
        @else
            <tr>
                <td colspan="8" class="num">IGST</td>
                <td class="num">₹ {{ number_format($b->igst, 2) }}</td>
            </tr>
        @endif
        @if ($orderDiscount > 0)
            <tr>
                <td colspan="8" class="num">Less: trade discount</td>
                <td class="num">− ₹ {{ number_format($orderDiscount, 2) }}</td>
            </tr>
        @endif
        @if ($b->hasRoundOff())
            <tr>
                <td colspan="8" class="num">Round off</td>
                <td class="num">{{ $b->roundOff < 0 ? '− ₹ '.number_format(abs($b->roundOff), 2) : '+ ₹ '.number_format($b->roundOff, 2) }}</td>
            </tr>
        @endif
        <tr class="grand">
            <td colspan="8" class="num">GRAND TOTAL</td>
            <td class="num">₹ {{ number_format($grandTotal, 2) }}</td>
        </tr>
    </tfoot>
</table>

{{-- AMOUNT IN WORDS --}}
<div style="margin-top: 4pt; padding: 4pt 6pt; border: 0.5pt solid #2a2722;">
    <span class="label">Amount in words:</span>
    <strong style="text-transform: uppercase;">{{ $amountInWords }}</strong>
</div>

{{-- BANK + TERMS --}}
<div class="summary-row">
    <div class="left">
        <div class="frame">
            <p class="label">Bank details — for payment</p>
            <table style="width: 100%; font-size: 8pt; margin-top: 3pt;">
                <tr><td style="color: #6b6660; padding: 1pt 0; width: 80pt;">Bank</td><td>{{ $cs->bank_name ?? '—' }}</td></tr>
                <tr><td style="color: #6b6660; padding: 1pt 0;">Branch</td><td>{{ $cs->bank_branch ?? '—' }}</td></tr>
                <tr><td style="color: #6b6660; padding: 1pt 0;">A/c number</td><td class="mono">{{ $cs->bank_account_number ?? '—' }}</td></tr>
                <tr><td style="color: #6b6660; padding: 1pt 0;">IFSC</td><td class="mono">{{ $cs->bank_ifsc ?? '—' }}</td></tr>
                @if ($cs->upi_id)
                    <tr><td style="color: #6b6660; padding: 1pt 0;">UPI</td><td class="mono">{{ $cs->upi_id }}</td></tr>
                @endif
            </table>
        </div>

        @if ($cs->terms_and_conditions)
            <div class="frame" style="margin-top: 5pt;">
                <p class="label">Terms &amp; conditions</p>
                <p class="terms" style="margin-top: 3pt; white-space: pre-line;">{{ $cs->terms_and_conditions }}</p>
            </div>
        @endif
    </div>

    <div class="right">
        <div class="frame" style="background: #f5f1e8;">
            <p class="label">Summary</p>
            <table style="width: 100%; font-size: 8.5pt; margin-top: 3pt;">
                <tr><td style="color: #6b6660; padding: 1pt 0;">Gross</td><td class="num">₹ {{ number_format($subtotal, 2) }}</td></tr>
                @if ($lineDiscountTotal > 0)
                    <tr><td style="color: #6b6660; padding: 1pt 0;">Line discounts</td><td class="num">− ₹ {{ number_format($lineDiscountTotal, 2) }}</td></tr>
                    <tr><td style="color: #6b6660; padding: 1pt 0;">Taxable</td><td class="num">₹ {{ number_format($taxableTotal, 2) }}</td></tr>
                @endif
                @if ($sameState)
                    <tr><td style="color: #6b6660; padding: 1pt 0;">CGST</td><td class="num">₹ {{ number_format($b->cgst, 2) }}</td></tr>
                    <tr><td style="color: #6b6660; padding: 1pt 0;">SGST</td><td class="num">₹ {{ number_format($b->sgst, 2) }}</td></tr>
                @else
                    <tr><td style="color: #6b6660; padding: 1pt 0;">IGST</td><td class="num">₹ {{ number_format($b->igst, 2) }}</td></tr>
                @endif
                @if ($orderDiscount > 0)
                    <tr><td style="color: #6b6660; padding: 1pt 0;">Trade discount</td><td class="num">− ₹ {{ number_format($orderDiscount, 2) }}</td></tr>
                @endif
                @if ($b->hasRoundOff())
                    <tr><td style="color: #6b6660; padding: 1pt 0;">Round off</td><td class="num">{{ $b->roundOff < 0 ? '− ₹ '.number_format(abs($b->roundOff), 2) : '+ ₹ '.number_format($b->roundOff, 2) }}</td></tr>
                @endif
                <tr style="border-top: 0.5pt solid #2a2722;">
                    <td style="padding: 3pt 0;"><strong>Total payable</strong></td>
                    <td class="num"><strong>₹ {{ number_format($grandTotal, 2) }}</strong></td>
                </tr>
                @if (!$isQuotation && $order->amount_received && (float) $order->amount_received > 0)
                    <tr><td style="color: #6b6660; padding: 1pt 0;">Received</td><td class="num">₹ {{ number_format((float) $order->amount_received, 2) }}</td></tr>
                    <tr><td style="padding: 1pt 0;"><strong>Balance due</strong></td><td class="num"><strong>₹ {{ number_format(max(0, $grandTotal - (float) $order->amount_received), 2) }}</strong></td></tr>
                @endif
            </table>
        </div>

        <div class="sig-block">
            <div class="right" style="display: block; width: 100%; text-align: right;">
                <p style="font-size: 8pt; color: #6b6660; margin-top: 14pt;">For <strong>{{ $cs->company_name }}</strong></p>
                @if ($signatureBase64)
                    <div style="margin-top: 6pt; height: 36pt;">
                        <img src="{{ $signatureBase64 }}" style="max-height: 36pt; max-width: 140pt;" />
                    </div>
                    <div style="border-bottom: 0.5pt solid #2a2722; min-width: 140pt; display: inline-block;"></div>
                @else
                    <div class="sig-line"></div>
                @endif
                <p style="font-size: 9pt; font-weight: bold; margin-top: 2pt;">{{ $cs->signatory_name ?? '' }}</p>
                <p class="label">{{ $cs->signatory_designation ?? 'Authorised Signatory' }}</p>
            </div>
        </div>
    </div>
</div>

@if ($cs->invoice_footer_note)
    <p style="text-align: center; margin-top: 10pt; font-size: 7pt; color: #6b6660;">{{ $cs->invoice_footer_note }}</p>
@endif
<p style="text-align: center; margin-top: 4pt; font-size: 7pt; color: #6b6660;">This is a computer-generated invoice. Subject to {{ $cs->city ?? 'Nashik' }} jurisdiction. E&amp;OE.</p>

</body>
</html>
