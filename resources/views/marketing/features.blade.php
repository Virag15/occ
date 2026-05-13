@extends('marketing.layout')

@section('title', 'Features')
@section('description', 'Order management, dispatch, payments, Tally bridge, WhatsApp, analytics, security — every feature in OCC.')

@section('content')
    <section class="py-24 border-b border-zinc-100">
        <div class="mx-auto max-w-3xl px-6 lg:px-8">
            <p class="text-[13px] uppercase tracking-wider text-zinc-400 mb-4">Features</p>
            <h1 class="text-5xl sm:text-6xl font-semibold text-zinc-900 tracking-tight leading-[1.05]">
                Everything your team<br>
                <span class="text-zinc-400">does daily.</span>
            </h1>
            <p class="mt-8 text-lg text-zinc-600 leading-relaxed max-w-2xl">
                Built around the actual workflows of an Indian B2B distributor —
                order intake, dispatch, collections, customer follow-up.
                Not a generic ERP retrofit.
            </p>
        </div>
    </section>

    {{-- Feature sections — editorial layout, numbered --}}
    @foreach ([
        ['Order management', 'From quote to closed, on one screen.', [
            'Create orders with brand multi-select, line items, GST auto-compute',
            'Kanban across statuses: new → confirmed → packed → ready → dispatched → delivered → closed',
            'Quick edit priority, payment status, transporter without leaving the list',
            'Bulk update hundreds of orders at once',
            'Auto-generated codes (ORD-YYYY-NNNN)',
            'Public tracking URL per order — share with the customer, no login required',
        ]],
        ['Dispatch & delivery', 'Warehouse-friendly with a clean evidence trail.', [
            'Pick / pack queue scoped to ready-for-dispatch orders',
            'Picking slip and packing slip PDFs on demand',
            'Shipment calendar grouped by transporter',
            'Upload POD, triplicate, LR photos from your phone',
            'OCR auto-fills LR number, dispatch date, delivered date from the photo',
            'Per-transporter SLA averages for vendor reviews',
        ]],
        ['Payments & collections', 'Get paid faster without nagging.', [
            'Record payments — UPI, cash, NEFT, cheque — in one click',
            'Auto-tallied amount_received, derived payment_status',
            'Aging buckets: 1–30, 31–60, 61–90, 90+ days',
            'Scheduled WhatsApp reminders, pre-approved templates',
            'Drill into who owes what, since when',
            'Invoice + quotation PDFs with your logo, signature, terms',
        ]],
        ['Tally bridge', 'Your CA keeps Tally. You get the cockpit.', [
            'One-click Windows installer for the bridge agent',
            'Auto-pushes sales vouchers + receipts to TallyPrime',
            'Pulls customer + product masters from Tally as source of truth',
            'Two modes: same-PC or cloud + remote agent',
            'Per-tenant secret tokens — your bridge can\'t see another company\'s data',
            'Stamped voucher IDs round-trip; reconciliation is automatic',
        ]],
        ['Customers & analytics', 'Numbers your CA can audit, charts your owner reads.', [
            'Per-customer page — orders, payments, aging, brand frequency, monthly trend',
            'Reports: KPIs, brand mix, dispatch SLA, top customers, action items',
            'Daily / weekly / monthly ranges, one click',
            'Customer-level WhatsApp + email contact info in one place',
            'Returns workflow with full audit trail',
            'Immutable audit log per Companies Act 2013',
        ]],
        ['Security & access', 'Five roles, defence in depth.', [
            'Owner, Manager, Accounts, Warehouse, Viewer — each with their own scope',
            'Two-factor authentication (TOTP / Google Authenticator)',
            'Per-workspace data isolation, enforced at every query',
            'TLS 1.3, encrypted sessions, HSTS, strict CSP',
            'Daily encrypted backups, tested restore procedure',
            'Rate-limited APIs, bridge tokens hashed at rest',
        ]],
    ] as $i => $block)
        <section class="py-20 {{ ! $loop->last ? 'border-b border-zinc-100' : '' }}">
            <div class="mx-auto max-w-6xl px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-8">
                <div class="lg:col-span-5">
                    <div class="text-[13px] uppercase tracking-wider text-zinc-400 mb-3 font-mono">
                        {{ str_pad((string) ($i + 1), 2, '0', STR_PAD_LEFT) }}
                    </div>
                    <h2 class="text-3xl font-semibold text-zinc-900 tracking-tight mb-3 leading-tight">{{ $block[0] }}</h2>
                    <p class="text-zinc-600 leading-relaxed">{{ $block[1] }}</p>
                </div>
                <ul class="lg:col-span-7 space-y-3.5">
                    @foreach ($block[2] as $item)
                        <li class="flex gap-3 text-zinc-700 leading-relaxed">
                            <svg class="flex-shrink-0 mt-1.5 text-zinc-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M20 6L9 17l-5-5"/>
                            </svg>
                            <span>{{ $item }}</span>
                        </li>
                    @endforeach
                </ul>
            </div>
        </section>
    @endforeach

    <section class="py-32 border-t border-zinc-100">
        <div class="mx-auto max-w-3xl px-6 lg:px-8 text-center">
            <h2 class="text-4xl sm:text-5xl font-semibold text-zinc-900 tracking-tight leading-tight">
                Want to see this on your own data?
            </h2>
            <p class="mt-6 text-lg text-zinc-600">
                We'll import a sample and walk through it. 30 minutes, no commitment.
            </p>
            <div class="mt-10">
                <a href="{{ url('/contact') }}"
                   class="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-zinc-900 text-white text-[14px] font-medium hover:bg-zinc-700">
                    Book a demo
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </a>
            </div>
        </div>
    </section>
@endsection
