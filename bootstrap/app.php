<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'role' => \App\Http\Middleware\EnsureRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->respond(function (\Symfony\Component\HttpFoundation\Response $response, \Throwable $exception, \Illuminate\Http\Request $request) {
            $status = $response->getStatusCode();

            // 419 = CSRF token expired (session timed out). Send the user to login with a flash.
            if ($status === 419) {
                return redirect()->guest(route('login'))
                    ->with('status', 'Your session has expired. Please sign in again.');
            }

            // Render the branded Inertia Error page for known HTTP errors.
            if ($request->header('X-Inertia') || (!$request->expectsJson() && in_array($status, [403, 404, 500, 503], true))) {
                return \Inertia\Inertia::render('Error', [
                    'status' => $status,
                    'message' => app()->hasDebugModeEnabled() && $status === 500 ? $exception->getMessage() : null,
                ])->toResponse($request)->setStatusCode($status);
            }

            return $response;
        });
    })->create();
