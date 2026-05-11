<?php

use App\Http\Controllers\CustomerController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\TransporterController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/', fn () => Inertia::render('Dashboard'))->name('dashboard');

    Route::get('/tasks', fn () => Inertia::render('Placeholder', [
        'title' => "Today's Tasks",
        'description' => 'Per-user action queue. Lands in Phase 2 alongside the Orders core.',
    ]))->name('tasks');

    Route::resource('customers', CustomerController::class)->except(['show']);
    Route::resource('products', ProductController::class)->except(['show']);
    Route::resource('transporters', TransporterController::class)->except(['show']);
    Route::resource('orders', OrderController::class)->except(['show']);

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
