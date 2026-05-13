<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'tally' => [
        'enabled' => env('TALLY_ENABLED', false),
        'host' => env('TALLY_HOST', '127.0.0.1'),
        'port' => env('TALLY_PORT', 9000),
        'company' => env('TALLY_COMPANY', 'GC Communication'),
        'timeout' => env('TALLY_TIMEOUT', 30),
    ],

    'whatsapp' => [
        // Off = demo mode: sends are logged locally, no real network call.
        'enabled' => env('WHATSAPP_ENABLED', false),
        'api_key' => env('WHATSAPP_API_KEY', ''),
        'sender' => env('WHATSAPP_SENDER', 'GC Communication'),
        'endpoint' => env('WHATSAPP_ENDPOINT', 'https://backend.aisensy.com/campaign/t1/api/v2'),
    ],

    'ocr' => [
        // Off = demo mode: extract() returns canned values keyed by evidence kind.
        // Switch on by flipping OCR_ENABLED=true and picking a provider.
        'enabled' => env('OCR_ENABLED', false),
        'provider' => env('OCR_PROVIDER', 'demo'),  // demo | textract | gdai
        'api_key' => env('OCR_API_KEY', ''),
        'region' => env('OCR_REGION', 'ap-south-1'),
        // Document AI specifics — unused for textract / demo.
        'endpoint' => env('OCR_ENDPOINT', ''),
        'processor_id' => env('OCR_PROCESSOR_ID', ''),
    ],

];
