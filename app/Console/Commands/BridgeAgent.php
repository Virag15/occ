<?php

namespace App\Console\Commands;

use App\Services\Tally\TallyClient;
use Illuminate\Console\Command;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

/**
 * Bridge agent — the cloud-OCC ↔ local-Tally daemon.
 *
 * Runs on the Windows PC next to TallyPrime. Polls the remote OCC server
 * for queued operations (push customer / push sales voucher / push
 * receipt), executes each one against the local Tally instance over
 * 127.0.0.1:9000, and POSTs the result back.
 *
 * Configuration in .env on the agent machine:
 *   BRIDGE_AGENT=true                       (turn the command on)
 *   BRIDGE_REMOTE_URL=https://occ.example.com
 *   BRIDGE_AGENT_TOKEN=<secret token issued by cloud OCC>
 *   TALLY_ENABLED=true
 *   TALLY_HOST=127.0.0.1
 *   TALLY_PORT=9000
 *
 * Usage:
 *   php artisan bridge:agent                 (one tick — claim + process up to N)
 *   php artisan bridge:agent --watch         (loop forever; pairs with the
 *                                             tally-bridge.bat watcher)
 *   php artisan bridge:agent --once          (single claim, exits with status)
 */
class BridgeAgent extends Command
{
    protected $signature = 'bridge:agent
                            {--watch : Loop forever, polling every --interval seconds}
                            {--interval=60 : Seconds between polls in --watch mode}
                            {--max=10 : Max operations to process per tick}';

    protected $description = 'Run the OCC ↔ Tally bridge agent: claim queued operations from a remote OCC and execute them against local Tally.';

    public function handle(TallyClient $tally): int
    {
        if (! (bool) config('services.bridge.agent_enabled')) {
            $this->error('BRIDGE_AGENT is not enabled in .env. Set BRIDGE_AGENT=true to run this command.');

            return self::FAILURE;
        }
        $remote = (string) config('services.bridge.remote_url');
        $token = (string) config('services.bridge.agent_token');
        if ($remote === '' || $token === '') {
            $this->error('BRIDGE_REMOTE_URL and BRIDGE_AGENT_TOKEN must be set in .env.');

            return self::FAILURE;
        }

        $interval = max(5, (int) $this->option('interval'));
        $max = max(1, (int) $this->option('max'));

        $this->info("Bridge agent → {$remote} (poll every {$interval}s, up to {$max}/tick)");

        do {
            $this->tick($tally, $remote, $token, $max);
            if ($this->option('watch')) {
                sleep($interval);
            }
        } while ($this->option('watch'));

        return self::SUCCESS;
    }

    private function tick(TallyClient $tally, string $remote, string $token, int $max): void
    {
        try {
            $ops = $this->http($remote, $token)
                ->post('/api/bridge/claim', ['max' => $max])
                ->throw()
                ->json('operations', []);
        } catch (\Throwable $e) {
            $this->warn('Claim failed: '.$e->getMessage());

            return;
        }

        if (empty($ops)) {
            $this->line('  (no pending operations)');

            return;
        }

        foreach ($ops as $op) {
            $id = $op['id'] ?? 0;
            $opType = $op['operation'] ?? '';
            $payload = $op['payload'] ?? [];

            $this->line("  #{$id} {$opType} — executing");
            try {
                $result = $this->runOperation($tally, $opType, $payload);
                $this->http($remote, $token)
                    ->post("/api/bridge/complete/{$id}", ['result' => $result])
                    ->throw();
                $this->info("  #{$id} done");
            } catch (\Throwable $e) {
                $this->error("  #{$id} failed: ".$e->getMessage());
                try {
                    $this->http($remote, $token)
                        ->post("/api/bridge/fail/{$id}", ['error' => $e->getMessage()])
                        ->throw();
                } catch (\Throwable $reportErr) {
                    $this->warn('  (and failed to report failure: '.$reportErr->getMessage().')');
                }
            }
        }
    }

    /** Dispatch on operation type. Each branch maps to a TallyClient call. */
    private function runOperation(TallyClient $tally, string $op, array $payload): array
    {
        return match ($op) {
            'push_customer' => $tally->pushCustomer($payload),
            'push_sales_voucher' => $tally->pushSalesVoucher($payload),
            'push_receipt' => $tally->pushReceiptVoucher($payload),
            'pull_masters' => [
                'customers' => $tally->fetchCustomers(),
                'products' => $tally->fetchProducts(),
            ],
            'pull_stock' => ['stock' => $tally->fetchStock()],
            'pull_vouchers' => [
                'sales' => $tally->fetchSalesVouchers($payload['from'] ?? null, $payload['to'] ?? null),
                'purchase' => $tally->fetchPurchaseVouchers($payload['from'] ?? null, $payload['to'] ?? null),
            ],
            default => throw new \RuntimeException("Unknown operation: {$op}"),
        };
    }

    private function http(string $remote, string $token): PendingRequest
    {
        return Http::baseUrl(rtrim($remote, '/'))
            ->withToken($token)
            ->acceptJson()
            ->timeout(30);
    }
}
