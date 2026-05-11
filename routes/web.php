<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/', fn () => Inertia::render('Dashboard'))->name('dashboard');

    Route::get('/tasks', fn () => Inertia::render('Placeholder', [
        'title' => "Today's Tasks",
        'description' => 'Per-user action queue. Lands in Phase 2 alongside the Orders core.',
    ]))->name('tasks');

    Route::get('/customers', fn () => Inertia::render('Placeholder', [
        'title' => 'Customers',
        'description' => 'Read-only mirror from Tally. The DatabaseTable view lands in Phase 1.',
    ]))->name('customers.index');

    Route::get('/products', fn () => Inertia::render('Placeholder', [
        'title' => 'Products',
        'description' => 'Read-only mirror from Tally with stock-on-hand per godown.',
    ]))->name('products.index');

    Route::get('/orders', fn () => Inertia::render('Placeholder', [
        'title' => 'Orders & Dispatches',
        'description' => 'Full order lifecycle: table, kanban, dispatch calendar. Lands in Phase 2.',
    ]))->name('orders.index');

    Route::get('/transporters', fn () => Inertia::render('Placeholder', [
        'title' => 'Transporters',
        'description' => 'Master list of carriers. CRUD lands in Phase 1.',
    ]))->name('transporters.index');

    Route::get('/returns', fn () => Inertia::render('Placeholder', [
        'title' => 'Returns & Damages',
        'description' => 'Case tracker for damaged-in-transit, manufacturing defects, etc. Lands in Phase 3.',
    ]))->name('returns.index');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// Redirect unauthed root to login
Route::get('/welcome', fn () => Inertia::render('Welcome', [
    'canLogin' => Route::has('login'),
    'canRegister' => Route::has('register'),
]));

require __DIR__.'/auth.php';
