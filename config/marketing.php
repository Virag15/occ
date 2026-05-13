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
];
