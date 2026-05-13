<?php

namespace App\Providers;

use App\Listeners\LogAuthEvents;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ReturnCase;
use App\Models\Transporter;
use App\Models\User;
use App\Observers\AuditObserver;
use App\Observers\TallyOrderObserver;
use App\Observers\TallyPaymentObserver;
use App\Tenancy\TenantContext;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Tenant context is request-scoped on web, process-scoped on console.
        // Singleton so middleware writes and Eloquent global scope reads
        // agree on a single instance.
        $this->app->singleton(TenantContext::class);
    }

    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // Force HTTPS for all generated URLs in production. Stops mixed-content
        // and accidental http:// redirects when behind a TLS-terminating proxy.
        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }

        // Centralized audit logging — every CRUD on these models writes an audit_logs row.
        Customer::observe(AuditObserver::class);
        Product::observe(AuditObserver::class);
        Transporter::observe(AuditObserver::class);
        Order::observe(AuditObserver::class);
        OrderItem::observe(AuditObserver::class);
        User::observe(AuditObserver::class);
        ReturnCase::observe(AuditObserver::class);

        // Tally auto-push — when an order is delivered/closed or a payment is recorded,
        // automatically push the corresponding voucher to Tally (or demo mode).
        Order::observe(TallyOrderObserver::class);
        Payment::observe(TallyPaymentObserver::class);

        // Auth events — login, logout, failed login.
        Event::listen(Login::class, [LogAuthEvents::class, 'handleLogin']);
        Event::listen(Logout::class, [LogAuthEvents::class, 'handleLogout']);
        Event::listen(Failed::class, [LogAuthEvents::class, 'handleFailed']);
    }
}
