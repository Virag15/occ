<?php

use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\CustomerShowController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProductShowController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ShipmentController;
use App\Http\Controllers\TransporterController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/', fn () => Inertia::render('Dashboard'))->name('dashboard');

    Route::get('/tasks', fn () => Inertia::render('Placeholder', [
        'title' => "Today's Tasks",
        'description' => 'Per-user action queue. Lands in Phase 2 alongside the Orders core.',
    ]))->name('tasks');

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
    Route::resource('orders', OrderController::class);
    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus'])->name('orders.update-status');
    Route::patch('/orders/{order}/toggle-lr-shared', [OrderController::class, 'toggleLrShared'])->name('orders.toggle-lr-shared');
    Route::patch('/orders/{order}/toggle-triplicate', [OrderController::class, 'toggleTriplicate'])->name('orders.toggle-triplicate');
    Route::patch('/orders/{order}/toggle-pod', [OrderController::class, 'togglePod'])->name('orders.toggle-pod');
    Route::patch('/orders/{order}/quick-update', [OrderController::class, 'quickUpdate'])->name('orders.quick-update');
    Route::post('/orders/{order}/evidence/{kind}', [OrderController::class, 'uploadEvidence'])
        ->whereIn('kind', ['pod', 'triplicate', 'lr', 'parcel'])
        ->name('orders.upload-evidence');

    // Shipments — nested under orders for create; flat for advance/destroy/slips
    Route::post('/orders/{order}/shipments', [ShipmentController::class, 'store'])->name('shipments.store');
    Route::patch('/shipments/{shipment}/advance/{target}', [ShipmentController::class, 'advance'])->whereIn('target', ['dispatched', 'delivered', 'cancelled'])->name('shipments.advance');
    Route::get('/shipments/{shipment}/picking-slip', [ShipmentController::class, 'pickingSlip'])->name('shipments.picking-slip');
    Route::get('/shipments/{shipment}/packing-slip', [ShipmentController::class, 'packingSlip'])->name('shipments.packing-slip');
    Route::delete('/shipments/{shipment}', [ShipmentController::class, 'destroy'])->name('shipments.destroy');

    Route::get('/returns', fn () => Inertia::render('Placeholder', [
        'title' => 'Returns & Damages',
        'description' => 'Case tracker for damaged-in-transit, manufacturing defects, etc. Lands in Phase 3.',
    ]))->name('returns.index');

    Route::get('/settings/integrations', fn () => Inertia::render('Placeholder', [
        'title' => 'Integrations',
        'description' => 'Tally bridge, WhatsApp provider, email setup. Phase 4.',
    ]))->name('settings.integrations');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

Route::get('/welcome', fn () => Inertia::render('Welcome', [
    'canLogin' => Route::has('login'),
    'canRegister' => Route::has('register'),
]));

require __DIR__.'/auth.php';
