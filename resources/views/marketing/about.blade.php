@extends('marketing.layout')

@section('title', 'About')
@section('description', 'OCC was built for GC Communication in Nashik by Virag Bora. Now offered to other Indian MSMEs.')

@section('content')
    <section class="py-24 border-b border-zinc-100">
        <div class="mx-auto max-w-3xl px-6 lg:px-8">
            <p class="text-[13px] uppercase tracking-wider text-zinc-400 mb-4">About</p>
            <h1 class="text-5xl sm:text-6xl font-semibold text-zinc-900 tracking-tight leading-[1.05]">
                The story.
            </h1>
        </div>
    </section>

    {{-- Narrative — Notion-like long-form --}}
    <section class="py-20">
        <div class="mx-auto max-w-2xl px-6 lg:px-8">
            <div class="space-y-6 text-[17px] text-zinc-700 leading-relaxed">
                <p>
                    OCC started as an internal tool. GC Communication, our family business in Nashik,
                    has been distributing electrical switchgear since 2018. Like every Indian MSME, we
                    use Tally for accounting. And like every Indian MSME owner, we kept hitting the same
                    problem.
                </p>
                <p class="text-2xl font-semibold text-zinc-900 leading-snug tracking-tight pt-4">
                    Tally is great for the CA. Terrible for the owner.
                </p>
                <p>
                    Where's my order? Did the LR get shared with the customer? How many orders are stuck
                    in dispatch? Which transporter has the worst SLA? Who owes me money 90+ days?
                </p>
                <p>
                    These questions don't have answers in Tally — they require opening reports, exporting
                    CSVs, pivoting in Excel. By the time you have the answer, the question has changed.
                </p>
                <p>
                    So I built OCC. Single-page React UI, real-time data, every workflow my team actually
                    does. Tally bridge in the background, keeping the books current for our CA. We've been
                    using it daily for years — thousands of orders, hundreds of dispatches, audited books.
                </p>
                <p class="text-zinc-900 font-medium">
                    Now I'm offering it to other Indian MSMEs.
                </p>
            </div>
        </div>
    </section>

    {{-- Founder card --}}
    <section class="py-20 border-y border-zinc-100">
        <div class="mx-auto max-w-3xl px-6 lg:px-8">
            <div class="flex flex-col sm:flex-row gap-8 items-start">
                <div class="flex-shrink-0 w-20 h-20 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xl font-semibold">
                    VB
                </div>
                <div class="flex-1">
                    <div class="text-[13px] uppercase tracking-wider text-zinc-400 mb-1">Founder</div>
                    <h3 class="text-2xl font-semibold text-zinc-900 tracking-tight">Virag Bora</h3>
                    <p class="text-[14px] text-zinc-500 mt-0.5">Delta System · Owner, GC Communication</p>
                    <p class="mt-5 text-zinc-600 leading-relaxed">
                        I run the family business by day and write the software by night.
                        Every feature in OCC was built because we needed it — not because
                        a product manager thought it might be cool. If something doesn't
                        make sense, it's because we got lucky and never hit the use case.
                        Tell me; I'll fix it.
                    </p>
                </div>
            </div>
        </div>
    </section>

    {{-- Values --}}
    <section class="py-24">
        <div class="mx-auto max-w-5xl px-6 lg:px-8">
            <p class="text-[13px] uppercase tracking-wider text-zinc-400 mb-3">How we work</p>
            <h2 class="text-3xl font-semibold text-zinc-900 tracking-tight mb-12 leading-tight max-w-2xl">
                Four operating principles.
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-px bg-zinc-100 border border-zinc-100 rounded-lg overflow-hidden">
                @foreach ([
                    ['Honest pricing', 'We tell you the cost after we understand your business. No hidden tiers, no upsell traps, no surprise renewals.'],
                    ['Tally stays', 'We\'re not trying to replace your accountant\'s workflow. Tally is the books. OCC handles operations.'],
                    ['Founder-led support', 'You email; the founder replies. No ticket queue, no tier-1 bots. Bugs get fixed, not triaged.'],
                    ['Built in India, for India', 'GST, e-invoice, WhatsApp, Hindi/Marathi templates, IST timezones, ₹ formatting. Not a translated American SaaS.'],
                ] as $value)
                    <div class="bg-white p-8">
                        <h3 class="text-[16px] font-semibold text-zinc-900 mb-2">{{ $value[0] }}</h3>
                        <p class="text-zinc-600 leading-relaxed">{{ $value[1] }}</p>
                    </div>
                @endforeach
            </div>
        </div>
    </section>

    <section class="py-32 border-t border-zinc-100">
        <div class="mx-auto max-w-3xl px-6 lg:px-8 text-center">
            <h2 class="text-4xl sm:text-5xl font-semibold text-zinc-900 tracking-tight leading-tight">
                Want to chat?
            </h2>
            <p class="mt-6 text-lg text-zinc-600">
                Sales, support, feature requests, bug reports — same inbox.
            </p>
            <div class="mt-10">
                <a href="{{ url('/contact') }}"
                   class="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-zinc-900 text-white text-[14px] font-medium hover:bg-zinc-700">
                    Get in touch
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </a>
            </div>
        </div>
    </section>
@endsection
