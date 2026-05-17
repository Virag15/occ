<?php

use App\Http\Controllers\Admin\LeadController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\BrandLogoController;
use App\Http\Controllers\BridgeApiController;
use App\Http\Controllers\CompanySettingController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\CustomerShowController;
use App\Http\Controllers\DailyReportController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\MarketingController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProductShowController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\QuotationController;
use App\Http\Controllers\ReportsController;
use App\Http\Controllers\ReturnController;
use App\Http\Controllers\SavedViewController;
use App\Http\Controllers\ShipmentController;
use App\Http\Controllers\TallyController;
use App\Http\Controllers\TallyMappingController;
use App\Http\Controllers\TasksController;
use App\Http\Controllers\TrackingController;
use App\Http\Controllers\TransporterController;
use App\Http\Controllers\TransporterShowController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\WarehouseController;
use App\Http\Middleware\AuthenticateBridgeAgent;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// ───── Public marketing site ─────────────────────────────────────────
// Server-rendered Blade (no Inertia) — fast, SEO-friendly. `/` is the
// guest marketing home; authed users are redirected to /dashboard
// (the Inertia app). These MUST stay separate URLs: an Inertia XHR
// landing on a Blade page triggers Inertia's "non-Inertia response"
// white-modal overlay. The named 'dashboard' route is the Inertia
// /dashboard inside the auth group below.
Route::get('/', [MarketingController::class, 'home'])->name('marketing.home');
Route::get('/features', [MarketingController::class, 'features'])->name('marketing.features');
Route::get('/tally', [MarketingController::class, 'tally'])->name('marketing.tally');
Route::get('/pricing', [MarketingController::class, 'pricing'])->name('marketing.pricing');
Route::get('/about', [MarketingController::class, 'about'])->name('marketing.about');
Route::get('/contact', [MarketingController::class, 'contact'])->name('marketing.contact');
Route::post('/contact', [MarketingController::class, 'submitLead'])->name('marketing.contact.submit');
Route::get('/privacy', [MarketingController::class, 'privacy'])->name('marketing.privacy');
Route::get('/terms', [MarketingController::class, 'terms'])->name('marketing.terms');
Route::get('/dpa', [MarketingController::class, 'dpa'])->name('marketing.dpa');

