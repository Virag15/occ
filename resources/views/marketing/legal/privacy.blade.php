@extends('marketing.layout')

@section('title', 'Privacy policy')
@section('description', 'How OCC and Delta System collect, use, and protect your data. India DPDP Act 2023 compliant.')

@section('content')
    <section class="py-24 border-b border-zinc-100">
        <div class="mx-auto max-w-3xl px-6 lg:px-8">
            <p class="text-[13px] uppercase tracking-wider text-zinc-400 mb-4">Legal</p>
            <h1 class="text-5xl sm:text-6xl font-semibold text-zinc-900 tracking-tight leading-[1.05]">
                Privacy policy
            </h1>
            <p class="mt-6 text-sm text-zinc-500">
                Effective {{ config('marketing.legal.effective_date') }} · Last updated {{ config('marketing.legal.effective_date') }}
            </p>
        </div>
    </section>

    <section class="py-16">
        <article class="mx-auto max-w-3xl px-6 lg:px-8 prose prose-zinc max-w-none prose-headings:tracking-tight prose-headings:font-semibold prose-h2:mt-12 prose-h2:text-2xl prose-h3:text-lg prose-p:leading-relaxed prose-li:leading-relaxed">

            <p class="lead text-zinc-600">
                This Privacy Policy explains how {{ config('marketing.company_name') }}
                (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, uses, and protects information when you use
                {{ config('marketing.product_name') }} (the &ldquo;Service&rdquo;) — our SaaS for Indian MSMEs.
                We treat your trust as the product. If anything below is unclear,
                email <a href="mailto:{{ config('marketing.legal.grievance_officer_email') }}">{{ config('marketing.legal.grievance_officer_email') }}</a>
                and we will explain in plain language.
            </p>

            <h2>1. Who we are</h2>
            <p>
                {{ config('marketing.company_name') }} is a sole-proprietor/partnership business
                registered at {{ config('marketing.address_line') }}. The Service is operated and
                hosted by us. Our contact details are at the bottom of this page.
            </p>

            <h2>2. The data we collect</h2>
            <p>We collect only the data the Service needs to work.</p>

            <h3>2.1 Information you give us</h3>
            <ul>
                <li><strong>Account information</strong>: name, email address, phone number, role within your business.</li>
                <li><strong>Business information</strong>: company name, GSTIN, address, logo, signature — used on invoices we generate for you.</li>
                <li><strong>Operational data</strong>: customers, products, orders, payments, shipments, returns, and related notes you record in the Service.</li>
                <li><strong>Evidence uploads</strong>: photos of proof-of-delivery (POD), triplicate receipts, LR copies, and parcel evidence you upload from your phone.</li>
                <li><strong>Communications</strong>: support emails, WhatsApp messages, phone notes you log against an order.</li>
            </ul>

            <h3>2.2 Information collected automatically</h3>
            <ul>
                <li><strong>Log data</strong>: IP address, user-agent string, referrer, timestamps. Used for security, debugging, and capacity planning.</li>
                <li><strong>Cookies</strong>: a single session cookie that keeps you logged in. We do not run third-party advertising trackers.</li>
                <li><strong>Audit log</strong>: every change you make in the Service (who, what, when) is recorded so you and your auditor have a clean trail, per the Companies Act 2013 audit-trail requirement.</li>
            </ul>

            <h3>2.3 Information from third parties</h3>
            <ul>
                <li><strong>Tally bridge</strong>: when you connect TallyPrime, the bridge syncs customers, products, vouchers, and stock between OCC and your local Tally. This stays inside your workspace; we do not share it.</li>
                <li><strong>WhatsApp / AiSensy</strong>: if you enable WhatsApp updates, message metadata (delivered, read, failed) flows back to us.</li>
            </ul>

            <h2>3. How we use your data</h2>
            <ul>
                <li>To run the Service for you — display your orders, generate invoices, send WhatsApp messages on your behalf, sync with your Tally.</li>
                <li>To improve the Service — diagnose bugs, plan features, measure performance.</li>
                <li>To communicate with you — billing, support, security alerts, and (rarely) product updates. We do not run marketing newsletters.</li>
                <li>To comply with applicable Indian law — GST, audit, court orders, lawful government requests.</li>
            </ul>

            <h2>4. How we share your data</h2>
            <p>We do not sell your data. We share it only with:</p>
            <ul>
                <li><strong>Sub-processors</strong> we use to run the Service: managed Postgres hosting, S3-compatible object storage for evidence files, transactional email provider, WhatsApp gateway (AiSensy), OCR service (only if enabled). A current list is maintained at <a href="{{ url('/dpa') }}">our Data Processing Agreement</a>.</li>
                <li><strong>Your team members</strong> within your workspace, per the RBAC permissions you configure.</li>
                <li><strong>Law enforcement</strong> when legally compelled. We will notify you unless the order forbids it.</li>
            </ul>

            <h2>5. Where your data lives</h2>
            <p>
                Operational data is stored in managed Postgres databases located in India (Mumbai or Hyderabad region).
                Backups are encrypted and retained in the same region. Evidence files are stored in S3-compatible object storage in India.
                We do not transfer your business data outside India.
            </p>

            <h2>6. How long we keep your data</h2>
            <ul>
                <li>Active workspace data: kept while your subscription is active.</li>
                <li>Cancelled workspaces: kept for 30 days after cancellation so you can re-activate, then permanently deleted.</li>
                <li>Audit log: retained for at least 8 years per Companies Act audit-trail requirements.</li>
                <li>Log data: retained for 90 days for security purposes.</li>
                <li>Marketing leads (people who contacted us but never bought): kept for 2 years from last contact, then deleted.</li>
            </ul>

            <h2>7. Your rights under the DPDP Act 2023</h2>
            <p>You have the right to:</p>
            <ul>
                <li><strong>Access</strong> the data we hold about you.</li>
                <li><strong>Correct</strong> inaccurate data.</li>
                <li><strong>Erase</strong> your data (subject to legal retention requirements above).</li>
                <li><strong>Withdraw consent</strong> for processing that relies on consent.</li>
                <li><strong>Grievance redressal</strong> via our Grievance Officer (details below).</li>
                <li><strong>Nominate</strong> someone to exercise these rights on your behalf in case of incapacity.</li>
            </ul>
            <p>Email <a href="mailto:{{ config('marketing.legal.grievance_officer_email') }}">{{ config('marketing.legal.grievance_officer_email') }}</a>. We respond within 7 working days; complex requests within 30 days.</p>

            <h2>8. Security</h2>
            <p>What we actually do:</p>
            <ul>
                <li>All traffic over TLS 1.3 with HSTS.</li>
                <li>Per-workspace data isolation enforced at the database query layer + tested in our CI suite.</li>
                <li>Passwords hashed with bcrypt. Bridge tokens hashed at rest.</li>
                <li>Two-factor authentication available for all users.</li>
                <li>Daily encrypted backups; restore procedure tested monthly.</li>
                <li>Audit log per Companies Act 2013 — every change recorded.</li>
                <li>Bug-bounty-style responsible disclosure welcomed at the grievance email above.</li>
            </ul>

            <h2>9. Cookies</h2>
            <p>
                We use one strictly-necessary session cookie to keep you logged in.
                We do not use third-party analytics or advertising cookies.
                You can disable cookies in your browser, but the Service will not work without the session cookie.
            </p>

            <h2>10. Children</h2>
            <p>
                The Service is a B2B product not directed at children. We do not knowingly collect data from anyone under 18.
                If you believe we have collected data from a minor, contact us immediately and we will delete it.
            </p>

            <h2>11. Changes to this policy</h2>
            <p>
                If we change this Policy materially, we will email all workspace owners at least 7 days before the change takes effect.
                The effective date at the top of this page is bumped whenever there is any change. Past versions are available on request.
            </p>

            <h2>12. Grievance Officer</h2>
            <p>
                Per Rule 5(9) of the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011, and Section 8(10) of the DPDP Act 2023:
            </p>
            <ul>
                <li><strong>Name</strong>: {{ config('marketing.legal.grievance_officer_name') }}</li>
                <li><strong>Email</strong>: <a href="mailto:{{ config('marketing.legal.grievance_officer_email') }}">{{ config('marketing.legal.grievance_officer_email') }}</a></li>
                <li><strong>Address</strong>: {{ config('marketing.address_line') }}</li>
                <li><strong>Response time</strong>: within 7 working days.</li>
            </ul>

            <hr class="my-12">

            <div class="not-prose p-6 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-sm">
                <p class="font-semibold mb-2">Template notice</p>
                <p>
                    This is a first-draft template. Before launching to paying customers,
                    have it reviewed by an Indian SaaS lawyer for DPDP Act 2023 + IT Rules 2011 compliance,
                    and replace this notice with the lawyer's signed-off version.
                </p>
            </div>
        </article>
    </section>
@endsection
