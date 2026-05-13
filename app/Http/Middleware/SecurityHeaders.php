<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Adds CSP + other defensive HTTP headers to every response. Skipped in
 * non-prod so Vite's HMR and Laravel debugbar keep working. In production
 * the CSP is intentionally strict — `unsafe-inline` only stays for styles
 * because Tailwind v4 + shadcn rely on inline style attributes.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Local dev: skip CSP so Vite HMR (port 5173) works without ceremony.
        if (! app()->environment('production')) {
            return $response;
        }

        $response->headers->set('Content-Security-Policy', $this->csp());
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
        // HSTS — tell the browser to refuse http:// for this host for one
        // year. Only set when the request was actually served over TLS,
        // so misconfigured envs don't lock users out.
        if ($request->isSecure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        return $response;
    }

    /**
     * Content-Security-Policy directives. Tuned for the OCC frontend:
     * - default-src 'self': everything from same origin
     * - script-src adds 'self' only — Inertia renders inline JSON inside
     *   data-page attributes, which is harmless; no inline <script> blocks
     *   are emitted by the app
     * - style-src allows 'unsafe-inline' for component-level style attrs
     *   (shadcn, Recharts inline styles). Hash-based CSP later.
     * - img-src 'self' data: for the base64 logos in PDFs preview
     * - connect-src 'self' wss: for future Reverb (websocket)
     */
    private function csp(): string
    {
        return implode('; ', [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline' https://fonts.bunny.net",
            "font-src 'self' https://fonts.bunny.net data:",
            "img-src 'self' data: blob:",
            "connect-src 'self' wss:",
            "frame-ancestors 'self'",
            "form-action 'self'",
            "base-uri 'self'",
        ]);
    }
}