Route::middleware(['auth', 'verified'])->group(function () {
    // ───── Read routes — open to every authed role ────────────────────────
    // /dashboard is the Inertia app entry. Role-based landing (warehouse →
    // queue, accounts → tasks) is enforced inside DashboardController::index.
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/tasks', [TasksController::class, 'index'])->name('tasks');
    Route::get('/warehouse', [WarehouseController::class, 'index'])->name('warehouse.queue');
    Route::get('/reports', [ReportsController::class, 'index'])->name('reports.index');
    Route::get('/reports/daily', [DailyReportController::class, 'show'])->name('reports.daily');

    // Saved views are scoped to the current user — every role manages their own
    Route::post('/saved-views', [SavedViewController::class, 'store'])->name('saved-views.store');
    Route::patch('/saved-views/{savedView}', [SavedViewController::class, 'update'])->name('saved-views.update');
    Route::delete('/saved-views/{savedView}', [SavedViewController::class, 'destroy'])->name('saved-views.destroy');

    Route::resource('customers', CustomerController::class)->only(['index', 'create', 'edit']);
    Route::get('/customers/{customer}', CustomerShowController::class)->name('customers.show');
    Route::resource('products', ProductController::class)->only(['index', 'create', 'edit']);
    Route::get('/products/{product}', ProductShowController::class)->name('products.show');
    Route::resource('transporters', TransporterController::class)->only(['index', 'create', 'edit']);
    Route::get('/transporters/{transporter}', TransporterShowController::class)->name('transporters.show');

    // Bare literal routes must come BEFORE the orders resource so /{order} doesn't shadow them
    Route::get('/orders/price-history', [OrderController::class, 'priceHistory'])->name('orders.price-history');
    Route::get('/orders/kanban', [OrderController::class, 'kanban'])->name('orders.kanban');
    Route::resource('orders', OrderController::class)->only(['index', 'show', 'create', 'edit']);
    Route::get('/orders/{order}/invoice.pdf', [OrderController::class, 'invoicePdf'])->name('orders.invoice-pdf');
    Route::get('/orders/{order}/quotation.pdf', [OrderController::class, 'quotationPdf'])->name('orders.quotation-pdf');
    Route::get('/orders/{order}/evidence/download', [OrderController::class, 'downloadEvidence'])->name('orders.evidence-download');

    Route::get('/returns', [ReturnController::class, 'index'])->name('returns.index');
    Route::get('/returns/{return}', [ReturnController::class, 'show'])->name('returns.show');

    // Quotations — standalone, no order needed. Reads open to all authed
    // roles; writes gated to owner/manager/accounts below.
    Route::get('/quotations', [QuotationController::class, 'index'])->name('quotations.index');
    Route::get('/quotations/create', [QuotationController::class, 'create'])->name('quotations.create');
    Route::get('/quotations/{quotation}', [QuotationController::class, 'show'])->name('quotations.show');
    Route::get('/quotations/{quotation}/edit', [QuotationController::class, 'edit'])->name('quotations.edit');
    Route::get('/quotations/{quotation}/pdf', [QuotationController::class, 'pdf'])->name('quotations.pdf');

    // Invoices — usually converted from a quotation; same template.
    Route::get('/invoices', [InvoiceController::class, 'index'])->name('invoices.index');
    Route::get('/invoices/{invoice}', [InvoiceController::class, 'show'])->name('invoices.show');
    Route::get('/invoices/{invoice}/pdf', [InvoiceController::class, 'pdf'])->name('invoices.pdf');

    // Literal route must precede /{shipment} bindings
    Route::get('/shipments/calendar', [ShipmentController::class, 'calendar'])->name('shipments.calendar');
    Route::get('/shipments/{shipment}/picking-slip', [ShipmentController::class, 'pickingSlip'])->name('shipments.picking-slip');
    Route::get('/shipments/{shipment}/packing-slip', [ShipmentController::class, 'packingSlip'])->name('shipments.packing-slip');

    // ───── Write routes — gated by role per RBAC matrix ───────────────────

    // Customers: owner, manager, accounts (matrix line 4)
    Route::middleware('role:owner,manager,accounts')->group(function () {
        Route::post('customers', [CustomerController::class, 'store'])->name('customers.store');
        Route::match(['put', 'patch'], 'customers/{customer}', [CustomerController::class, 'update'])->name('customers.update');
        Route::delete('customers/{customer}', [CustomerController::class, 'destroy'])->name('customers.destroy');

        // Quotation writes: owner/manager/accounts (sales-facing roles).
        Route::post('quotations', [QuotationController::class, 'store'])->name('quotations.store');
        Route::match(['put', 'patch'], 'quotations/{quotation}', [QuotationController::class, 'update'])->name('quotations.update');
        Route::post('quotations/{quotation}/email', [QuotationController::class, 'email'])->name('quotations.email');
        Route::patch('quotations/{quotation}/status', [QuotationController::class, 'updateStatus'])->name('quotations.update-status');
        Route::delete('quotations/{quotation}', [QuotationController::class, 'destroy'])->name('quotations.destroy');

        // Invoice writes: owner/manager/accounts.
        Route::post('quotations/{quotation}/convert', [InvoiceController::class, 'convert'])->name('quotations.convert');
        Route::post('invoices/{invoice}/email', [InvoiceController::class, 'email'])->name('invoices.email');
        Route::patch('invoices/{invoice}/status', [InvoiceController::class, 'updateStatus'])->name('invoices.update-status');
        Route::delete('invoices/{invoice}', [InvoiceController::class, 'destroy'])->name('invoices.destroy');
    });

    // Products + Transporters + full Order edits: owner, manager only
    Route::middleware('role:owner,manager')->group(function () {
        Route::post('products', [ProductController::class, 'store'])->name('products.store');
        Route::match(['put', 'patch'], 'products/{product}', [ProductController::class, 'update'])->name('products.update');
        Route::delete('products/{product}', [ProductController::class, 'destroy'])->name('products.destroy');

        Route::post('transporters', [TransporterController::class, 'store'])->name('transporters.store');
        Route::match(['put', 'patch'], 'transporters/{transporter}', [TransporterController::class, 'update'])->name('transporters.update');
        Route::delete('transporters/{transporter}', [TransporterController::class, 'destroy'])->name('transporters.destroy');

        // Bulk admin tags — priority / payment_status across many orders at once.
        // MUST come before the {order} routes so 'bulk' isn't interpreted as an id.
        Route::patch('/orders/bulk', [OrderController::class, 'bulkUpdate'])->name('orders.bulk-update');

        Route::post('orders', [OrderController::class, 'store'])->name('orders.store');
        Route::match(['put', 'patch'], 'orders/{order}', [OrderController::class, 'update'])->name('orders.update');
        Route::delete('orders/{order}', [OrderController::class, 'destroy'])->name('orders.destroy');
    });

    // Order status + dispatch/delivery actions: owner, manager, warehouse
    // (warehouse drives ready_for_dispatch → dispatched → delivered)
    Route::middleware('role:owner,manager,warehouse')->group(function () {
        Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus'])->name('orders.update-status');
        Route::patch('/orders/{order}/toggle-lr-shared', [OrderController::class, 'toggleLrShared'])->name('orders.toggle-lr-shared');
        Route::patch('/orders/{order}/toggle-triplicate', [OrderController::class, 'toggleTriplicate'])->name('orders.toggle-triplicate');
        Route::patch('/orders/{order}/toggle-pod', [OrderController::class, 'togglePod'])->name('orders.toggle-pod');
        Route::post('/orders/{order}/evidence/{kind}', [OrderController::class, 'uploadEvidence'])
            ->whereIn('kind', ['pod', 'triplicate', 'lr', 'parcel'])
            ->name('orders.upload-evidence');
        // OCR suggest endpoint — runs against a one-shot temp upload, returns
        // extracted field hints without persisting. UI calls this before the
        // real upload to pre-fill the form.
        Route::post('/orders/{order}/evidence/{kind}/extract', [OrderController::class, 'extractEvidence'])
            ->whereIn('kind', ['pod', 'triplicate', 'lr', 'parcel'])
            ->name('orders.extract-evidence');
    });

    // Quick-update: owner/manager full; accounts can hit payment fields; warehouse can hit
    // dispatch/delivery fields. The controller (OrderController::quickUpdate) filters the
    // editable field set per role — see P0.7.
    Route::middleware('role:owner,manager,accounts,warehouse')->group(function () {
        Route::patch('/orders/{order}/quick-update', [OrderController::class, 'quickUpdate'])->name('orders.quick-update');
    });

    // Payments: owner, manager, accounts
    Route::middleware('role:owner,manager,accounts')->group(function () {
        Route::post('/orders/{order}/payments', [PaymentController::class, 'store'])->name('payments.store');
        Route::delete('/payments/{payment}', [PaymentController::class, 'destroy'])->name('payments.destroy');
    });

    // Shipments: owner, manager, warehouse
    Route::middleware('role:owner,manager,warehouse')->group(function () {
        Route::post('/orders/{order}/shipments', [ShipmentController::class, 'store'])->name('shipments.store');
        Route::patch('/shipments/{shipment}/advance/{target}', [ShipmentController::class, 'advance'])
            ->whereIn('target', ['dispatched', 'delivered', 'cancelled'])
            ->name('shipments.advance');
        Route::delete('/shipments/{shipment}', [ShipmentController::class, 'destroy'])->name('shipments.destroy');
    });

    // Returns: all roles except viewer can act on cases
    Route::middleware('role:owner,manager,accounts,warehouse')->group(function () {
        Route::post('/returns', [ReturnController::class, 'store'])->name('returns.store');
        Route::patch('/returns/{return}/start-inspection', [ReturnController::class, 'startInspection'])->name('returns.start-inspection');
        Route::patch('/returns/{return}/resolve', [ReturnController::class, 'resolve'])->name('returns.resolve');
        Route::patch('/returns/{return}/reject', [ReturnController::class, 'reject'])->name('returns.reject');
    });

    // Admin: audit logs visible to owner+manager; users + settings to owner only
    Route::middleware('role:owner,manager')->group(function () {
        Route::get('/audit-logs', [AuditLogController::class, 'index'])->name('audit-logs.index');
    });

    Route::middleware('role:owner')->group(function () {
        Route::resource('users', UserController::class)->except(['show']);

        // Bare /settings → first item (Company). Keeps a stable canonical entry point.
        Route::get('/settings', fn () => redirect()->route('settings.company'))->name('settings.index');
        Route::get('/settings/company', [CompanySettingController::class, 'edit'])->name('settings.company');
        Route::post('/settings/company', [CompanySettingController::class, 'update'])->name('settings.company.update');
        Route::get('/settings/integrations', [TallyController::class, 'index'])->name('settings.integrations');
        Route::post('/settings/tally/sync', [TallyController::class, 'sync'])->name('settings.tally.sync');
        Route::post('/settings/tally/ping', [TallyController::class, 'ping'])->name('settings.tally.ping');
        Route::get('/settings/tally/download-bridge', [TallyController::class, 'downloadBridge'])->name('settings.tally.download-bridge');
        Route::get('/settings/tally-mapping', [TallyMappingController::class, 'edit'])->name('settings.tally-mapping');
        Route::post('/settings/tally-mapping', [TallyMappingController::class, 'update'])->name('settings.tally-mapping.update');

        // Brand logos — rendered on quotation/invoice PDFs.
        Route::get('/settings/branding', [BrandLogoController::class, 'index'])->name('settings.branding');
        Route::post('/settings/branding', [BrandLogoController::class, 'store'])->name('settings.branding.store');
        Route::delete('/settings/branding/{brandLogo}', [BrandLogoController::class, 'destroy'])->name('settings.branding.destroy');
    });

    // Profile is always self-managed
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // ───── Platform admin — only Delta System staff (is_platform_admin=true)
    // Distinct from tenant 'owner' role: this is the OCC SaaS pipeline,
    // not a tenant's own admin. Routes 403 for anyone without the flag.
    Route::middleware('platform_admin')->prefix('admin')->name('admin.')->group(function () {
        Route::get('/leads', [LeadController::class, 'index'])->name('leads.index');
        Route::patch('/leads/{lead}', [LeadController::class, 'update'])->name('leads.update');
        Route::post('/leads/{lead}/provision', [LeadController::class, 'provision'])->name('leads.provision');
    });
});

