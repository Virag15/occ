<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Read-only — customers come from the Tally sync bridge. No create/update/delete here.
 */
class CustomerController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Customer::query();

        if ($q = $request->string('q')->trim()->value()) {
            $query->where(function ($w) use ($q) {
                $w->where('name', 'like', "%{$q}%")
                    ->orWhere('company', 'like', "%{$q}%")
                    ->orWhere('gstin', 'like', "%{$q}%")
                    ->orWhere('phone', 'like', "%{$q}%")
                    ->orWhere('city', 'like', "%{$q}%");
            });
        }

        $rows = $query->orderBy('name')->paginate(50)->withQueryString();

        $peek = null;
        if ($peekId = $request->integer('peek')) {
            $peek = Customer::find($peekId);
        }

        return Inertia::render('Customers/Index', [
            'rows' => $rows->items(),
            'pagination' => [
                'total' => $rows->total(),
                'per_page' => $rows->perPage(),
                'current_page' => $rows->currentPage(),
                'last_page' => $rows->lastPage(),
            ],
            'filters' => ['q' => $q ?? ''],
            'peek' => $peek,
        ]);
    }
}
