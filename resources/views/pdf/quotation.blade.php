{{--
    Quotation PDF — professional, ruled, GST-document layout. Helvetica for
    text, Roboto Mono for every number. Bordered tables throughout, tight
    typography, restrained tracking. DomPDF-safe: table layout, pt units,
    border-collapse, core "Helvetica" font, bundled Roboto Mono via @font-face.
--}}
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{{ $doc['title'] ?? 'Quotation' }} {{ $doc['code'] ?? $quotation->quotation_code }}</title>
    <style>
        @font-face { font-family: 'Roboto Mono'; font-weight: 400; font-style: normal; src: url("{{ resource_path('fonts/RobotoMono-Regular.ttf') }}") format('truetype'); }
        @font-face { font-family: 'Roboto Mono'; font-weight: 500; font-style: normal; src: url("{{ resource_path('fonts/RobotoMono-Medium.ttf') }}") format('truetype'); }
        @font-face { font-family: 'Roboto Mono'; font-weight: 700; font-style: normal; src: url("{{ resource_path('fonts/RobotoMono-Bold.ttf') }}") format('truetype'); }

        @page { size: A4 portrait; margin: 6mm; }
        * { box-sizing: border-box; }
        body {
            font-family: Helvetica, Arial, sans-serif;
            font-size: 8.5pt; color: #1c1c1c; line-height: 1.4;
            letter-spacing: -0.01em; margin: 0;
        }
        table { border-collapse: collapse; width: 100%; }
        h1, h2, h3, p { margin: 0; padding: 0; }

        .mono  { font-family: 'Roboto Mono', 'DejaVu Sans Mono', monospace; letter-spacing: 0; }
        .r     { text-align: right; }
        .c     { text-align: center; }
        .muted { color: #707070; }
        .lbl   { font-size: 6pt; letter-spacing: 0.4pt; text-transform: uppercase; color: #8a8a8a; }
        .strong{ font-weight: bold; }

        /* Outer frame — the whole document reads as one form */
        /* Side + bottom borders on the table itself (DomPDF draws the
           table's bottom border on its final page correctly). The TOP
           border comes from a repeating <thead> hairline so the box stays
           closed at the top of every page — DomPDF won't repeat a table's
           own top border onto continuation pages. */
        .frame { border-left: 0.75pt solid #222; border-right: 0.75pt solid #222; border-bottom: 0.75pt solid #222; }
        .frame > tbody > tr > td { padding: 0; vertical-align: top; }
        .frame > thead > tr > td { padding: 0; height: 0; line-height: 0; font-size: 0; border-top: 0.75pt solid #222; }

        /* Masthead */
        .mast td { padding: 9pt 12pt; vertical-align: middle; border-bottom: 0.75pt solid #222; }
        .mast .logo { width: 58pt; padding-right: 0; text-align: center; }
        .mast .logo img { max-width: 52pt; max-height: 34pt; vertical-align: middle; }
        .mast .co { font-size: 13.5pt; font-weight: bold; letter-spacing: -0.02em; }
        .mast .co-meta { font-size: 7pt; color: #6f6f6f; margin-top: 3pt; line-height: 1.45; }
        .mast .co-meta .sep { color: #c2c2c2; }
        .mast .title-cell { width: 168pt; border-left: 0.75pt solid #222; text-align: right; }
        .mast .title { font-size: 16pt; font-weight: bold; letter-spacing: 1pt; }
        .mast .title-sub { font-size: 6.5pt; letter-spacing: 0.6pt; text-transform: uppercase; color: #9a9a9a; margin-top: 2pt; }

        /* Masthead — banner variant (logo + identity centred on top) */
        .mastb td { text-align: center; padding: 0 12pt; }
        .mastb .logo { padding-top: 12pt; padding-bottom: 6pt; }
        .mastb .logo img { max-height: 56pt; max-width: 180pt; }
        .mastb .co { font-size: 17pt; font-weight: bold; letter-spacing: -0.02em; padding-top: 4pt; }
        .mastb .co-meta { font-size: 7pt; color: #6f6f6f; padding: 4pt 12pt 12pt; line-height: 1.5; }
        .mastb .co-meta .sep { color: #c2c2c2; }
        .titlebar td {
            border-top: 0.75pt solid #222; border-bottom: 0.75pt solid #222;
            background: #f2f2f2; padding: 6pt 12pt; vertical-align: middle;
        }
        .titlebar .t { font-size: 13pt; font-weight: bold; letter-spacing: 3pt; text-align: left; }
        .titlebar .s {
            font-size: 6.5pt; letter-spacing: 0.6pt; text-transform: uppercase;
            color: #8a8a8a; text-align: right;
        }

        /* Quotation no / date strip */
        .strip td { padding: 5pt 12pt; border-bottom: 0.75pt solid #222; font-size: 7.5pt; }
        .strip .k { color: #8a8a8a; font-size: 6pt; letter-spacing: 0.4pt; text-transform: uppercase; }
        .strip .v { font-weight: bold; margin-top: 1pt; }
        .strip td + td { border-left: 0.5pt solid #d8d8d8; }

        /* Metadata grid (buyer ref, dispatch, payment, delivery …) */
        .meta2 td {
            width: 50%; padding: 5pt 12pt; font-size: 7.5pt; vertical-align: top;
            border-bottom: 0.5pt solid #e2e2e2;
        }
        .meta2 td + td { border-left: 0.5pt solid #e2e2e2; }
        .meta2 tr:last-child td { border-bottom: 0.75pt solid #222; }
        .meta2 .mk { color: #8a8a8a; font-size: 6pt; letter-spacing: 0.4pt; text-transform: uppercase; }
        .meta2 .mv { display: block; margin-top: 1pt; }

        /* Parties — customer & supplier rendered identically */
        .parties td { padding: 9pt 12pt; vertical-align: top; border-bottom: 0.75pt solid #222; width: 50%; }
        .parties td + td { border-left: 0.75pt solid #222; }
        .parties .who { font-size: 10.5pt; font-weight: bold; margin-top: 4pt; letter-spacing: -0.01em; }
        .parties .ln  { font-size: 8pt; color: #555; margin-top: 1.5pt; }
        .parties .ln .mono.strong { color: #1c1c1c; }

        /* HSN/GST summary */
        table.hsnsum { margin: 0; }
        table.hsnsum thead th {
            font-size: 6.5pt; letter-spacing: 0.3pt; text-transform: uppercase; color: #5f5f5f;
            background: #f2f2f2; text-align: right; padding: 5pt 8pt; border-bottom: 0.75pt solid #222;
        }
        table.hsnsum thead th.l { text-align: left; }
        table.hsnsum thead th + th { border-left: 0.5pt solid #d0d0d0; }
        table.hsnsum tbody td {
            padding: 5pt 8pt; font-size: 8pt; text-align: right;
            font-family: 'Roboto Mono', 'DejaVu Sans Mono', monospace; letter-spacing: 0;
            border-bottom: 0.5pt solid #e2e2e2;
        }
        table.hsnsum tbody td.l { text-align: left; }
        table.hsnsum tbody td + td { border-left: 0.5pt solid #ededed; }
        table.hsnsum tbody tr:last-child td { border-bottom: 0.75pt solid #222; }
        table.hsnsum tfoot td {
            padding: 5pt 8pt; font-size: 8pt; font-weight: bold; text-align: right;
            font-family: 'Roboto Mono', 'DejaVu Sans Mono', monospace; letter-spacing: 0;
            border-bottom: 0.75pt solid #222; background: #fafafa;
        }
        table.hsnsum tfoot td.l { text-align: left; font-family: Helvetica, Arial, sans-serif; }
        table.hsnsum tfoot td + td { border-left: 0.5pt solid #ededed; }
        .hsncap { padding: 7pt 12pt 0; }

        /* Items */
        table.items thead th {
            font-size: 6.5pt; letter-spacing: 0.3pt; text-transform: uppercase; color: #5f5f5f;
            background: #f2f2f2; text-align: left; padding: 6pt 8pt;
            border-bottom: 0.75pt solid #222;
        }
        table.items thead th + th { border-left: 0.5pt solid #d0d0d0; }
        table.items thead th.r { text-align: right; }
        table.items thead th.c { text-align: center; }
        table.items tbody td {
            padding: 6.5pt 8pt; border-bottom: 0.5pt solid #e2e2e2;
            vertical-align: top; font-size: 8.5pt;
        }
        table.items tbody td + td { border-left: 0.5pt solid #ededed; }
        table.items tbody td.r { text-align: right; font-family: 'Roboto Mono', 'DejaVu Sans Mono', monospace; letter-spacing: 0; white-space: nowrap; }
        table.items tbody td.c { text-align: center; }
        table.items .idx  { width: 20pt; color: #9a9a9a; font-family: 'Roboto Mono', 'DejaVu Sans Mono', monospace; font-size: 7.5pt; text-align: center; }
        table.items .desc { font-weight: bold; }
        table.items .hsn  { width: 38pt; font-family: 'Roboto Mono', 'DejaVu Sans Mono', monospace; font-size: 7.5pt; color: #666; }
        table.items .colq { width: 46pt; }
        table.items .colm { width: 58pt; }
        table.items .cold { width: 38pt; }
        table.items tbody tr:last-child td { border-bottom: 0.75pt solid #222; }

        /* Totals + words */
        .sum td { vertical-align: top; }
        .sum .words {
            padding: 9pt 12pt; font-size: 8pt; border-right: 0.75pt solid #222;
            border-bottom: 0.75pt solid #222;
        }
        .sum .words .v { font-weight: bold; font-style: italic; color: #2a2a2a; }
        .sum .tot { width: 230pt; border-bottom: 0.75pt solid #222; }
        .sum .tot table td { padding: 4.5pt 12pt; font-size: 8.5pt; }
        .sum .tot table td.k { color: #6f6f6f; }
        .sum .tot table td.v { text-align: right; font-family: 'Roboto Mono', 'DejaVu Sans Mono', monospace; letter-spacing: 0; }
        .sum .tot table tr + tr td { border-top: 0.5pt solid #ececec; }
        .sum .tot table tr.grand td {
            border-top: 0.75pt solid #222; background: #f2f2f2;
            font-size: 11pt; font-weight: bold; padding-top: 6pt; padding-bottom: 6pt;
        }
        .sum .tot table tr.grand td.v { font-size: 12pt; }

        /* Bank details — stacked, one line per field */
        .bank > tbody > tr > td { padding: 9pt 12pt; border-bottom: 0.75pt solid #222; }
        .bank .brow td { padding: 4pt 0; font-size: 8pt; line-height: 1; vertical-align: middle; }
        .bank .brow td.bk {
            width: 78pt; color: #8a8a8a; font-size: 6pt; letter-spacing: 0.4pt;
            text-transform: uppercase; vertical-align: middle;
        }
        .bank td.qr { width: 96pt; text-align: center; vertical-align: middle; border-left: 0.5pt solid #d8d8d8; }
        .bank td.qr img { width: 78pt; height: 78pt; }
        .bank td.qr .qrcap { font-size: 6pt; color: #8a8a8a; letter-spacing: 0.3pt; text-transform: uppercase; margin-top: 3pt; }

        /* Declaration */
        .decl > tbody > tr > td { padding: 9pt 12pt; border-bottom: 0.75pt solid #222; }
        .decl .body { font-size: 7.5pt; color: #444; line-height: 1.5; margin-top: 3pt; white-space: pre-line; }

        /* Terms / notes */
        .terms td { padding: 9pt 12pt; vertical-align: top; border-bottom: 0.75pt solid #222; width: 50%; }
        .terms td + td { border-left: 0.75pt solid #222; }
        .terms .body { font-size: 7.5pt; color: #444; white-space: pre-line; line-height: 1.5; margin-top: 3pt; }

        /* Brand strip — label + logos on one row, all equally spaced.
           The label cell shrinks to its text and uses the same right gap
           as the gap between logos, so nothing looks lopsided. */
        .brands td { padding: 10pt 12pt; border-bottom: 0.75pt solid #222; vertical-align: middle; }
        .brands .blbl { width: 1%; white-space: nowrap; padding-right: 18pt; }
        .brands .logos { white-space: nowrap; }
        .brands .bcell { display: inline-block; text-align: center; margin-right: 18pt; vertical-align: middle; }
        .brands .bcell img { height: 38pt; width: auto; max-width: 110pt; display: block; margin: 0 auto; }

        /* Sign-off — supplier signatory only */
        .sign td { padding: 12pt; vertical-align: bottom; font-size: 7.5pt; height: 84pt; text-align: right; }
        .sign img { max-height: 40pt; max-width: 130pt; margin: 4pt 0; }
        .sign .cap { border-top: 0.5pt solid #222; padding-top: 3pt; margin-top: 34pt; display: inline-block; min-width: 170pt; }

        .foot {
            margin-top: 7pt; font-size: 6.5pt; color: #9a9a9a; text-align: center;
            letter-spacing: 0.2pt;
        }
    </style>
</head>
<body>

@php
    // $doc parameterises the shared template so invoices reuse it. Falls
    // back to quotation values so the quotation render is unchanged.
    $doc = ($doc ?? []) + [
        'title'      => 'QUOTATION',
        'subtitle'   => 'Not a tax invoice',
        'codeLabel'  => 'Quotation No.',
        'code'       => $quotation->quotation_code,
        'date'       => $quotation->quotation_date,
        'date2Label' => 'Valid Until',
        'date2'      => $quotation->valid_until,
        'footer'     => 'This is a quotation, not a tax invoice &nbsp;·&nbsp; Prices valid till the date shown above &nbsp;·&nbsp; Computer-generated, no signature required',
    ];

    $addrLine = trim(implode(', ', array_filter([
        $company->address_line_1,
        $company->address_line_2,
        trim(implode(', ', array_filter([$company->city, $company->state])).' '.$company->pincode),
    ])));
    $contact = trim(implode(' · ', array_filter([$company->phone, $company->email])));
    $sellerStateLine = trim(implode('', array_filter([
        $company->state,
        $company->state_code ? ' · Code '.$company->state_code : '',
    ])));
    $buyerStateLine = trim(implode('', array_filter([
        $quotation->customer_state,
        $quotation->customer_state_code ? ' · Code '.$quotation->customer_state_code : '',
    ])));
    $subtotal = (float) $quotation->subtotal;
    $disc     = (float) $quotation->discount_amount;
    $taxTotal = (float) $quotation->tax_total;
    $money = fn ($n) => '₹ '.number_format((float) $n, 2);
    $totalQty = 0.0;
    foreach ($quotation->items as $it) {
        $totalQty += (float) $it->qty;
    }
    $totalQtyStr = rtrim(rtrim(number_format($totalQty, 3), '0'), '.');

    // Place of supply: intra-state ⇒ CGST + SGST, inter-state ⇒ IGST.
    // Defaults to intra-state when the buyer's state code isn't known.
    $sellerCode = trim((string) ($company->state_code ?? ''));
    $buyerCode  = trim((string) ($quotation->customer_state_code ?? ''));
    $interState = $sellerCode !== '' && $buyerCode !== '' && $sellerCode !== $buyerCode;

    // HSN/SAC-wise tax summary (Tally / GST standard)
    $hsnRows = [];
    foreach ($quotation->items as $it) {
        $rate    = (float) $it->tax_rate;
        $code    = $it->hsn_code ?: '—';
        $base    = (float) $it->qty * (float) $it->unit_price;
        $taxable = $base * (1 - ((float) $it->discount_pct / 100));
        $tax     = $taxable * $rate / 100;
        $key     = $code.'@'.$rate;
        if (! isset($hsnRows[$key])) {
            $hsnRows[$key] = ['hsn' => $code, 'rate' => $rate, 'taxable' => 0.0, 'tax' => 0.0];
        }
        $hsnRows[$key]['taxable'] += $taxable;
        $hsnRows[$key]['tax']     += $tax;
    }
    $hsnTaxable = array_sum(array_column($hsnRows, 'taxable'));
    $hsnTax     = array_sum(array_column($hsnRows, 'tax'));
@endphp

<table class="frame">
    <thead><tr><td></td></tr></thead>
    {{-- Masthead --}}
    @if (($layout ?? 'classic') === 'banner')
        <tr><td>
            <table class="mastb">
                @if ($logoBase64)
                    <tr><td class="logo"><img src="{{ $logoBase64 }}" alt=""></td></tr>
                @endif
                <tr><td class="co">{{ $company->company_name }}</td></tr>
                <tr><td class="co-meta">
                    @if ($addrLine){{ $addrLine }}<span class="sep"> · </span>@endif
                    GSTIN <span class="mono strong">{{ $company->gstin ?: '—' }}</span>
                    @if ($contact)<span class="sep"> · </span>{{ $contact }}@endif
                </td></tr>
            </table>
            <table class="titlebar">
                <tr>
                    <td class="t">{{ $doc['title'] }}</td>
                    <td class="s">{{ $doc['subtitle'] }}</td>
                </tr>
            </table>
        </td></tr>
    @else
        <tr><td>
            <table class="mast">
                <tr>
                    @if ($logoBase64)
                        <td class="logo"><img src="{{ $logoBase64 }}" alt=""></td>
                    @endif
                    <td>
                        <div class="co">{{ $company->company_name }}</div>
                        <div class="co-meta">
                            @if ($addrLine){{ $addrLine }}<br>@endif
                            GSTIN <span class="mono strong">{{ $company->gstin ?: '—' }}</span>
                            @if ($contact)<span class="sep"> · </span>{{ $contact }}@endif
                        </div>
                    </td>
                    <td class="title-cell">
                        <div class="title">{{ $doc['title'] }}</div>
                        <div class="title-sub">{{ $doc['subtitle'] }}</div>
                    </td>
                </tr>
            </table>
        </td></tr>
    @endif

    {{-- Reference strip --}}
    <tr><td>
        <table class="strip">
            <tr>
                <td>
                    <div class="k">{{ $doc['codeLabel'] }}</div>
                    <div class="v mono">{{ $doc['code'] }}</div>
                </td>
                <td>
                    <div class="k">Date</div>
                    <div class="v mono">{{ $doc['date']?->format('d M Y') }}</div>
                </td>
                <td>
                    <div class="k">{{ $doc['date2Label'] }}</div>
                    <div class="v mono">{{ $doc['date2'] ? $doc['date2']->format('d M Y') : '—' }}</div>
                </td>
                <td>
                    <div class="k">Status</div>
                    <div class="v">{{ ucfirst($quotation->status) }}</div>
                </td>
            </tr>
        </table>
    </td></tr>

    {{-- Reference / dispatch metadata --}}
    @php
        $metaPairs = array_filter([
            "Buyer's Ref. / Order No." => $quotation->buyer_ref,
            'Other References'         => $quotation->other_references,
            'Dispatched Through'       => $quotation->dispatched_through,
            'Destination'              => $quotation->destination,
            'Mode / Terms of Payment'  => $quotation->payment_terms,
            'Terms of Delivery'        => $quotation->delivery_terms,
        ], fn ($v) => filled($v));
    @endphp
    @if (! empty($metaPairs))
        <tr><td>
            <table class="meta2">
                @foreach (array_chunk($metaPairs, 2, true) as $pair)
                    <tr>
                        @foreach ($pair as $k => $v)
                            <td><span class="mk">{{ $k }}</span><span class="mv">{{ $v }}</span></td>
                        @endforeach
                        @if (count($pair) === 1)<td></td>@endif
                    </tr>
                @endforeach
            </table>
        </td></tr>
    @endif

    {{-- Parties --}}
    <tr><td>
        <table class="parties">
            <tr>
                <td>
                    <div class="lbl">Quotation for</div>
                    <div class="who">{{ $quotation->customer_company ?: $quotation->customer_name }}</div>
                    @if ($quotation->customer_company && $quotation->customer_name)
                        <div class="ln">{{ $quotation->customer_name }}</div>
                    @endif
                    @if ($quotation->customer_address)<div class="ln">{{ $quotation->customer_address }}</div>@endif
                    <div class="ln">GSTIN <span class="mono strong">{{ $quotation->customer_gstin ?: '—' }}</span></div>
                    @if ($buyerStateLine)<div class="ln">State {{ $buyerStateLine }}</div>@endif
                    @if ($quotation->customer_phone)<div class="ln">{{ $quotation->customer_phone }}</div>@endif
                    @if ($quotation->customer_email)<div class="ln">{{ $quotation->customer_email }}</div>@endif
                </td>
                <td>
                    <div class="lbl">Supplier</div>
                    <div class="who">{{ $company->company_name }}</div>
                    @if ($addrLine)<div class="ln">{{ $addrLine }}</div>@endif
                    <div class="ln">GSTIN <span class="mono strong">{{ $company->gstin ?: '—' }}</span></div>
                    @if ($sellerStateLine)<div class="ln">State {{ $sellerStateLine }}</div>@endif
                    @if ($contact)<div class="ln">{{ $contact }}</div>@endif
                </td>
            </tr>
        </table>
    </td></tr>

    {{-- Items --}}
    <tr><td>
        <table class="items">
            <thead>
                <tr>
                    <th class="idx">#</th>
                    <th>Description</th>
                    <th class="hsn">HSN/SAC</th>
                    <th class="r colq">Qty</th>
                    <th class="r colm">Rate</th>
                    @unless ($quotation->hide_discount)<th class="r cold">Disc</th>@endunless
                    <th class="r cold">GST</th>
                    <th class="r colm">Amount</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($quotation->items as $i => $it)
                    <tr>
                        <td class="idx">{{ str_pad((string) ($i + 1), 2, '0', STR_PAD_LEFT) }}</td>
                        <td><span class="desc">{{ $it->product_name }}</span></td>
                        <td class="hsn">{{ $it->hsn_code ?: '—' }}</td>
                        <td class="r">{{ rtrim(rtrim(number_format((float) $it->qty, 3), '0'), '.') }}{{ $it->unit ? ' '.$it->unit : '' }}</td>
                        <td class="r">{{ $money($it->unit_price) }}</td>
                        @unless ($quotation->hide_discount)<td class="r">{{ (float) $it->discount_pct > 0 ? number_format((float) $it->discount_pct, 2).'%' : '—' }}</td>@endunless
                        <td class="r">{{ (float) $it->tax_rate > 0 ? number_format((float) $it->tax_rate, 2).'%' : '—' }}</td>
                        <td class="r">{{ $money($it->line_total) }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </td></tr>

    {{-- Totals + amount in words --}}
    <tr><td>
        <table class="sum">
            <tr>
                <td class="words">
                    <div class="lbl">Amount chargeable (in words)</div>
                    <div class="v" style="margin-top:3pt;">{{ $amountInWords }}</div>
                </td>
                <td class="tot">
                    <table>
                        <tr><td class="k">Total quantity</td><td class="v">{{ $totalQtyStr }}</td></tr>
                        <tr><td class="k">Subtotal</td><td class="v">{{ $money($subtotal) }}</td></tr>
                        @if ($disc > 0 && ! $quotation->hide_discount)
                            <tr><td class="k">Discount</td><td class="v">− {{ $money($disc) }}</td></tr>
                        @endif
                        @if ($interState)
                            <tr><td class="k">IGST</td><td class="v">{{ $money($taxTotal) }}</td></tr>
                        @else
                            <tr><td class="k">CGST</td><td class="v">{{ $money($taxTotal / 2) }}</td></tr>
                            <tr><td class="k">SGST</td><td class="v">{{ $money($taxTotal / 2) }}</td></tr>
                        @endif
                        <tr class="grand">
                            <td class="k">Total <span class="muted" style="font-weight:normal;font-size:7.5pt;">INR</span></td>
                            <td class="v">{{ $money($quotation->total) }}</td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </td></tr>

    {{-- HSN / GST summary --}}
    @if (! empty($hsnRows))
        <tr><td>
            <div class="hsncap"><span class="lbl">HSN / SAC summary</span></div>
            <table class="hsnsum" style="margin-top:6pt;">
                <thead>
                    <tr>
                        <th class="l">HSN/SAC</th>
                        <th>Taxable value</th>
                        @if ($interState)
                            <th>IGST rate</th>
                            <th>IGST amount</th>
                        @else
                            <th>CGST</th>
                            <th>SGST</th>
                        @endif
                        <th>Total tax</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($hsnRows as $row)
                        <tr>
                            <td class="l">{{ $row['hsn'] }}</td>
                            <td>{{ $money($row['taxable']) }}</td>
                            @if ($interState)
                                <td>{{ $row['rate'] > 0 ? number_format($row['rate'], 2).'%' : '—' }}</td>
                                <td>{{ $money($row['tax']) }}</td>
                            @else
                                <td>{{ $money($row['tax'] / 2) }}</td>
                                <td>{{ $money($row['tax'] / 2) }}</td>
                            @endif
                            <td>{{ $money($row['tax']) }}</td>
                        </tr>
                    @endforeach
                </tbody>
                <tfoot>
                    <tr>
                        <td class="l">Total</td>
                        <td>{{ $money($hsnTaxable) }}</td>
                        @if ($interState)
                            <td></td>
                            <td>{{ $money($hsnTax) }}</td>
                        @else
                            <td>{{ $money($hsnTax / 2) }}</td>
                            <td>{{ $money($hsnTax / 2) }}</td>
                        @endif
                        <td>{{ $money($hsnTax) }}</td>
                    </tr>
                </tfoot>
            </table>
        </td></tr>
    @endif

    {{-- Bank details --}}
    @if ($company->bank_name || $company->bank_account_number || $company->bank_ifsc || $company->upi_id)
        <tr><td>
            <table class="bank">
                <tr>
                    <td>
                        <div class="lbl" style="margin-bottom:6pt;">Bank details for payment</div>
                        <table class="brow">
                            @if ($company->bank_account_holder)
                                <tr><td class="bk">A/c Holder</td><td>{{ $company->bank_account_holder }}</td></tr>
                            @endif
                            @if ($company->bank_name)
                                <tr><td class="bk">Bank</td><td>{{ $company->bank_name }}{{ $company->bank_branch ? ', '.$company->bank_branch : '' }}</td></tr>
                            @endif
                            @if ($company->bank_account_number)
                                <tr><td class="bk">A/C No.</td><td class="mono">{{ $company->bank_account_number }}</td></tr>
                            @endif
                            @if ($company->bank_ifsc)
                                <tr><td class="bk">IFSC</td><td class="mono">{{ $company->bank_ifsc }}</td></tr>
                            @endif
                            @if ($company->upi_id)
                                <tr><td class="bk">UPI</td><td class="mono">{{ $company->upi_id }}</td></tr>
                            @endif
                        </table>
                    </td>
                    @if ($upiQr)
                        <td class="qr">
                            <img src="{{ $upiQr }}" alt="UPI QR">
                            <div class="qrcap">Scan &amp; pay via UPI</div>
                        </td>
                    @endif
                </tr>
            </table>
        </td></tr>
    @endif

    {{-- Notes / terms --}}
    @if ($quotation->notes || $quotation->terms)
        <tr><td>
            <table class="terms">
                <tr>
                    <td>
                        <div class="lbl">Notes</div>
                        <div class="body">{{ $quotation->notes ?: '—' }}</div>
                    </td>
                    <td>
                        <div class="lbl">Terms &amp; conditions</div>
                        <div class="body">{{ $quotation->terms ?: '—' }}</div>
                    </td>
                </tr>
            </table>
        </td></tr>
    @endif

    {{-- Declaration --}}
    @if ($company->invoice_declaration)
        <tr><td>
            <table class="decl">
                <tr><td>
                    <span class="lbl">Declaration</span>
                    <div class="body">{{ $company->invoice_declaration }}</div>
                </td></tr>
            </table>
        </td></tr>
    @endif

    {{-- Authorised dealer strip --}}
    @if (! empty($brands))
        <tr><td>
            <table class="brands">
                <tr>
                    <td class="blbl"><span class="lbl">Authorised dealer for</span></td>
                    <td class="logos">
                        @foreach ($brands as $b)
                            <span class="bcell">
                                <img src="{{ $b['data_uri'] }}" alt="{{ $b['name'] }}">
                            </span>
                        @endforeach
                    </td>
                </tr>
            </table>
        </td></tr>
    @endif

    {{-- Sign-off --}}
    <tr><td>
        <table class="sign">
            <tr>
                <td>
                    <div class="muted">For {{ $company->company_name }}</div>
                    @if ($signatureBase64)<div><img src="{{ $signatureBase64 }}" alt=""></div>@endif
                    <span class="cap">
                        <span class="strong">{{ $company->signatory_name ?: 'Authorised signatory' }}</span>
                        @if ($company->signatory_designation)<br><span class="muted">{{ $company->signatory_designation }}</span>@endif
                    </span>
                </td>
            </tr>
        </table>
    </td></tr>
</table>

<div class="foot">
    @if ($company->invoice_footer_note){{ $company->invoice_footer_note }} &nbsp;·&nbsp; @endif
    {!! $doc['footer'] !!}
</div>

<script type="text/php">
    if (isset($pdf)) {
        $font = $fontMetrics->getFont("Helvetica");
        $size = 7;
        $text = "Page {PAGE_NUM} of {PAGE_COUNT}";
        $w = $pdf->get_width();
        $h = $pdf->get_height();
        $margin = 17;  // ≈ 6mm page margin
        $tw = $fontMetrics->getTextWidth("Page 00 of 00", $font, $size);
        $pdf->page_text(
            $w - $margin - $tw, $h - $margin, $text,
            $font, $size, array(0.55, 0.55, 0.55)
        );
    }
</script>

</body>
</html>
