@extends('marketing.layout')

@section('title', 'Terms of service')
@section('description', 'Terms governing your use of OCC. Plain-language version of the legal agreement.')

@section('content')
    <section class="py-24 border-b border-zinc-100">
        <div class="mx-auto max-w-3xl px-6 lg:px-8">
            <p class="text-[13px] uppercase tracking-wider text-zinc-400 mb-4">Legal</p>
            <h1 class="text-5xl sm:text-6xl font-semibold text-zinc-900 tracking-tight leading-[1.05]">
                Terms of service
            </h1>
            <p class="mt-6 text-sm text-zinc-500">
                Effective {{ config('marketing.legal.effective_date') }}
            </p>
        </div>
    </section>

    <section class="py-16">
        <article class="mx-auto max-w-3xl px-6 lg:px-8 prose prose-zinc max-w-none prose-headings:tracking-tight prose-headings:font-semibold prose-h2:mt-12 prose-h2:text-2xl prose-h3:text-lg prose-p:leading-relaxed prose-li:leading-relaxed">

            <p class="lead text-zinc-600">
                These Terms govern your use of {{ config('marketing.product_name') }} (the &ldquo;Service&rdquo;),
                operated by {{ config('marketing.company_name') }} (&ldquo;we&rdquo;, &ldquo;us&rdquo;).
                By using the Service, you agree to these Terms.
                Plain language, not legalese. Read it.
            </p>

            <h2>1. Your account</h2>
            <p>
                When you sign up for a workspace, you are creating an account on behalf of your business. You agree that:
            </p>
            <ul>
                <li>You are at least 18 years old and authorised to bind your business.</li>
                <li>The information you provide is accurate and current.</li>
                <li>You will keep your password secret and not share it. We strongly recommend turning on two-factor authentication.</li>
                <li>You are responsible for all activity under your account, including actions by your team members.</li>
            </ul>

            <h2>2. What you can do with the Service</h2>
            <p>You may use the Service to operate your own business. You may not:</p>
            <ul>
                <li>Use the Service in a way that violates applicable Indian law.</li>
                <li>Re-sell, sublicense, or white-label the Service without our written permission.</li>
                <li>Reverse-engineer, decompile, or attempt to extract our source code.</li>
                <li>Attempt to access another workspace's data, probe our security, or disrupt the Service for others.</li>
                <li>Upload content that infringes someone else's intellectual property or is unlawful.</li>
            </ul>

            <h2>3. Your data is yours</h2>
            <p>
                You own all data you upload, create, or generate through the Service — customers, products, orders, payments, evidence, audit log.
                We process it on your behalf to deliver the Service. We do not claim any rights to your data beyond what we need to run the Service for you.
            </p>
            <p>
                You can export your data at any time via the export tools in your workspace, or by asking us.
                If you cancel, we keep your data for 30 days so you can re-activate, then permanently delete it.
            </p>

            <h2>4. The Service we provide</h2>
            <p>
                We do our honest best to keep the Service running, secure, and useful.
                We target 99.5% uptime measured monthly (excluding planned maintenance and force-majeure events).
                We are not obligated to provide any specific feature — we improve the Service over time and may change, add, or retire features.
                Material changes that remove features you depend on will be announced at least 30 days in advance.
            </p>

            <h2>5. Pricing and payment</h2>
            <ul>
                <li>Pricing is agreed in writing on a quotation. We accept bank transfer (NEFT / IMPS / RTGS), UPI, and cheque.</li>
                <li>Invoices are raised in advance for the subscription period (monthly or annual, as agreed).</li>
                <li>Payment is due within 7 days of invoice date.</li>
                <li>Late payment may result in suspension of the Service after 14 days of non-payment, with reasonable advance notice.</li>
                <li>GST is charged in addition to the quoted price, at the applicable rate.</li>
            </ul>

            <h2>6. Termination</h2>
            <p>
                Either party may terminate the agreement at the end of the current billing period with 30 days' written notice.
                We may terminate immediately if you breach these Terms (subject to a 7-day cure period for fixable breaches) or if your account is used for illegal activity.
                On termination, your access to the Service ends, and we delete your data per the Privacy Policy schedule.
            </p>

            <h2>7. Intellectual property</h2>
            <p>
                The Service, its source code, design, and branding (including the names "OCC" and "{{ config('marketing.company_name') }}")
                are owned by us. You get a non-exclusive, non-transferable, revocable licence to use the Service for your business
                while your subscription is active. Nothing in these Terms transfers ownership of our IP to you.
            </p>

            <h2>8. Tally bridge & third-party tools</h2>
            <p>
                The Tally bridge connects to your existing TallyPrime installation. You are responsible for licensing TallyPrime
                and complying with its terms. We are not affiliated with Tally Solutions Pvt. Ltd.
                Similarly, any integration we offer (WhatsApp via AiSensy, OCR, etc.) is subject to those providers' terms.
            </p>

            <h2>9. Liability</h2>
            <p>
                We provide the Service on an "as-is" basis. While we work hard to make it reliable, things sometimes go wrong.
                To the maximum extent permitted by Indian law:
            </p>
            <ul>
                <li>Our total liability to you under these Terms is capped at the amount you paid us in the 12 months preceding the event giving rise to the claim.</li>
                <li>We are not liable for indirect, incidental, consequential, or punitive damages — including lost profits, lost revenue, lost data (beyond restoration from backups), or business interruption.</li>
                <li>These caps do not apply to liability we cannot lawfully limit, such as fraud or wilful misconduct.</li>
            </ul>

            <h2>10. Indemnification</h2>
            <p>
                You agree to indemnify us against third-party claims arising from your data, your team's actions, or your breach of these Terms.
                We will indemnify you against third-party IP-infringement claims that the Service itself infringes valid Indian intellectual-property rights —
                provided you notify us promptly and let us control the defence.
            </p>

            <h2>11. Confidentiality</h2>
            <p>
                Each party agrees to keep the other's non-public information confidential and use it only for the purposes of these Terms.
                This applies during the term and for 3 years after termination.
            </p>

            <h2>12. Governing law and disputes</h2>
            <p>
                These Terms are governed by Indian law. Any dispute will first be addressed through good-faith discussion between
                authorised representatives. If unresolved after 30 days, the dispute will be resolved by binding arbitration
                under the Arbitration and Conciliation Act, 1996, seated in {{ config('marketing.legal.jurisdiction') }}, with proceedings in English.
                Courts in {{ config('marketing.legal.jurisdiction') }} have exclusive jurisdiction for any non-arbitrable matter.
            </p>

            <h2>13. General</h2>
            <ul>
                <li><strong>Updates</strong>: we may update these Terms; we will email workspace owners at least 7 days before changes take effect.</li>
                <li><strong>Notices</strong>: we will email the workspace owner address; you can write to <a href="mailto:{{ config('marketing.email') }}">{{ config('marketing.email') }}</a>.</li>
                <li><strong>Assignment</strong>: you cannot assign these Terms without our consent. We may assign them as part of a sale of {{ config('marketing.company_name') }}.</li>
                <li><strong>Force majeure</strong>: neither party is liable for delays caused by events beyond reasonable control.</li>
                <li><strong>Severability</strong>: if a clause is unenforceable, the rest still applies.</li>
                <li><strong>Entire agreement</strong>: these Terms (plus our Privacy Policy and any signed order form) are the entire agreement.</li>
            </ul>

            <h2>14. Contact</h2>
            <p>
                Questions about these Terms?
                Email <a href="mailto:{{ config('marketing.email') }}">{{ config('marketing.email') }}</a>
                or post to {{ config('marketing.company_name') }}, {{ config('marketing.address_line') }}.
            </p>

            <hr class="my-12">

            <div class="not-prose p-6 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-sm">
                <p class="font-semibold mb-2">Template notice</p>
                <p>
                    First-draft template. Before signing customer contracts, have it reviewed by an Indian SaaS lawyer
                    and replace this notice with the lawyer's signed-off version. Pay particular attention to the
                    liability cap, arbitration seat, and any sector-specific clauses your customer needs.
                </p>
            </div>
        </article>
    </section>
@endsection
