<?php

use App\Http\Middleware\EnsurePlatformAdmin;
use App\Http\Middleware\EnsureRole;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\SetCurrentTenant;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->web(append: [
            // SetCurrentTenant runs after auth so Auth::user() is populated
            // when it tries to resolve the tenant. Must come BEFORE
            // HandleInertiaRequests so shared props can include tenant info.
            SetCurrentTenant::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            SecurityHeaders::class,
        ]);

        $middleware->alias([
            'role' => EnsureRole::class,
            'platform_admin' => EnsurePlatformAdmin::class,
        ]);

        // Trust forwarded headers when running behind a load balancer / CDN.
        // TRUSTED_PROXIES=* in .env makes every X-Forwarded-* header honoured
        // (use only when traffic to the app port is firewalled to the LB).
        // For a specific CIDR, set TRUSTED_PROXIES=10.0.0.0/8,172.16.0.0/12.
        $proxies = (string) env('TRUSTED_PROXIES', '');
        if ($proxies !== '') {
            $middleware->trustProxies(
                at: $proxies === '*' ? '*' : array_map('trim', explode(',', $proxies)),
                headers: Request::HEADER_X_FORWARDED_FOR
                    | Request::HEADER_X_FORWARDED_HOST
                    | Request::HEADER_X_FORWARDED_PORT
                    | Request::HEADER_X_FORWARDED_PROTO
                    | Request::HEADER_X_FORWARDED_AWS_ELB,
            );
        }
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->respond(function (Response $response, Throwable $exception, Request $request) {
            $status = $response->getStatusCode();

            // 419 = CSRF token expired (session timed out). Send the user to login with a flash.
            if ($status === 419) {
                return redirect()->guest(route('login'))
                    ->with('status', 'Your session has expired. Please sign in again.');
            }

            // Only intercept genuine error pages (4xx/5xx) — and ONLY for
            // non-JSON, non-Inertia document requests. Crucially we must
            // NOT touch:
            //   • redirects (3xx) — normal post/redirect/get flow
            //   • 409 — Inertia's asset-version bump (client self-reloads)
            //   • 422 — validation (Inertia renders errors on the form)
            //   • XHR / Inertia / JSON requests — the client handles those
            // The previous condition rendered the branded Error page for
            // ANY status whenever the X-Inertia header was present, which
            // turned ordinary 302/409 responses into a scary "Unexpected
            // error" screen.
            $isErrorStatus = $status >= 400 && ! in_array($status, [409, 419, 422], true);
            $wantsHtmlDocument = ! $request->expectsJson()
                && ! $request->header('X-Inertia')
                && ! $request->ajax();

            if ($isErrorStatus && $wantsHtmlDocument) {
                return Inertia::render('Error', [
                    'status' => $status,
                    'debug' => app()->hasDebugModeEnabled() && $status >= 500
                        ? $exception->getMessage()
                        : null,
                ])->toResponse($request)->setStatusCode($status);
            }

            return $response;
        });
    })->create();
