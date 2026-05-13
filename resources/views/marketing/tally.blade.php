@extends('marketing.layout')

@section('title', 'Tally bridge')
@section('description', 'OCC connects to your existing TallyPrime via a one-click Windows installer. Your CA workflow stays untouched; OCC becomes your daily ops cockpit.')

@section('content')
    <section class="py-24 border-b border-zinc-100">
        <div class="mx-auto max-w-3xl px-6 lg:px-8">
            <p class="text-[13px] uppercase tracking-wider text-zinc-400 mb-4">Tally bridge</p>
            <h1 class="text-5xl sm:text-6xl font-semibold text-zinc-900 tracking-tight leading-[1.05]">
                Your CA keeps Tally.<br>
                <span class="text-zinc-400">You get the cockpit.</span>
            </h1>
            <p class="mt-8 text-lg text-zinc-600 leading-relaxed max-w-2xl">
                OCC doesn't replace Tally. We connect to it — pulling masters,
                pushing vouchers — so your books stay perfect for your CA while
                you get the operations UX Tally was never built for.
            </p>
        </div>
    </section>

    {{-- Architecture — clean diagram, monochrome --}}
    <section class="py-24 border-b border-zinc-100">
        <div class="mx-auto max-w-5xl px-6 lg:px-8">
            <p class="text-[13px] uppercase tracking-wider text-zinc-400 mb-3">How it connects</p>
            <h2 class="text-3xl font-semibold text-zinc-900 tracking-tight mb-12 leading-tight max-w-2xl">
                Cloud OCC ↔ a tiny daemon ↔ your local Tally.
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-px bg-zinc-100 border border-zinc-100 rounded-lg overflow-hidden">
                @foreach ([
                    [
                        'icon' => '<path d="M17.5 19a4.5 4.5 0 1 0 0-9 6 6 0 0 0-11.65-1.5A4 4 0 0 0 6 17.5"/>',
                        'label' => 'Cloud OCC',
                        'body' => 'Where your team works — owner, accounts, warehouse — from anywhere with a browser.'
                    ],
                    [
                        'icon' => '<path d="M3 12h18M3 6h18M3 18h18"/><circle cx="6" cy="6" r="1"/><circle cx="6" cy="12" r="1"/><circle cx="6" cy="18" r="1"/>',
                        'label' => 'Bridge agent',
                        'body' => 'A tiny Windows daemon. Polls the cloud for queued operations, executes them against local Tally.'
                    ],
                    [
                        'icon' => '<path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/>',
                        'label' => 'Local Tally',
                        'body' => 'Your existing TallyPrime. Books, GST returns, CA-ready. Untouched workflow.'
                    ],
                ] as $node)
                    <div class="bg-white p-8">
                        <div class="w-9 h-9 rounded-md border border-zinc-200 flex items-center justify-center mb-5 text-zinc-700">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">{!! $node['icon'] !!}</svg>
                        </div>
                        <h3 class="text-[15px] font-semibold text-zinc-900 mb-2">{{ $node['label'] }}</h3>
                        <p class="text-[14px] text-zinc-600 leading-relaxed">{{ $node['body'] }}</p>
                    </div>
                @endforeach
            </div>
        </div>
    </section>

    {{-- Steps --}}
    <section class="py-24 border-b border-zinc-100">
        <div class="mx-auto max-w-4xl px-6 lg:px-8">
            <div class="max-w-2xl mb-16">
                <p class="text-[13px] uppercase tracking-wider text-zinc-400 mb-3">Setup</p>
                <h2 class="text-3xl font-semibold text-zinc-900 tracking-tight leading-tight">
                    Live in five minutes.
                </h2>
            </div>
            <ol class="space-y-1">
                @foreach ([
                    ['Sign up for OCC', 'Tell us about your business. We provision your workspace within one working day.'],
                    ['Download the bridge', 'From your settings page, click Download Tally Bridge. The zip is pre-configured with your unique token.'],
                    ['Unblock and run', 'Right-click the zip → Properties → "Unblock" (Windows SmartScreen). Extract. Double-click tally-bridge.bat.'],
                    ['Connect to Tally', 'The bridge auto-detects TallyPrime on 127.0.0.1:9000. First-run wizard verifies the connection.'],
                    ['You\'re live', 'OCC starts pulling customer + product masters. Every order delivered creates a sales voucher in Tally automatically.'],
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
        </div>
    </section>

    {{-- Two modes --}}
    <section class="py-24 border-b border-zinc-100">
        <div class="mx-auto max-w-5xl px-6 lg:px-8">
            <p class="text-[13px] uppercase tracking-wider text-zinc-400 mb-3">Two modes</p>
            <h2 class="text-3xl font-semibold text-zinc-900 tracking-tight mb-12 leading-tight max-w-2xl">
                Pick whichever fits how your team works.
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="p-8 rounded-lg border border-zinc-200">
                    <h3 class="text-[16px] font-semibold text-zinc-900 mb-2">Same-PC mode</h3>
                    <p class="text-[13px] text-zinc-500 mb-4">Best for single-location offices</p>
                    <p class="text-zinc-600 leading-relaxed">
                        OCC runs on the same Windows PC as TallyPrime.
                        Bridge talks directly to 127.0.0.1:9000.
                        Simplest setup, no internet dependency for the Tally side.
                    </p>
                </div>
                <div class="p-8 rounded-lg border border-zinc-900 bg-zinc-900 text-white">
                    <h3 class="text-[16px] font-semibold mb-2">Cloud mode</h3>
                    <p class="text-[13px] text-zinc-400 mb-4">Best for remote teams, multiple users</p>
                    <p class="text-zinc-300 leading-relaxed">
                        OCC runs on the cloud (occ.in). Bridge agent on your Tally PC
                        polls for queued operations. Your owner manages orders
                        from their phone; Tally stays at the office.
                    </p>
                </div>
            </div>
        </div>
    </section>

    {{-- FAQ --}}
    <section class="py-24">
        <div class="mx-auto max-w-3xl px-6 lg:px-8">
            <p class="text-[13px] uppercase tracking-wider text-zinc-400 mb-3">FAQ</p>
            <h2 class="text-3xl font-semibold text-zinc-900 tracking-tight mb-12 leading-tight">
                Common questions.
            </h2>
            <div>
                @foreach ([
                    ['Will my CA need to learn new software?', 'No. Your CA keeps opening Tally exactly like today. OCC writes vouchers into Tally automatically, so the books your CA sees are always current.'],
                    ['Does it work with TallyPrime 4.x?', 'Yes. We use the ODBC-over-HTTP interface that\'s been part of Tally since 9.0. Works with TallyPrime, Tally.ERP 9, and Tally Server 9.'],
                    ['What if my internet goes down?', 'In cloud mode the bridge queues operations locally and syncs when the connection returns. Your team can keep working in OCC; pushes catch up automatically. Same-PC mode doesn\'t need internet at all.'],
                    ['Is my data secure?', 'Each tenant gets a unique secret token. Bridges from one company can\'t see another\'s data. All traffic is TLS-encrypted; tokens are hashed at rest.'],
                    ['Can I disconnect anytime?', 'Yes. Revoke the bridge token in your settings — the agent immediately loses access. OCC keeps its data, Tally keeps its data. Neither is locked in.'],
                ] as $faq)
                    <details class="group border-b border-zinc-100 py-5">
                        <summary class="flex justify-between items-center cursor-pointer text-[15px] font-medium text-zinc-900 list-none">
                            <span>{{ $faq[0] }}</span>
                            <svg class="flex-shrink-0 text-zinc-400 group-open:rotate-45 transition-transform" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                        </summary>
                        <p class="mt-4 text-zinc-600 leading-relaxed pr-8">{{ $faq[1] }}</p>
                    </details>
                @endforeach
            </div>
        </div>
    </section>

    <section class="py-32 border-t border-zinc-100">
        <div class="mx-auto max-w-3xl px-6 lg:px-8 text-center">
            <h2 class="text-4xl sm:text-5xl font-semibold text-zinc-900 tracking-tight leading-tight">
                Try it with your own Tally.
            </h2>
            <p class="mt-6 text-lg text-zinc-600">
                We'll do the bridge install on a screen-share. 20 minutes, no commitment.
            </p>
            <div class="mt-10">
                <a href="{{ url('/contact') }}"
                   class="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-zinc-900 text-white text-[14px] font-medium hover:bg-zinc-700">
                    Schedule a setup call
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </a>
            </div>
        </div>
    </section>
@endsection
