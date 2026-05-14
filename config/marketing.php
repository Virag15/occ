<?php

/**
 * Marketing site config. Values shown on the public marketing pages
 * (header, footer, contact CTA). Set in .env at deploy time; placeholders
 * below are obvious defaults to remind the operator to swap them.
 *
 * Domain, contact info, and brand voice were decided in the SaaS
 * positioning memo (2026-05-14): OCC by Delta System, "Contact us"
 * pricing, founder-led sales.
 */
return [
    // Used in <title>, hero, footer.
    'product_name' => env('MARKETING_PRODUCT_NAME', 'OCC'),
    'company_name' => env('MARKETING_COMPANY_NAME', 'Delta System'),

    // Reachable channels — visible on every page.
    'phone' => env('MARKETING_PHONE', '+91 00000 00000'),
    // wa.me link expects digits only, with country code, no plus.
    'whatsapp_number' => env('MARKETING_WHATSAPP', '910000000000'),
    'whatsapp_prefill' => env(
        'MARKETING_WHATSAPP_PREFILL',
        'Hi! I came from the OCC website and would like to know more.'
    ),
    'email' => env('MARKETING_EMAIL', 'hello@occ.in'),

    // Footer / trust signals.
    'address_line' => env('MARKETING_ADDRESS', 'Nashik, Maharashtra, India'),
    'gstin' => env('MARKETING_GSTIN', ''),

    // Used by SEO / canonical URL helper.
    'site_url' => env('MARKETING_SITE_URL', 'https://occ.in'),

    // Where new-lead notifications go. The email is the founder's inbox;
    // the Slack webhook (optional) pings a channel for instant awareness.
    // Both can be set or just one — empty means skip that channel.
    'notify_email' => env('MARKETING_NOTIFY_EMAIL', ''),
    'slack_webhook_url' => env('MARKETING_SLACK_WEBHOOK_URL', ''),

    // Legal pages — values referenced by privacy / terms / DPA templates.
    // The effective date should be bumped whenever policies change.
    'legal' => [
        'effective_date' => env('MARKETING_LEGAL_EFFECTIVE_DATE', '2026-05-14'),
        'jurisdiction' => env('MARKETING_JURISDICTION', 'Nashik, Maharashtra, India'),
        // DPDP Act 2023 + IT Rules 2011 require a named grievance officer
        // contactable for data-related complaints.
        'grievance_officer_name' => env('MARKETING_GRIEVANCE_OFFICER_NAME', 'Virag Bora'),
        'grievance_officer_email' => env('MARKETING_GRIEVANCE_OFFICER_EMAIL', 'privacy@occ.in'),
    ],
];