Route::get('/welcome', fn () => Inertia::render('Welcome', [
    'canLogin' => Route::has('login'),
    'canRegister' => Route::has('register'),
]));

// Public order tracking — unguessable UUID acts as the access token. No auth.
Route::get('/track/{uuid}', [TrackingController::class, 'show'])
    ->where('uuid', '[0-9a-fA-F-]{36}')
    ->name('tracking.show');

// Bridge API — bearer-token auth done inside BridgeApiController. No
// session middleware, no CSRF (server-to-server JSON). The agent calls
// these endpoints from a different machine (the Windows PC next to
// TallyPrime) to pull operations queued on the cloud OCC.
//
// Rate-limited as defense-in-depth even though the token is unguessable —
// 120 req/min is plenty for one agent polling every 60s with bursty
// complete/fail traffic, and well below what brute-force probing needs.
Route::prefix('api/bridge')
    ->middleware(['throttle:120,1', AuthenticateBridgeAgent::class])
    ->withoutMiddleware([VerifyCsrfToken::class])
    ->group(function () {
        Route::get('/ping', [BridgeApiController::class, 'ping']);
        Route::post('/claim', [BridgeApiController::class, 'claim']);
        Route::post('/complete/{id}', [BridgeApiController::class, 'complete']);
        Route::post('/fail/{id}', [BridgeApiController::class, 'fail']);
    });

require __DIR__.'/auth.php';
