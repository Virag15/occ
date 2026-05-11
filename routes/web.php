<?php

use App\Http\Controllers\CustomerController;
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

    Route::get('/customers', [CustomerController::class, 'index'])->name('customers.index');
    Route::get('/products', [ProductController::class, 'index'])->name('products.index');

    Route::get('/orders', fn () => Inertia::render('Placeholder', [
        'title' => 'Orders & Dispatches',
        'description' => 'Full order lifecycle: table, kanban, dispatch calendar. Lands in Phase 2.',
    ]))->name('orders.index');

    Route::get('/transporters', [TransporterController::class, 'index'])->name('transporters.index');
    Route::post('/transporters', [TransporterController::class, 'store'])->name('transporters.store');
    Route::patch('/transporters/{transporter}', [TransporterController::class, 'update'])->name('transporters.update');
    Route::delete('/transporters/{transporter}', [TransporterController::class, 'destroy'])->name('transporters.destroy');

    Route::get('/returns', fn () => Inertia::render('Placeholder', [
        'title' => 'Returns & Damages',
        'description' => 'Case tracker for damaged-in-transit, manufacturing defects, etc. Lands in Phase 3.',
    ]))->name('returns.index');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

Route::get('/welcome', fn () => Inertia::render('Welcome', [
    'canLogin' => Route::has('login'),
    'canRegister' => Route::has('register'),
]));

require __DIR__.'/auth.php';
