<?php

namespace App\Http\Controllers;

use App\Models\Transporter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TransporterController extends Controller
{
    public function index(Request $request): Response
    {
        $rows = Transporter::query()->orderBy('name')->get();

        return Inertia::render('Transporters/Index', [
            'rows' => $rows,
            'pagination' => ['total' => $rows->count(), 'per_page' => 50, 'current_page' => 1, 'last_page' => 1],
            'filters' => ['q' => $request->string('q')->value()],
            'peek' => null,
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

    public function store(Request $request): RedirectResponse
    {
        Transporter::create($this->validated($request));
        return redirect()->route('transporters.index');
    }

    public function update(Request $request, Transporter $transporter): RedirectResponse
    {
        $transporter->update($this->validated($request));
        return redirect()->route('transporters.index');
    }

    public function destroy(Transporter $transporter): RedirectResponse
    {
        $transporter->delete();
        return redirect()->route('transporters.index');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'primary_phone' => ['nullable', 'string', 'max:20'],
            'secondary_phone' => ['nullable', 'string', 'max:20'],
            'whatsapp' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'office_address' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:100'],
            'gstin' => ['nullable', 'string', 'max:15'],
            'avg_transit_days' => ['nullable', 'integer', 'min:0', 'max:30'],
            'cost_per_kg' => ['nullable', 'numeric', 'min:0'],
            'triplicate_reliability' => ['nullable', 'integer', 'between:1,5'],
            'payment_terms' => ['nullable', 'in:advance,weekly,fortnightly,monthly'],
            'status' => ['nullable', 'in:active,inactive'],
            'notes' => ['nullable', 'string'],
        ]);
    }
}
