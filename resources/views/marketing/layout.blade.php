{{--
    Marketing layout. Aesthetic: Notion / shadcn / Plain.so — monochrome,
    typography-led, generous whitespace, restrained color (zinc + a single
    soft accent), inline line-icons (not emoji), refined borders.
--}}
<!DOCTYPE html>
<html lang="en" class="scroll-smooth antialiased">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#0a0a0a">

    <title>@yield('title') — {{ config('marketing.product_name') }}</title>
    <meta name="description" content="@yield('description', 'Operations software for businesses that run on Tally.')">

    <meta property="og:title" content="@yield('title') — {{ config('marketing.product_name') }}">
    <meta property="og:description" content="@yield('description', 'Operations software for businesses that run on Tally.')">
    <meta property="og:type" content="website">
    <meta property="og:url" content="{{ config('marketing.site_url') }}{{ request()->getPathInfo() }}">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="canonical" href="{{ config('marketing.site_url') }}{{ request()->getPathInfo() }}">

    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700&display=swap" rel="stylesheet">

    <script type="application/ld+json">
    {"@context":"https://schema.org","@type":"SoftwareApplication","name":"{{ config('marketing.product_name') }}","applicationCategory":"BusinessApplication","operatingSystem":"Web","offers":{"@type":"Offer","price":"0","priceCurrency":"INR"},"publisher":{"@type":"Organization","name":"{{ config('marketing.company_name') }}"}}
    </script>

    @vite('resources/css/app.css')
</head>
<body class="min-h-screen bg-white text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white">

    {{-- Header — minimal, sticky on scroll --}}
    <header class="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-zinc-100">
        <div class="mx-auto max-w-6xl px-6 lg:px-8 h-14 flex items-center justify-between">
            <a href="{{ url('/') }}" class="flex items-center gap-2 font-semibold text-[15px] tracking-tight">
                <span class="inline-flex items-center justify-center w-6 h-6 rounded-md bg-zinc-900 text-white text-[11px] font-bold">O</span>
                <span>{{ config('marketing.product_name') }}</span>
            </a>
            <nav class="hidden md:flex items-center gap-7 text-[14px] text-zinc-600">
                <a href="{{ url('/features') }}" class="hover:text-zinc-900 transition-colors">Features</a>
                <a href="{{ url('/tally') }}" class="hover:text-zinc-900 transition-colors">Tally bridge</a>
                <a href="{{ url('/pricing') }}" class="hover:text-zinc-900 transition-colors">Pricing</a>
                <a href="{{ url('/about') }}" class="hover:text-zinc-900 transition-colors">About</a>
                @if (Route::has('login'))
                    <a href="{{ route('login') }}" class="hover:text-zinc-900 transition-colors">Log in</a>
                @endif
                <a href="{{ url('/contact') }}"
                   class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-zinc-900 text-white text-[13px] font-medium hover:bg-zinc-700 transition-colors">
                    Talk to us
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </a>
            </nav>
            <a href="{{ url('/contact') }}" class="md:hidden inline-flex items-center px-3 py-1.5 rounded-md bg-zinc-900 text-white text-[13px] font-medium">
                Talk to us
            </a>
        </div>
    </header>

    <main>
        @yield('content')
    </main>

    {{-- Floating WhatsApp button — small, refined --}}
    <a href="https://wa.me/{{ config('marketing.whatsapp_number') }}?text={{ urlencode(config('marketing.whatsapp_prefill')) }}"
       target="_blank" rel="noopener"
       aria-label="Chat on WhatsApp"
       class="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-zinc-900 text-white text-[13px] font-medium shadow-sm hover:bg-zinc-700 transition-all">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
        </svg>
        <span class="hidden sm:inline">WhatsApp us</span>
    </a>

    {{-- Footer — restrained, editorial --}}
    <footer class="border-t border-zinc-100 mt-32">
        <div class="mx-auto max-w-6xl px-6 lg:px-8 py-14">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-10 text-[14px]">
                <div class="col-span-2">
                    <div class="flex items-center gap-2 font-semibold text-zinc-900 mb-3">
                        <span class="inline-flex items-center justify-center w-5 h-5 rounded bg-zinc-900 text-white text-[10px] font-bold">O</span>
                        {{ config('marketing.product_name') }}
                    </div>
                    <p class="text-zinc-500 leading-relaxed max-w-sm">
                        Operations software for Indian MSMEs that run on Tally.
                        Built and used daily at GC Communication, Nashik.
                    </p>
                </div>
                <div>
                    <div class="text-zinc-900 font-medium mb-3">Product</div>
                    <ul class="space-y-2.5 text-zinc-500">
                        <li><a href="{{ url('/features') }}" class="hover:text-zinc-900">Features</a></li>
                        <li><a href="{{ url('/tally') }}" class="hover:text-zinc-900">Tally bridge</a></li>
                        <li><a href="{{ url('/pricing') }}" class="hover:text-zinc-900">Pricing</a></li>
                        @if (Route::has('login'))
                            <li><a href="{{ route('login') }}" class="hover:text-zinc-900">Customer login</a></li>
                        @endif
                    </ul>
                </div>
                <div>
                    <div class="text-zinc-900 font-medium mb-3">Contact</div>
                    <ul class="space-y-2.5 text-zinc-500">
                        <li><a href="tel:{{ str_replace(' ', '', config('marketing.phone')) }}" class="hover:text-zinc-900">{{ config('marketing.phone') }}</a></li>
                        <li><a href="mailto:{{ config('marketing.email') }}" class="hover:text-zinc-900">{{ config('marketing.email') }}</a></li>
                        <li class="text-zinc-400">{{ config('marketing.address_line') }}</li>
                    </ul>
                </div>
            </div>
            <div class="border-t border-zinc-100 mt-12 pt-6 flex flex-col sm:flex-row justify-between text-[12px] text-zinc-400 gap-3">
                <div>© {{ date('Y') }} {{ config('marketing.company_name') }} — Made in India.</div>
                <div class="flex flex-wrap gap-4">
                    <a href="{{ url('/privacy') }}" class="hover:text-zinc-700">Privacy</a>
                    <a href="{{ url('/terms') }}" class="hover:text-zinc-700">Terms</a>
                    <a href="{{ url('/dpa') }}" class="hover:text-zinc-700">DPA</a>
                    @if (config('marketing.gstin'))
                        <span>GSTIN: {{ config('marketing.gstin') }}</span>
                    @endif
                </div>
            </div>
        </div>
    </footer>
</body>
</html>
