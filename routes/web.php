<?php

use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\CustomerShowController;
use App\Http\Controllers\DailyReportController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProductShowController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReturnController;
use App\Http\Controllers\SavedViewController;
use App\Http\Controllers\TallyController;
use App\Http\Controllers\ShipmentController;
use App\Http\Controllers\TasksController;
use App\Http\Controllers\TransporterController;
use App\Http\Controllers\TransporterShowController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware(['auth', 'verified'])->group(function () {
    // ───── Read routes — open to every authed role ────────────────────────
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/tasks', [TasksController::class, 'index'])->name('tasks');
    Route::get('/warehouse', [\App\Http\Controllers\WarehouseController::class, 'index'])->name('warehouse.queue');
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
        Route::get('/settings/company', [\App\Http\Controllers\CompanySettingController::class, 'edit'])->name('settings.company');
        Route::post('/settings/company', [\App\Http\Controllers\CompanySettingController::class, 'update'])->name('settings.company.update');
        Route::get('/settings/integrations', [TallyController::class, 'index'])->name('settings.integrations');
        Route::post('/settings/tally/sync', [TallyController::class, 'sync'])->name('settings.tally.sync');
        Route::post('/settings/tally/ping', [TallyController::class, 'ping'])->name('settings.tally.ping');
    });

    // Profile is always self-managed
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

Route::get('/welcome', fn () => Inertia::render('Welcome', [
    'canLogin' => Route::has('login'),
    'canRegister' => Route::has('register'),
]));

// Public order tracking — unguessable UUID acts as the access token. No auth.
Route::get('/track/{uuid}', [\App\Http\Controllers\TrackingController::class, 'show'])
    ->where('uuid', '[0-9a-fA-F-]{36}')
    ->name('tracking.show');

require __DIR__.'/auth.php';
