{{--
    Quotation PDF — strictly black on white, numbers in monospace.
    Clean, modern, no accent colours. DomPDF-safe (table layout, DejaVu
    fonts). Company logo top-left; brand-logo strip above the signature.
--}}
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Quotation — {{ $quotation->quotation_code }}</title>
    <style>
        @page { size: A4 portrait; margin: 14mm 12mm; }
        * { box-sizing: border-box; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 9pt; color: #000; line-height: 1.4; margin: 0; }
        h1, h2, h3, p, table { margin: 0; padding: 0; }
        .mono { font-family: 'DejaVu Sans Mono', monospace; }
        .num { font-family: 'DejaVu Sans Mono', monospace; text-align: right; white-space: nowrap; }
        .label { font-size: 6.5pt; letter-spacing: 1pt; text-transform: uppercase; color: #000; font-weight: bold; }
        .muted { color: #555; }
        .rule { border: 0; border-top: 1pt solid #000; margin: 10pt 0; }
        .thin { border: 0; border-top: 0.4pt solid #000; }

        /* Header */
        .hdr { width: 100%; border-collapse: collapse; }
        .hdr td { vertical-align: top; }
        .hdr .logo { width: 120pt; }
        .hdr .logo img { max-width: 110pt; max-height: 52pt; }
        .hdr .co-name { font-size: 15pt; font-weight: bold; letter-spacing: 0.3pt; }
        .hdr .co-meta { font-size: 7.5pt; color: #333; margin-top: 2pt; }
        .hdr .doc { text-align: right; }
        .hdr .doc .title { font-size: 20pt; font-weight: bold; letter-spacing: 3pt; }
        .hdr .doc .code { font-size: 10pt; margin-top: 3pt; }

        /* Meta strip */
        .meta { width: 100%; border-collapse: collapse; margin-top: 14pt; }
        .meta td { width: 50%; border: 0.6pt solid #000; padding: 8pt 10pt; vertical-align: top; }
        .meta .k { font-size: 6.5pt; letter-spacing: 1pt; text-transform: uppercase; font-weight: bold; }
        .meta .v { font-size: 9pt; margin-top: 1pt; }
        .meta .name { font-size: 11pt; font-weight: bold; }

        /* Items */
        table.items { width: 100%; border-collapse: collapse; margin-top: 14pt; }
        table.items th { border-top: 1pt solid #000; border-bottom: 1pt solid #000; padding: 6pt 6pt; font-size: 7pt; letter-spacing: 0.6pt; text-transform: uppercase; text-align: left; }
        table.items th.r { text-align: right; }
        table.items td { padding: 6pt 6pt; border-bottom: 0.4pt solid #bbb; vertical-align: top; font-size: 8.5pt; }
        table.items td.r { text-align: right; font-family: 'DejaVu Sans Mono', monospace; white-space: nowrap; }
        table.items .idx { color: #777; width: 16pt; font-family: 'DejaVu Sans Mono', monospace; }
        table.items .desc { font-weight: bold; }
        table.items .hsn { font-size: 7pt; color: #555; font-family: 'DejaVu Sans Mono', monospace; }

        /* Totals */
        .totals { width: 100%; border-collapse: collapse; margin-top: 12pt; }
        .totals td { vertical-align: top; }
        .totals .spacer { width: 55%; }
        .totals .tt { width: 45%; }
        .totals .tt table { width: 100%; border-collapse: collapse; }
        .totals .tt td { padding: 4pt 0; font-size: 9pt; }
        .totals .tt td.k { color: #333; }
        .totals .tt td.v { text-align: right; font-family: 'DejaVu Sans Mono', monospace; white-space: nowrap; }
        .totals .grand td { border-top: 1pt solid #000; border-bottom: 1pt solid #000; padding: 7pt 0; font-size: 11pt; font-weight: bold; }

        .words { margin-top: 8pt; font-size: 8.5pt; }
        .words .label { display: inline; }

        .blk { margin-top: 16pt; }
        .blk .label { margin-bottom: 3pt; }
        .blk .body { font-size: 8pt; color: #222; white-space: pre-line; }

        /* Brand strip */
        .brands { margin-top: 22pt; border-top: 0.6pt solid #000; padding-top: 8pt; }
        .brands .label { margin-bottom: 6pt; }
        .brands img { max-height: 26pt; max-width: 70pt; margin-right: 16pt; vertical-align: middle; }

        /* Sign-off */
        .sign { width: 100%; border-collapse: collapse; margin-top: 28pt; }
        .sign td { width: 50%; vertical-align: bottom; font-size: 8pt; }
        .sign .for { text-align: right; }
        .sign .sig-img { max-height: 44pt; max-width: 130pt; margin-bottom: 4pt; }
        .sign .line { border-top: 0.6pt solid #000; padding-top: 3pt; margin-top: 30pt; }

        .foot { margin-top: 18pt; border-top: 0.4pt solid #000; padding-top: 6pt; font-size: 6.5pt; color: #666; text-align: center; }
    </style>
</head>
<body>

    {{-- Header --}}
    <table class="hdr">
        <tr>
            <td class="logo">
                @if ($logoBase64)
                    <img src="{{ $logoBase64 }}" alt="">
                @else
                    <div class="co-name">{{ $company->company_name }}</div>
                @endif
            </td>
            <td>
                @if ($logoBase64)
                    <div class="co-name">{{ $company->company_name }}</div>
                @endif
                <div class="co-meta">
                    @if ($company->address_line_1){{ $company->address_line_1 }}@endif
                    @if ($company->address_line_2), {{ $company->address_line_2 }}@endif
                    @if ($company->city)<br>{{ $company->city }}@endif
                    @if ($company->state), {{ $company->state }}@endif
                    @if ($company->pincode) — {{ $company->pincode }}@endif
                    @if ($company->gstin)<br>GSTIN: <span class="mono">{{ $company->gstin }}</span>@endif
                    @if ($company->phone)<br>{{ $company->phone }}@endif
                    @if ($company->email) · {{ $company->email }}@endif
                </div>
            </td>
            <td class="doc">
                <div class="title">QUOTATION</div>
                <div class="code mono">{{ $quotation->quotation_code }}</div>
            </td>
        </tr>
    </table>

    {{-- Meta: buyer + dates --}}
    <table class="meta">
        <tr>
            <td>
                <div class="k">Quotation for</div>
                <div class="name">{{ $quotation->customer_company ?: $quotation->customer_name }}</div>
                @if ($quotation->customer_company && $quotation->customer_name)
                    <div class="v">{{ $quotation->customer_name }}</div>
                @endif
                @if ($quotation->customer_address)
                    <div class="v">{{ $quotation->customer_address }}</div>
                @endif
                @if ($quotation->customer_gstin)
                    <div class="v">GSTIN: <span class="mono">{{ $quotation->customer_gstin }}</span></div>
                @endif
                @if ($quotation->customer_phone)
                    <div class="v mono">{{ $quotation->customer_phone }}</div>
                @endif
            </td>
            <td>
                <table style="width:100%; border-collapse:collapse;">
                    <tr>
                        <td style="border:0; padding:0 0 6pt 0;">
                            <div class="k">Date</div>
                            <div class="v mono">{{ $quotation->quotation_date?->format('d M Y') }}</div>
                        </td>
                    </tr>
                    @if ($quotation->valid_until)
                    <tr>
                        <td style="border:0; padding:0 0 6pt 0;">
                            <div class="k">Valid until</div>
                            <div class="v mono">{{ $quotation->valid_until->format('d M Y') }}</div>
                        </td>
                    </tr>
                    @endif
                    <tr>
                        <td style="border:0; padding:0;">
                            <div class="k">Status</div>
                            <div class="v">{{ ucfirst($quotation->status) }}</div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    {{-- Items --}}
    <table class="items">
        <thead>
            <tr>
                <th class="idx">#</th>
                <th>Description</th>
                <th class="r">Qty</th>
                <th class="r">Rate</th>
                <th class="r">Disc%</th>
                <th class="r">Tax%</th>
                <th class="r">Amount</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($quotation->items as $i => $it)
                <tr>
                    <td class="idx">{{ $i + 1 }}</td>
                    <td>
                        <div class="desc">{{ $it->product_name }}</div>
                        @if ($it->hsn_code)<div class="hsn">HSN {{ $it->hsn_code }}</div>@endif
                    </td>
                    <td class="r">{{ rtrim(rtrim(number_format((float) $it->qty, 3), '0'), '.') }} {{ $it->unit }}</td>
                    <td class="r">{{ number_format((float) $it->unit_price, 2) }}</td>
                    <td class="r">{{ (float) $it->discount_pct > 0 ? number_format((float) $it->discount_pct, 2) : '—' }}</td>
                    <td class="r">{{ (float) $it->tax_rate > 0 ? number_format((float) $it->tax_rate, 2) : '—' }}</td>
                    <td class="r">{{ number_format((float) $it->line_total, 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    {{-- Totals --}}
    <table class="totals">
        <tr>
            <td class="spacer"></td>
            <td class="tt">
                <table>
                    <tr>
                        <td class="k">Subtotal</td>
                        <td class="v">{{ number_format((float) $quotation->subtotal, 2) }}</td>
                    </tr>
                    <tr>
                        <td class="k">Tax</td>
                        <td class="v">{{ number_format((float) $quotation->tax_total, 2) }}</td>
                    </tr>
                    @if ((float) $quotation->discount_amount > 0)
                    <tr>
                        <td class="k">Discount</td>
                        <td class="v">− {{ number_format((float) $quotation->discount_amount, 2) }}</td>
                    </tr>
                    @endif
                    <tr class="grand">
                        <td class="k">Total (₹)</td>
                        <td class="v">{{ number_format((float) $quotation->total, 2) }}</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <div class="words">
        <span class="label">In words:</span> {{ $amountInWords }}
    </div>

    @if ($quotation->notes)
        <div class="blk">
            <div class="label">Notes</div>
            <div class="body">{{ $quotation->notes }}</div>
        </div>
    @endif

    @if ($quotation->terms)
        <div class="blk">
            <div class="label">Terms &amp; conditions</div>
            <div class="body">{{ $quotation->terms }}</div>
        </div>
    @endif

    {{-- Brand strip --}}
    @if (! empty($brands))
        <div class="brands">
            <div class="label">Authorised dealer for</div>
            @foreach ($brands as $b)
                <img src="{{ $b['data_uri'] }}" alt="{{ $b['name'] }}">
            @endforeach
        </div>
    @endif

    {{-- Sign-off --}}
    <table class="sign">
        <tr>
            <td>
                <div class="line">Customer acceptance</div>
            </td>
            <td class="for">
                <div>For {{ $company->company_name }}</div>
                @if ($signatureBase64)
                    <div style="margin-top:6pt;"><img class="sig-img" src="{{ $signatureBase64 }}" alt=""></div>
                @endif
                <div class="line" style="display:inline-block; min-width:130pt;">
                    {{ $company->signatory_name ?: 'Authorised signatory' }}
                    @if ($company->signatory_designation)<br><span class="muted">{{ $company->signatory_designation }}</span>@endif
                </div>
            </td>
        </tr>
    </table>

    <div class="foot">
        @if ($company->invoice_footer_note){{ $company->invoice_footer_note }} · @endif
        This is a quotation, not a tax invoice. Prices valid till the date shown above.
    </div>

</body>
</html>
