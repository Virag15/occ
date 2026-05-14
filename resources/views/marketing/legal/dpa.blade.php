@extends('marketing.layout')

@section('title', 'Data processing agreement')
@section('description', 'The data processing terms between OCC and our customers. India DPDP Act 2023 compliant.')

@section('content')
    <section class="py-24 border-b border-zinc-100">
        <div class="mx-auto max-w-3xl px-6 lg:px-8">
            <p class="text-[13px] uppercase tracking-wider text-zinc-400 mb-4">Legal</p>
            <h1 class="text-5xl sm:text-6xl font-semibold text-zinc-900 tracking-tight leading-[1.05]">
                Data processing agreement
            </h1>
            <p class="mt-6 text-sm text-zinc-500">
                Effective {{ config('marketing.legal.effective_date') }}
            </p>
        </div>
    </section>

    <section class="py-16">
        <article class="mx-auto max-w-3xl px-6 lg:px-8 prose prose-zinc max-w-none prose-headings:tracking-tight prose-headings:font-semibold prose-h2:mt-12 prose-h2:text-2xl prose-h3:text-lg prose-p:leading-relaxed prose-li:leading-relaxed prose-table:text-sm">

            <p class="lead text-zinc-600">
                This Data Processing Agreement (&ldquo;DPA&rdquo;) supplements our
                <a href="{{ url('/terms') }}">Terms of Service</a>
                and forms part of the agreement between you (the &ldquo;Data Fiduciary&rdquo;, your customers'
                personal data sits in your workspace) and
                {{ config('marketing.company_name') }} (the &ldquo;Data Processor&rdquo;, we process that data on your behalf).
                Under the DPDP Act 2023, you remain accountable for your customers' data;
                we process it strictly per your instructions.
            </p>

            <h2>1. Roles</h2>
            <ul>
                <li><strong>You</strong> are the Data Fiduciary. You decide what personal data to collect about your customers, why, and how long to keep it.</li>
                <li><strong>We</strong> are a Data Processor (and, for our own employees and marketing leads, a Data Fiduciary in our own right — that's covered in our <a href="{{ url('/privacy') }}">Privacy Policy</a>).</li>
            </ul>

            <h2>2. Scope of processing</h2>
            <p>We process your data only to:</p>
            <ul>
                <li>Provide the Service per the Terms of Service.</li>
                <li>Comply with your reasonable written instructions.</li>
                <li>Comply with applicable Indian law.</li>
            </ul>
            <p>We will not use your data for our own product analytics, training of AI/ML models, advertising, or anything else without your explicit consent.</p>

            <h2>3. Types of data we process</h2>
            <table>
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Examples</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Customer master data</td>
                        <td>Name, company, GSTIN, contact person, phone, WhatsApp number, email, billing/delivery addresses</td>
                    </tr>
                    <tr>
                        <td>Order data</td>
                        <td>Order codes, line items, quantities, prices, dates, status, internal notes</td>
                    </tr>
                    <tr>
                        <td>Payment data</td>
                        <td>Amount, mode, UTR/reference, paid-on date. No card numbers, no UPI handles — we do not process payments.</td>
                    </tr>
                    <tr>
                        <td>Evidence</td>
                        <td>Photos of POD, triplicate, LR copies, parcel</td>
                    </tr>
                    <tr>
                        <td>Audit + activity log</td>
                        <td>User who changed what, when</td>
                    </tr>
                </tbody>
            </table>

            <h2>4. Sub-processors</h2>
            <p>We use the following sub-processors. By using the Service, you authorise these:</p>
            <table>
                <thead>
                    <tr>
                        <th>Sub-processor</th>
                        <th>Purpose</th>
                        <th>Region</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td>Managed Postgres (Supabase / Neon / RDS — pick one at deploy)</td><td>Primary database</td><td>India</td></tr>
                    <tr><td>S3-compatible object storage (Cloudflare R2 / AWS S3)</td><td>Evidence file storage</td><td>India (ap-south)</td></tr>
                    <tr><td>Resend / Amazon SES</td><td>Transactional email</td><td>EU / global edge</td></tr>
                    <tr><td>AiSensy</td><td>WhatsApp Business API gateway (only if you enable WhatsApp updates)</td><td>India</td></tr>
                    <tr><td>AWS Textract / Google Document AI</td><td>OCR for evidence photos (only if you enable OCR)</td><td>ap-south-1 / global</td></tr>
                    <tr><td>Sentry (or similar)</td><td>Error tracking (technical metadata only, no business data)</td><td>EU/US</td></tr>
                </tbody>
            </table>
            <p>
                We will give you 30 days' notice before adding a new sub-processor or replacing an existing one.
                You may object to a new sub-processor and terminate the agreement if your objection is on reasonable data-protection grounds.
            </p>

            <h2>5. Security measures</h2>
            <p>We implement and maintain, at minimum:</p>
            <ul>
                <li>TLS 1.3 in transit; AES-256 at rest for backups.</li>
                <li>Per-workspace data isolation enforced at the query layer, with automated tests proving isolation in CI.</li>
                <li>Passwords hashed (bcrypt); bridge tokens hashed (SHA-256); API tokens rate-limited.</li>
                <li>Two-factor authentication available for all users; required for owner role.</li>
                <li>Daily encrypted backups; restore procedure tested monthly.</li>
                <li>Audit log per Companies Act 2013 — every mutation recorded.</li>
                <li>Vulnerability fix SLA: critical within 7 days, high within 30 days, others quarterly.</li>
                <li>Documented incident-response runbook; security training for staff.</li>
            </ul>

            <h2>6. Personnel</h2>
            <p>
                Only authorised staff have access to your data and only to the extent needed to provide support.
                All staff are under written confidentiality obligations that survive termination of their engagement with us.
                We log staff access to customer data.
            </p>

            <h2>7. Data subject requests</h2>
            <p>
                If your customer asks us to access, correct, or delete data we hold about them, we will forward the request to you within 7 working days
                and will not respond directly unless you ask us to. You remain responsible for fulfilling the request as the Data Fiduciary.
                We will assist you reasonably and at no extra charge for routine requests.
            </p>

            <h2>8. Data breach notification</h2>
            <p>
                We will notify you of any personal-data breach affecting your workspace without undue delay,
                and in any case within 72 hours of becoming aware of the breach. The notification will include:
            </p>
            <ul>
                <li>Nature and extent of the breach.</li>
                <li>Likely consequences.</li>
                <li>Measures we have taken or propose to take.</li>
                <li>Contact details for follow-up.</li>
            </ul>
            <p>You remain responsible for any notifications to your customers and to the Data Protection Board of India under Section 8(6) of the DPDP Act 2023.</p>

            <h2>9. Returns and deletion</h2>
            <p>
                At any time during the agreement, you may export your data via the in-app export tools.
                On termination, we will:
            </p>
            <ul>
                <li>Provide a final export on request (delivered within 14 days).</li>
                <li>Retain your data for 30 days for re-activation.</li>
                <li>Permanently delete all your data after the 30-day window, except as required to retain by law (e.g. audit logs, financial records).</li>
                <li>Confirm deletion in writing on request.</li>
            </ul>

            <h2>10. Audits</h2>
            <p>
                On reasonable written notice (at least 30 days), no more than once per year, you may request:
            </p>
            <ul>
                <li>A copy of our most recent third-party security report (if available).</li>
                <li>Answers to a written security questionnaire covering the measures in Section 5.</li>
            </ul>
            <p>
                On-site audits are available with prior agreement, at your expense, subject to confidentiality and
                during normal business hours. We may charge our reasonable costs for extensive audit support.
            </p>

            <h2>11. Liability</h2>
            <p>
                The liability cap in our Terms of Service applies to this DPA.
                For clarity, this DPA does not increase or change the liability cap.
            </p>

            <h2>12. Governing law</h2>
            <p>
                Governed by Indian law. Disputes resolved per the dispute clause in the Terms of Service.
            </p>

            <h2>13. Contact</h2>
            <p>
                Data Protection contact: <a href="mailto:{{ config('marketing.legal.grievance_officer_email') }}">{{ config('marketing.legal.grievance_officer_email') }}</a>
                (Grievance Officer: {{ config('marketing.legal.grievance_officer_name') }}).
            </p>

            <hr class="my-12">

            <div class="not-prose p-6 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-sm">
                <p class="font-semibold mb-2">Template notice</p>
                <p>
                    First-draft template. Before binding any customer, have an Indian SaaS lawyer review for
                    DPDP Act 2023 compliance, validate the sub-processor list reflects your actual deployment,
                    and adjust the security commitments in Section 5 to what you can actually deliver.
                    Replace this notice with the lawyer's signed-off version.
                </p>
            </div>
        </article>
    </section>
@endsection
