<?php

namespace App\Http\Controllers;

use App\Models\TallySyncLog;
use App\Services\Tally\TallyClient;
use App\Services\Tally\TallySyncService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class TallyController extends Controller
{
    public function index(TallyClient $client): Response
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

        return Inertia::render('Settings/Integrations', [
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

    /**
     * Stream a zip of the Windows bridge scripts (tally-bridge.bat,
     * register-startup.bat, unregister-startup.bat, README.md) so the
     * user can drop them into their OCC install folder on the same PC
     * that runs TallyPrime and have a one-click bridge daemon.
     *
     * No persistence — we build the zip in a tmp file on each download
     * so changes to resources/tally-bridge/* are picked up immediately.
     */
    public function downloadBridge(): BinaryFileResponse
    {
        $source = resource_path('tally-bridge');
        abort_unless(is_dir($source), 404, 'Tally bridge resources missing.');

        $tmp = tempnam(sys_get_temp_dir(), 'occ-tally-bridge-').'.zip';
        $zip = new \ZipArchive;
        if ($zip->open($tmp, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
            abort(500, 'Could not create zip archive.');
        }
        foreach (new \DirectoryIterator($source) as $file) {
            if ($file->isDot() || ! $file->isFile()) {
                continue;
            }
            $zip->addFile($file->getPathname(), $file->getFilename());
        }
        $zip->close();

        return response()->download($tmp, 'occ-tally-bridge.zip', [
            'Content-Type' => 'application/zip',
        ])->deleteFileAfterSend(true);
    }
}
