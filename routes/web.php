<?php

use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\CustomerShowController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProductShowController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReturnController;
use App\Http\Controllers\ShipmentController;
use App\Http\Controllers\TasksController;
use App\Http\Controllers\TransporterController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

    Route::get('/tasks', [TasksController::class, 'index'])->name('tasks');

    Route::resource('customers', CustomerController::class)->except(['show']);
    Route::get('/customers/{customer}', CustomerShowController::class)->name('customers.show');
    Route::resource('products', ProductController::class)->except(['show']);
    Route::get('/products/{product}', ProductShowController::class)->name('products.show');
    Route::resource('transporters', TransporterController::class)->except(['show']);

    // Admin-only — RBAC enforced via role middleware
    Route::middleware('role:owner,manager')->group(function () {
        Route::resource('users', UserController::class)->except(['show']);
        Route::get('/audit-logs', [AuditLogController::class, 'index'])->name('audit-logs.index');
    });
    // Bare literal routes must come BEFORE the resource so /{order} doesn't shadow them
    Route::get('/orders/price-history', [OrderController::class, 'priceHistory'])->name('orders.price-history');
    Route::resource('orders', OrderController::class);
    Route::get('/orders/{order}/invoice.pdf', [OrderController::class, 'invoicePdf'])->name('orders.invoice-pdf');
    Route::get('/orders/{order}/quotation.pdf', [OrderController::class, 'quotationPdf'])->name('orders.quotation-pdf');
    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus'])->name('orders.update-status');
    Route::patch('/orders/{order}/toggle-lr-shared', [OrderController::class, 'toggleLrShared'])->name('orders.toggle-lr-shared');
    Route::patch('/orders/{order}/toggle-triplicate', [OrderController::class, 'toggleTriplicate'])->name('orders.toggle-triplicate');
    Route::patch('/orders/{order}/toggle-pod', [OrderController::class, 'togglePod'])->name('orders.toggle-pod');
    Route::patch('/orders/{order}/quick-update', [OrderController::class, 'quickUpdate'])->name('orders.quick-update');
    Route::post('/orders/{order}/evidence/{kind}', [OrderController::class, 'uploadEvidence'])
        ->whereIn('kind', ['pod', 'triplicate', 'lr', 'parcel'])
        ->name('orders.upload-evidence');

    // Payments — multi-payment ledger per order. The legacy single payment fields
    // on orders are now derived from the sum of these rows.
    Route::post('/orders/{order}/payments', [PaymentController::class, 'store'])->name('payments.store');
    Route::delete('/payments/{payment}', [PaymentController::class, 'destroy'])->name('payments.destroy');

    // Shipments — nested under orders for create; flat for advance/destroy/slips
    Route::post('/orders/{order}/shipments', [ShipmentController::class, 'store'])->name('shipments.store');
    Route::patch('/shipments/{shipment}/advance/{target}', [ShipmentController::class, 'advance'])->whereIn('target', ['dispatched', 'delivered', 'cancelled'])->name('shipments.advance');
    Route::get('/shipments/{shipment}/picking-slip', [ShipmentController::class, 'pickingSlip'])->name('shipments.picking-slip');
    Route::get('/shipments/{shipment}/packing-slip', [ShipmentController::class, 'packingSlip'])->name('shipments.packing-slip');
    Route::delete('/shipments/{shipment}', [ShipmentController::class, 'destroy'])->name('shipments.destroy');

    // Returns (uses {returnCase} param to avoid the PHP `return` keyword clash)
    Route::get('/returns', [ReturnController::class, 'index'])->name('returns.index');
    Route::post('/returns', [ReturnController::class, 'store'])->name('returns.store');
    Route::get('/returns/{return}', [ReturnController::class, 'show'])->name('returns.show');
    Route::patch('/returns/{return}/start-inspection', [ReturnController::class, 'startInspection'])->name('returns.start-inspection');
    Route::patch('/returns/{return}/resolve', [ReturnController::class, 'resolve'])->name('returns.resolve');
    Route::patch('/returns/{return}/reject', [ReturnController::class, 'reject'])->name('returns.reject');

    Route::middleware('role:owner,manager')->group(function () {
        // Bare /settings → first item (Company). Keeps a stable canonical entry point.
        Route::get('/settings', fn () => redirect()->route('settings.company'))->name('settings.index');
        Route::get('/settings/company', [\App\Http\Controllers\CompanySettingController::class, 'edit'])->name('settings.company');
        Route::post('/settings/company', [\App\Http\Controllers\CompanySettingController::class, 'update'])->name('settings.company.update');
        Route::get('/settings/integrations', fn () => Inertia::render('Settings/Integrations'))->name('settings.integrations');
    });

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

Route::get('/welcome', fn () => Inertia::render('Welcome', [
    'canLogin' => Route::has('login'),
    'canRegister' => Route::has('register'),
]));

require __DIR__.'/auth.php';
