<?php

/**
 * OCC-specific config keys. Anything that's switching app behavior at runtime
 * lives here so config:cache works (env() outside config returns null when the
 * config is cached).
 */
return [
    // B2B internal tool — public registration is off in prod. Flip via
    // ALLOW_PUBLIC_REGISTRATION=true in .env (dev only).
    'allow_public_registration' => env('ALLOW_PUBLIC_REGISTRATION', false),
];
