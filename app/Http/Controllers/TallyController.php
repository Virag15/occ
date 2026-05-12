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
            'type' => ['required', Rule::in(['customers', 'products', 'stock', 'sales_vouchers', 'purchase_vouchers', 'orders', 'payments', 'all', 'reconcile'])],
            'direction' => ['nullable', Rule::in(['pull', 'push'])],
        ]);

        $userId = Auth::id();
        $direction = $data['direction'] ?? 'pull';

        match (true) {
            $data['type'] === 'reconcile' => $svc->reconcile($userId),
            $data['type'] === 'all' && $direction === 'pull' => $svc->syncAll($userId),
            $direction === 'push' && $data['type'] === 'customers' => $svc->pushCustomers($userId),
            $direction === 'push' && $data['type'] === 'orders' => $svc->pushOrders($userId),
            $direction === 'push' && $data['type'] === 'payments' => $svc->pushPayments($userId),
            $data['type'] === 'customers' => $svc->syncCustomers($userId),
            $data['type'] === 'products' => $svc->syncProducts($userId),
            $data['type'] === 'stock' => $svc->syncStock($userId),
            $data['type'] === 'sales_vouchers' => $svc->syncSalesVouchers($userId),
            $data['type'] === 'purchase_vouchers' => $svc->syncPurchaseVouchers($userId),
            default => null,
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
