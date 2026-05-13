@extends('marketing.layout')

@section('title', 'Contact')
@section('description', 'Get in touch with OCC — WhatsApp, phone, email, or contact form. We respond within 24 hours.')

@section('content')
    <section class="py-24 border-b border-zinc-100">
        <div class="mx-auto max-w-3xl px-6 lg:px-8">
            <p class="text-[13px] uppercase tracking-wider text-zinc-400 mb-4">Contact</p>
            <h1 class="text-5xl sm:text-6xl font-semibold text-zinc-900 tracking-tight leading-[1.05]">
                Let's talk.
            </h1>
            <p class="mt-8 text-lg text-zinc-600 leading-relaxed max-w-2xl">
                We respond within 24 hours, usually faster.
                For instant chat, WhatsApp is the quickest way.
            </p>
        </div>
    </section>

    <section class="py-20">
        <div class="mx-auto max-w-5xl px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-5 gap-x-12 gap-y-8">
            {{-- Channels — left column --}}
            <div class="lg:col-span-2 space-y-4">
                <p class="text-[13px] uppercase tracking-wider text-zinc-400 mb-4">Reach us directly</p>

                <a href="https://wa.me/{{ config('marketing.whatsapp_number') }}?text={{ urlencode(config('marketing.whatsapp_prefill')) }}"
                   target="_blank" rel="noopener"
                   class="block p-5 rounded-lg border border-zinc-200 hover:border-zinc-400 transition-colors group">
                    <div class="flex items-center gap-3">
                        <svg class="text-zinc-700" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/>
                        </svg>
                        <div class="font-semibold text-zinc-900 text-[15px]">WhatsApp</div>
                        <svg class="ml-auto text-zinc-400 group-hover:text-zinc-700 group-hover:translate-x-0.5 transition-all" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                    </div>
                    <p class="mt-2 text-[14px] text-zinc-600">Fastest channel. Most leads come in here.</p>
                </a>

                <a href="tel:{{ str_replace(' ', '', config('marketing.phone')) }}"
                   class="block p-5 rounded-lg border border-zinc-200 hover:border-zinc-400 transition-colors group">
                    <div class="flex items-center gap-3">
                        <svg class="text-zinc-700" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>
                        </svg>
                        <div class="font-semibold text-zinc-900 text-[15px]">Phone</div>
                        <svg class="ml-auto text-zinc-400 group-hover:text-zinc-700 group-hover:translate-x-0.5 transition-all" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                    </div>
                    <p class="mt-2 text-[14px] text-zinc-600">10am – 7pm IST, Mon–Sat. {{ config('marketing.phone') }}</p>
                </a>

                <a href="mailto:{{ config('marketing.email') }}"
                   class="block p-5 rounded-lg border border-zinc-200 hover:border-zinc-400 transition-colors group">
                    <div class="flex items-center gap-3">
                        <svg class="text-zinc-700" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6"/>
                        </svg>
                        <div class="font-semibold text-zinc-900 text-[15px]">Email</div>
                        <svg class="ml-auto text-zinc-400 group-hover:text-zinc-700 group-hover:translate-x-0.5 transition-all" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                    </div>
                    <p class="mt-2 text-[14px] text-zinc-600">For detailed questions or attachments.</p>
                </a>
            </div>

            {{-- Form — right column --}}
            <div class="lg:col-span-3">
                <div class="p-8 rounded-lg border border-zinc-200">
                    <p class="text-[13px] uppercase tracking-wider text-zinc-400 mb-3">Or fill the form</p>
                    <h2 class="text-2xl font-semibold text-zinc-900 tracking-tight mb-6">Send us a message</h2>

                    @if (session('lead_submitted'))
                        <div class="p-4 mb-6 rounded-md bg-zinc-900 text-white">
                            <p class="text-[14px] font-medium">Thanks — we got your message.</p>
                            <p class="text-[13px] text-zinc-300 mt-1">We'll be in touch within 24 hours. For faster response, ping us on WhatsApp.</p>
                        </div>
                    @endif

                    <form action="{{ url('/contact') }}" method="POST" class="space-y-5">
                        @csrf

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label for="name" class="block text-[13px] font-medium text-zinc-700 mb-1.5">
                                    Your name
                                </label>
                                <input type="text" name="name" id="name" required maxlength="100"
                                       value="{{ old('name') }}"
                                       class="w-full px-3 py-2 border border-zinc-200 rounded-md focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-[14px]">
                                @error('name') <div class="text-[12px] text-red-600 mt-1">{{ $message }}</div> @enderror
                            </div>
                            <div>
                                <label for="business_name" class="block text-[13px] font-medium text-zinc-700 mb-1.5">
                                    Business name
                                </label>
                                <input type="text" name="business_name" id="business_name" required maxlength="150"
                                       value="{{ old('business_name') }}"
                                       class="w-full px-3 py-2 border border-zinc-200 rounded-md focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-[14px]">
                                @error('business_name') <div class="text-[12px] text-red-600 mt-1">{{ $message }}</div> @enderror
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label for="phone" class="block text-[13px] font-medium text-zinc-700 mb-1.5">Phone</label>
                                <input type="tel" name="phone" id="phone" required maxlength="20"
                                       value="{{ old('phone') }}" placeholder="+91 ..."
                                       class="w-full px-3 py-2 border border-zinc-200 rounded-md focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-[14px]">
                                @error('phone') <div class="text-[12px] text-red-600 mt-1">{{ $message }}</div> @enderror
                            </div>
                            <div>
                                <label for="email" class="block text-[13px] font-medium text-zinc-700 mb-1.5">
                                    Email <span class="text-zinc-400 font-normal">(optional)</span>
                                </label>
                                <input type="email" name="email" id="email" maxlength="150"
                                       value="{{ old('email') }}"
                                       class="w-full px-3 py-2 border border-zinc-200 rounded-md focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-[14px]">
                                @error('email') <div class="text-[12px] text-red-600 mt-1">{{ $message }}</div> @enderror
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label for="current_software" class="block text-[13px] font-medium text-zinc-700 mb-1.5">
                                    Current accounting software
                                </label>
                                <select name="current_software" id="current_software"
                                        class="w-full px-3 py-2 border border-zinc-200 rounded-md focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-[14px] bg-white">
                                    <option value="">— Select —</option>
                                    <option value="tally">Tally</option>
                                    <option value="busy">Busy</option>
                                    <option value="zoho">Zoho Books</option>
                                    <option value="vyapar">Vyapar</option>
                                    <option value="marg">Marg</option>
                                    <option value="excel">Excel / paper</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label for="orders_per_month" class="block text-[13px] font-medium text-zinc-700 mb-1.5">
                                    Approx. orders / month
                                </label>
                                <select name="orders_per_month" id="orders_per_month"
                                        class="w-full px-3 py-2 border border-zinc-200 rounded-md focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-[14px] bg-white">
                                    <option value="">— Select —</option>
                                    <option value="lt_50">Less than 50</option>
                                    <option value="50_200">50 – 200</option>
                                    <option value="200_500">200 – 500</option>
                                    <option value="gt_500">More than 500</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label for="notes" class="block text-[13px] font-medium text-zinc-700 mb-1.5">
                                Anything else? <span class="text-zinc-400 font-normal">(optional)</span>
                            </label>
                            <textarea name="notes" id="notes" rows="3" maxlength="1000"
                                      class="w-full px-3 py-2 border border-zinc-200 rounded-md focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none text-[14px]">{{ old('notes') }}</textarea>
                            @error('notes') <div class="text-[12px] text-red-600 mt-1">{{ $message }}</div> @enderror
                        </div>

                        {{-- Honeypot: bots fill every field, humans skip it --}}
                        <input type="text" name="company_website" tabindex="-1" autocomplete="off"
                               style="position:absolute;left:-9999px" aria-hidden="true">

                        <div class="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
                            <button type="submit"
                                    class="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-zinc-900 text-white text-[14px] font-medium hover:bg-zinc-700 transition-colors">
                                Send message
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                            </button>
                            <p class="text-[12px] text-zinc-500">
                                No marketing emails. We respect your inbox.
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </section>
@endsection
