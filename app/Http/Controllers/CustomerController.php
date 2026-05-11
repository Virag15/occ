<?php

namespace App\Http\Controllers;

use App\Jobs\SyncEntityToTally;
use App\Models\Customer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    public function index(Request $request): Response
    {
        $rows = Customer::query()->orderBy('name')->get();

        return Inertia::render('Customers/Index', [
            'rows' => $rows,
            'pagination' => ['total' => $rows->count(), 'per_page' => 50, 'current_page' => 1, 'last_page' => 1],
            'filters' => ['q' => $request->string('q')->value()],
            'peek' => null,
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

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);
        // Webapp-created customers get a synthetic tally_id until the bridge assigns a real one.
        $data['tally_id'] ??= 'LOCAL-' . Str::upper(Str::random(10));

        $customer = Customer::create($data);
        SyncEntityToTally::dispatch($customer, 'created');

        return redirect()->route('customers.index');
    }

    public function update(Request $request, Customer $customer): RedirectResponse
    {
        $customer->update($this->validated($request));
        SyncEntityToTally::dispatch($customer, 'updated');

        return redirect()->route('customers.index');
    }

    public function destroy(Customer $customer): RedirectResponse
    {
        SyncEntityToTally::dispatch($customer, 'deleted');
        $customer->delete();

        return redirect()->route('customers.index');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'company' => ['nullable', 'string', 'max:255'],
            'gstin' => ['nullable', 'string', 'max:15'],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
            'whatsapp' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'billing_address' => ['nullable', 'string'],
            'delivery_address' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'payment_terms' => ['nullable', 'in:advance,cod,7_days,15_days,30_days,45_days,60_days'],
            'credit_limit' => ['nullable', 'numeric', 'min:0'],
            'customer_type' => ['nullable', 'in:dealer,contractor,oem,end_user,government'],
            'status' => ['nullable', 'in:active,inactive,credit_hold,new'],
            'notes' => ['nullable', 'string'],
        ]);
    }
}
