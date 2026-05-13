<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCustomerRequest;
use App\Http\Requests\UpdateCustomerRequest;
use App\Jobs\SyncEntityToTally;
use App\Models\Customer;
use App\Models\SavedView;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    public function index(Request $request): Response
    {
        $cap = 500;
        $total = Customer::query()->count();
        $rows = Customer::query()->orderBy('name')->limit($cap)->get();

        return Inertia::render('Customers/Index', [
            'rows' => $rows,
            'total_count' => $total,
            'cap' => $cap,
            'pagination' => ['total' => $total, 'per_page' => $cap, 'current_page' => 1, 'last_page' => 1],
            'filters' => ['q' => $request->string('q')->value()],
            'peek' => null,
            'savedViews' => SavedView::query()
                ->where('user_id', Auth::id())
                ->where('database_type', 'customer')
                ->orderByDesc('is_default')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Customers/Create');
    }

    public function edit(Customer $customer): Response
    {
        return Inertia::render('Customers/Edit', ['customer' => $customer]);
    }

    public function store(StoreCustomerRequest $request): RedirectResponse
    {
        $data = $request->validated();
        // Webapp-created customers get a synthetic tally_id until the bridge assigns a real one.
        $data['tally_id'] ??= 'LOCAL-'.Str::upper(Str::random(10));

        $customer = Customer::create($data);
        SyncEntityToTally::dispatch($customer, 'created');

        return redirect()->route('customers.index');
    }

    public function update(UpdateCustomerRequest $request, Customer $customer): RedirectResponse
    {
        $customer->update($request->validated());
        SyncEntityToTally::dispatch($customer, 'updated');

        return redirect()->route('customers.index');
    }

    public function destroy(Customer $customer): RedirectResponse
    {
        SyncEntityToTally::dispatch($customer, 'deleted');
        $customer->delete();

        return redirect()->route('customers.index');
    }
}
