<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTransporterRequest;
use App\Http\Requests\UpdateTransporterRequest;
use App\Models\Transporter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TransporterController extends Controller
{
    public function index(Request $request): Response
    {
        $q = trim((string) $request->query('q', ''));
        $statusFilter = (string) $request->query('status', '');
        $perPage = max(10, min(100, (int) $request->query('per_page', 50)));

        $paginated = Transporter::query()
            ->when($q !== '', fn ($qq) => $qq->where(function ($w) use ($q) {
                $w->where('name', 'like', "%{$q}%")
                    ->orWhere('transporter_code', 'like', "%{$q}%")
                    ->orWhere('contact_person', 'like', "%{$q}%")
                    ->orWhere('city', 'like', "%{$q}%")
                    ->orWhere('primary_phone', 'like', "%{$q}%");
            }))
            ->when($statusFilter !== '', fn ($qq) => $qq->where('status', $statusFilter))
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('Transporters/Index', [
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
                'per_page' => $perPage,
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Transporters/Create');
    }

    public function edit(Transporter $transporter): Response
    {
        return Inertia::render('Transporters/Edit', ['transporter' => $transporter]);
    }

    public function store(StoreTransporterRequest $request): RedirectResponse
    {
        Transporter::create($request->validated());

        return redirect()->route('transporters.index');
    }

    public function update(UpdateTransporterRequest $request, Transporter $transporter): RedirectResponse
    {
        $transporter->update($request->validated());

        return redirect()->route('transporters.index');
    }

    public function destroy(Transporter $transporter): RedirectResponse
    {
        $transporter->delete();

        return redirect()->route('transporters.index');
    }
}
