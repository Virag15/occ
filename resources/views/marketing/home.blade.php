@extends('marketing.layout')

@section('title', 'Operations for Tally-first businesses')
@section('description', 'Orders, dispatch, payments, WhatsApp updates, analytics — for Indian MSMEs that run on Tally. OCC is your cockpit; Tally stays the books.')

@section('content')
    {{-- Hero — editorial, big type, single CTA --}}
    <section class="relative">
        <div class="mx-auto max-w-4xl px-6 lg:px-8 pt-24 pb-20">
            <div class="inline-flex items-center gap-2 px-2.5 py-1 mb-8 rounded-full border border-zinc-200 text-[12px] text-zinc-600">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Now onboarding Indian MSMEs</span>
            </div>
            <h1 class="text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tight text-zinc-900 leading-[1.05]">
                Operations for<br>
                <span class="text-zinc-400">businesses that run on</span><br>
                Tally.
            </h1>
            <p class="mt-8 max-w-2xl text-lg text-zinc-600 leading-relaxed">
                Orders, dispatch, payments, customer follow-up, real-time analytics.
                Your CA keeps using Tally for the books — OCC handles
                everything your team does every day.
            </p>
            <div class="mt-10 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <a href="{{ url('/contact') }}"
                   class="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-zinc-900 text-white text-[14px] font-medium hover:bg-zinc-700 transition-colors">
                    Talk to us
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </a>
                <a href="{{ url('/features') }}"
                   class="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-zinc-700 text-[14px] font-medium hover:text-zinc-900 transition-colors">
                    See what's inside
                </a>
            </div>
            <p class="mt-8 text-[13px] text-zinc-500">
                No card needed. 30-minute demo on your own data.
            </p>
        </div>
    </section>

    {{-- Trust strip — pulled-quote style --}}
    <section class="border-y border-zinc-100">
        <div class="mx-auto max-w-4xl px-6 lg:px-8 py-12">
            <p class="text-[13px] uppercase tracking-wider text-zinc-400 mb-4">Battle-tested</p>
            <p class="text-xl sm:text-2xl text-zinc-700 leading-relaxed font-medium tracking-tight">
                Built and used daily at GC Communication, Nashik —
                seven years of orders, thousands of dispatches,
                <span class="text-zinc-900">books your CA signs off on.</span>
            </p>
        </div>
    </section>

    {{-- Why OCC — line-icons, monochrome cards --}}
    <section class="py-24">
        <div class="mx-auto max-w-6xl px-6 lg:px-8">
            <div class="max-w-2xl mb-16">
                <p class="text-[13px] uppercase tracking-wider text-zinc-400 mb-3">Why OCC</p>
                <h2 class="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-900 leading-tight">
                    Tally is great for your CA.<br>
                    <span class="text-zinc-400">Terrible for your owner.</span>
                </h2>
                <p class="mt-4 text-zinc-600 leading-relaxed">
                    OCC is the missing UX layer. We don't replace Tally — we connect to it,
                    so your CA workflow stays untouched while you get the cockpit.
                </p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-px bg-zinc-100 border border-zinc-100 rounded-lg overflow-hidden">
                @foreach ([
                    [
                        'icon' => '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>',
                        'title' => 'One-click Tally bridge',
                        'body' => 'Download a Windows installer, double-click. TallyPrime stays your CA\'s source of truth; OCC becomes your daily cockpit. No XML, no exports.'
                    ],
                    [
                        'icon' => '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
                        'title' => 'WhatsApp, built in',
                        'body' => 'Order confirmed, dispatched, delivered, payment due — every event triggers a templated WhatsApp. No more "kab dispatch hoga" calls.'
                    ],
                    [
                        'icon' => '<path d="M3 3v18h18M7 14l4-4 4 4 5-5"/>',
                        'title' => 'Analytics owners actually open',
                        'body' => 'Aging buckets, brand mix, dispatch SLA per transporter, top customers, daily KPIs. Numbers your CA can audit, charts your owner reads.'
                    ],
                ] as $card)
                    <div class="bg-white p-8">
                        <div class="w-9 h-9 rounded-md border border-zinc-200 flex items-center justify-center mb-5 text-zinc-700">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">{!! $card['icon'] !!}</svg>
                        </div>
                        <h3 class="text-[15px] font-semibold text-zinc-900 mb-2">{{ $card['title'] }}</h3>
                        <p class="text-[14px] text-zinc-600 leading-relaxed">{{ $card['body'] }}</p>
                    </div>
                @endforeach
            </div>
        </div>
    </section>

    {{-- Three workflows — text-led, no color blocks --}}
    <section class="py-24 border-t border-zinc-100">
        <div class="mx-auto max-w-6xl px-6 lg:px-8">
            <div class="max-w-2xl mb-16">
                <p class="text-[13px] uppercase tracking-wider text-zinc-400 mb-3">For your team</p>
                <h2 class="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-900 leading-tight">
                    One app, three workflows.
                </h2>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
                @foreach ([
                    ['Owner', 'Daily KPI dashboard, kanban across all orders, bulk-edit priority and payment status, brand and customer drill-downs.'],
                    ['Accounts', 'Record payments and watch the aging buckets recalculate. Invoice + quotation PDFs in seconds. Scheduled WhatsApp reminders.'],
                    ['Warehouse', 'Pick / pack queue, dispatch checklist, picking + packing slips, POD photo upload with OCR auto-fill.'],
                ] as $persona)
                    <div>
                        <div class="text-[13px] uppercase tracking-wider text-zinc-400 mb-2">For {{ strtolower($persona[0]) }}</div>
                        <h3 class="text-xl font-semibold text-zinc-900 tracking-tight mb-3">{{ $persona[0] }}</h3>
                        <p class="text-zinc-600 leading-relaxed">{{ $persona[1] }}</p>
                    </div>
                @endforeach
            </div>
        </div>
    </section>

    {{-- Bottom CTA --}}
    <section class="py-32">
        <div class="mx-auto max-w-3xl px-6 lg:px-8 text-center">
            <h2 class="text-4xl sm:text-5xl font-semibold tracking-tight text-zinc-900 leading-tight">
                Let's talk for 30 minutes.
            </h2>
            <p class="mt-6 text-lg text-zinc-600">
                On your own data. If OCC doesn't save you two hours a week, we'll tell you so.
            </p>
            <div class="mt-10">
                <a href="{{ url('/contact') }}"
                   class="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-zinc-900 text-white text-[14px] font-medium hover:bg-zinc-700 transition-colors">
                    Request a demo
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </a>
            </div>
        </div>
    </section>
@endsection
