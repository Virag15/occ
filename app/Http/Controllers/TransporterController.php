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
        $query = Transporter::query();

        if ($q = $request->string('q')->trim()->value()) {
            $query->where(function ($w) use ($q) {
                $w->where('name', 'like', "%{$q}%")
                    ->orWhere('city', 'like', "%{$q}%")
                    ->orWhere('contact_person', 'like', "%{$q}%")
                    ->orWhere('primary_phone', 'like', "%{$q}%");
            });
        }

        $rows = $query->orderBy('name')->paginate(50)->withQueryString();

        $peek = null;
        if ($peekId = $request->integer('peek')) {
            $peek = Transporter::find($peekId);
        }

        return Inertia::render('Transporters/Index', [
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

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);

        $transporter = Transporter::create($data);

        return redirect()->route('transporters.index', ['peek' => $transporter->id]);
    }

    public function update(Request $request, Transporter $transporter): RedirectResponse
    {
        $data = $this->validated($request);

        $transporter->update($data);

        return back();
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
            'areas_served' => ['nullable', 'array'],
            'vehicle_types' => ['nullable', 'array'],
            'avg_transit_days' => ['nullable', 'integer', 'min:0', 'max:30'],
            'cost_per_kg' => ['nullable', 'numeric', 'min:0'],
            'triplicate_reliability' => ['nullable', 'integer', 'between:1,5'],
            'payment_terms' => ['nullable', 'in:advance,weekly,fortnightly,monthly'],
            'status' => ['nullable', 'in:active,inactive'],
            'notes' => ['nullable', 'string'],
        ]);
    }
}
