@extends('marketing.layout')

@section('title', 'Pricing')
@section('description', 'OCC pricing is conversation-driven. We size to your business, not a generic tier.')

@section('content')
    <section class="py-24 border-b border-zinc-100">
        <div class="mx-auto max-w-3xl px-6 lg:px-8">
            <p class="text-[13px] uppercase tracking-wider text-zinc-400 mb-4">Pricing</p>
            <h1 class="text-5xl sm:text-6xl font-semibold text-zinc-900 tracking-tight leading-[1.05]">
                One conversation.<br>
                <span class="text-zinc-400">Custom quote.</span>
            </h1>
            <p class="mt-8 text-lg text-zinc-600 leading-relaxed max-w-2xl">
                We're not hiding prices. They depend on team size, order volume,
                and how many Tally instances you connect. We'd rather quote honestly
                after a 20-minute call than make you fit into the wrong tier.
            </p>
            <div class="mt-10">
                <a href="{{ url('/contact') }}"
                   class="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-zinc-900 text-white text-[14px] font-medium hover:bg-zinc-700">
                    Get a quote
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </a>
            </div>
        </div>
    </section>

    {{-- Every plan includes — 2 col compact list --}}
    <section class="py-24 border-b border-zinc-100">
        <div class="mx-auto max-w-5xl px-6 lg:px-8">
            <p class="text-[13px] uppercase tracking-wider text-zinc-400 mb-3">Included by default</p>
            <h2 class="text-3xl font-semibold text-zinc-900 tracking-tight mb-12 leading-tight max-w-2xl">
                No key feature is locked behind a paywall.
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-4">
                @foreach ([
                    'Tally bridge, both same-PC and cloud modes',
                    'Unlimited orders, customers, products',
                    'Invoice + quotation PDFs with your branding',
                    'WhatsApp templates (AiSensy add-on, at cost)',
                    'Owner / Manager / Accounts / Warehouse / Viewer roles',
                    'Real-time analytics + scheduled reports',
                    'Daily encrypted backups, tested restore',
                    'Two-factor authentication for all users',
                    'Public order tracking page (UUID URLs)',
                    'Audit log per Companies Act 2013',
                    'Founder-led support, no ticket queue',
                    'Free setup and data migration',
                ] as $item)
                    <div class="flex gap-3 text-zinc-700 py-2">
                        <svg class="flex-shrink-0 mt-1 text-zinc-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20 6L9 17l-5-5"/>
                        </svg>
                        <span class="text-[15px]">{{ $item }}</span>
                    </div>
                @endforeach
            </div>
        </div>
    </section>

    {{-- Process --}}
    <section class="py-24 border-b border-zinc-100">
        <div class="mx-auto max-w-4xl px-6 lg:px-8">
            <p class="text-[13px] uppercase tracking-wider text-zinc-400 mb-3">How payment works</p>
            <h2 class="text-3xl font-semibold text-zinc-900 tracking-tight mb-12 leading-tight max-w-2xl">
                Five steps. No card on file.
            </h2>
            <ol>
                @foreach ([
                    ['Tell us about your business', 'Contact form or WhatsApp. We respond within 24 hours.'],
                    ['30-minute call + demo', 'We walk through OCC on your data, answer questions, scope your plan.'],
                    ['Quote + agreement', 'Proper GST invoice (Delta System) and a one-page service agreement.'],
                    ['Bank transfer or UPI', 'Direct to our HDFC account or UPI. Receipt the same day.'],
                    ['Workspace goes live', 'Provisioned within one working day. Bridge zip ready to download.'],
                ] as $i => $step)
                    <li class="flex gap-6 py-6 {{ ! $loop->last ? 'border-b border-zinc-100' : '' }}">
                        <div class="flex-shrink-0 w-7 h-7 mt-0.5 rounded-md border border-zinc-200 text-zinc-700 flex items-center justify-center text-[12px] font-semibold font-mono">
                            {{ str_pad((string) ($i + 1), 2, '0', STR_PAD_LEFT) }}
                        </div>
                        <div>
                            <h3 class="text-[16px] font-semibold text-zinc-900 mb-1">{{ $step[0] }}</h3>
                            <p class="text-zinc-600 leading-relaxed">{{ $step[1] }}</p>
                        </div>
                    </li>
                @endforeach
            </ol>
            <p class="mt-12 text-[14px] text-zinc-500 leading-relaxed">
                We accept bank transfer (NEFT / IMPS / RTGS), UPI, and cheque.
                No card gateway, no processing fees passed to you.
            </p>
        </div>
    </section>

    <section class="py-32">
        <div class="mx-auto max-w-3xl px-6 lg:px-8 text-center">
            <h2 class="text-4xl sm:text-5xl font-semibold text-zinc-900 tracking-tight leading-tight">
                Let's chat for 20 minutes.
            </h2>
            <p class="mt-6 text-lg text-zinc-600">
                If it's not the right fit we'll say so. No pressure.
            </p>
            <div class="mt-10 flex flex-col sm:flex-row gap-3 justify-center items-center">
                <a href="{{ url('/contact') }}"
                   class="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-zinc-900 text-white text-[14px] font-medium hover:bg-zinc-700">
                    Get a quote
                </a>
                <a href="tel:{{ str_replace(' ', '', config('marketing.phone')) }}"
                   class="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-zinc-700 text-[14px] font-medium hover:text-zinc-900">
                    Or call {{ config('marketing.phone') }}
                </a>
            </div>
        </div>
    </section>
@endsection
