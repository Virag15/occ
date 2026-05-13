<?php

use App\Http\Middleware\EnsureRole;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SecurityHeaders;
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
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            SecurityHeaders::class,
        ]);

        $middleware->alias([
            'role' => EnsureRole::class,
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

            // Render the branded Inertia Error page for known HTTP errors.
            if ($request->header('X-Inertia') || (! $request->expectsJson() && in_array($status, [403, 404, 500, 503], true))) {
                return Inertia::render('Error', [
                    'status' => $status,
                    'message' => app()->hasDebugModeEnabled() && $status === 500 ? $exception->getMessage() : null,
                ])->toResponse($request)->setStatusCode($status);
            }

            return $response;
        });
    })->create();
