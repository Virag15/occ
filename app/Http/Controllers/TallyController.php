<?php

namespace App\Http\Controllers;

use App\Models\TallySyncLog;
use App\Services\Tally\TallyClient;
use App\Services\Tally\TallySyncService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class TallyController extends Controller
{
    public function index(TallyClient $client): \Inertia\Response
    {
        $logs = TallySyncLog::query()
            ->with('trigger:id,name')
            ->orderByDesc('id')
            ->limit(15)
            ->get();

        $byEntity = TallySyncLog::query()
            ->selectRaw('entity_type, MAX(completed_at) as last_at')
            ->groupBy('entity_type')
            ->pluck('last_at', 'entity_type');

        return \Inertia\Inertia::render('Settings/Integrations', [
            'tally' => $client->summary(),
            'tally_logs' => $logs,
            'tally_last_synced' => $byEntity,
        ]);
    }

    public function sync(Request $request, TallySyncService $svc): RedirectResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(['customers', 'products', 'stock', 'all'])],
        ]);

        $userId = Auth::id();

        match ($data['type']) {
            'customers' => $svc->syncCustomers($userId),
            'products' => $svc->syncProducts($userId),
            'stock' => $svc->syncStock($userId),
            'all' => $svc->syncAll($userId),
        };

        return back();
    }

    public function ping(TallyClient $client): RedirectResponse
    {
        $ok = $client->isEnabled() ? $client->ping() : false;
        return back()->with('tally_ping', [
            'enabled' => $client->isEnabled(),
            'ok' => $ok,
            'checked_at' => now()->toIso8601String(),
        ]);
    }
}
