@php
    $q = $invoice;
    $c = $company;
    $fmt = fn ($n) => '₹ '.number_format((float) $n, 2);
@endphp
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Helvetica,Arial,sans-serif;color:#1c1c1c;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
        <tr><td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">

                {{-- Header --}}
                <tr><td style="padding:22px 28px;border-bottom:2px solid #1c1c1c;">
                    <div style="font-size:19px;font-weight:bold;letter-spacing:-0.3px;">{{ $c->company_name }}</div>
                    <div style="font-size:12px;color:#6b7280;margin-top:3px;">
                        @if ($c->gstin)GSTIN {{ $c->gstin }}@endif
                        @if ($c->phone) &nbsp;·&nbsp; {{ $c->phone }}@endif
                    </div>
                </td></tr>

                {{-- Body --}}
                <tr><td style="padding:28px;">
                    <p style="margin:0 0 14px;font-size:15px;">
                        Dear {{ $q->customer_company ?: $q->customer_name }},
                    </p>
                    <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#374151;">
                        Please find attached our tax invoice
                        <strong>{{ $q->invoice_code }}</strong>. A summary is below; the full
                        breakdown with HSN/tax detail is in the attached PDF.
                    </p>

                    @if ($note)
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                               style="margin:0 0 18px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;">
                            <tr><td style="padding:14px 16px;font-size:13px;line-height:1.6;color:#374151;white-space:pre-line;">{{ $note }}</td></tr>
                        </table>
                    @endif

                    {{-- Summary --}}
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                           style="border:1px solid #e5e7eb;border-radius:6px;border-collapse:separate;overflow:hidden;font-size:13px;">
                        <tr>
                            <td style="padding:10px 16px;color:#6b7280;border-bottom:1px solid #f1f1f1;">Invoice No.</td>
                            <td style="padding:10px 16px;text-align:right;font-weight:bold;border-bottom:1px solid #f1f1f1;">{{ $q->invoice_code }}</td>
                        </tr>
                        <tr>
                            <td style="padding:10px 16px;color:#6b7280;border-bottom:1px solid #f1f1f1;">Date</td>
                            <td style="padding:10px 16px;text-align:right;border-bottom:1px solid #f1f1f1;">{{ $q->invoice_date?->format('d M Y') }}</td>
                        </tr>
                        @if ($q->due_date)
                            <tr>
                                <td style="padding:10px 16px;color:#6b7280;border-bottom:1px solid #f1f1f1;">Due date</td>
                                <td style="padding:10px 16px;text-align:right;border-bottom:1px solid #f1f1f1;">{{ $q->due_date->format('d M Y') }}</td>
                            </tr>
                        @endif
                        <tr>
                            <td style="padding:12px 16px;font-size:15px;font-weight:bold;background:#fafafa;">Total</td>
                            <td style="padding:12px 16px;text-align:right;font-size:16px;font-weight:bold;background:#fafafa;">{{ $fmt($q->total) }}</td>
                        </tr>
                    </table>

                    <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">
                        Kindly arrange payment as per the agreed terms.
                        Reply to this email if you have any questions.
                    </p>
                </td></tr>

                {{-- Brand strip --}}
                @if (! empty($brands))
                    <tr><td style="padding:16px 28px;border-top:1px solid #e5e7eb;">
                        <div style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#9ca3af;margin-bottom:10px;">Authorised dealer for</div>
                        @foreach ($brands as $b)
                            @php $bin = base64_decode(explode(',', $b['data_uri'])[1] ?? ''); @endphp
                            @if ($bin)
                                <img src="{{ $message->embedData($bin, \Illuminate\Support\Str::slug($b['name']).'.png') }}"
                                     alt="{{ $b['name'] }}" height="38"
                                     style="height:38px;width:auto;margin-right:9px;vertical-align:middle;">
                            @endif
                        @endforeach
                    </td></tr>
                @endif

                {{-- Footer --}}
                <tr><td style="padding:16px 28px;background:#1c1c1c;color:#d4d4d8;font-size:11px;line-height:1.6;">
                    <strong style="color:#ffffff;">{{ $c->company_name }}</strong><br>
                    @if ($c->address_line_1){{ $c->address_line_1 }}@endif
                    @if ($c->city), {{ $c->city }}@endif
                    @if ($c->email)<br>{{ $c->email }}@endif
                    @if ($c->phone) &nbsp;·&nbsp; {{ $c->phone }}@endif
                </td></tr>
            </table>
            <div style="font-size:11px;color:#9ca3af;margin-top:14px;">Computer-generated email · {{ $c->company_name }}</div>
        </td></tr>
    </table>
</body>
</html>
