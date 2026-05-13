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
        $q = trim((string) $request->query('q', ''));
        $statusFilter = (string) $request->query('status', '');
        $typeFilter = (string) $request->query('customer_type', '');
        $perPage = max(10, min(100, (int) $request->query('per_page', 50)));

        $paginated = Customer::query()
            ->when($q !== '', fn ($qq) => $qq->where(function ($w) use ($q) {
                $w->where('name', 'like', "%{$q}%")
                    ->orWhere('company', 'like', "%{$q}%")
                    ->orWhere('gstin', 'like', "%{$q}%")
                    ->orWhere('phone', 'like', "%{$q}%")
                    ->orWhere('city', 'like', "%{$q}%");
            }))
            ->when($statusFilter !== '', fn ($qq) => $qq->where('status', $statusFilter))
            ->when($typeFilter !== '', fn ($qq) => $qq->where('customer_type', $typeFilter))
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('Customers/Index', [
            'rows' => $paginated->items(),
            'pagination' => [
                'total' => $paginated->total(),
                'per_page' => $paginated->perPage(),
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'from' => $paginated->firstItem(),
                'to' => $paginated->lastItem(),
            ],
            'filters' => [
                'q' => $q,
                'status' => $statusFilter,
                'customer_type' => $typeFilter,
                'per_page' => $perPage,
            ],
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
