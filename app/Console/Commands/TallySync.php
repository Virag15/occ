<?php

namespace App\Console\Commands;

use App\Services\Tally\TallyClient;
use App\Services\Tally\TallySyncService;
use Illuminate\Console\Command;

class TallySync extends Command
{
    protected $signature = 'tally:sync
                            {--type=all : customers | products | stock | orders | payments | all | reconcile}
                            {--direction=pull : pull (Tally → OCC) | push (OCC → Tally)}
                            {--check : Just ping the Tally gateway and report status}';

    protected $description = 'Two-way sync with TallyPrime — pull masters/stock or push customers/orders/payments. Demo mode when TALLY_ENABLED=false.';

    public function handle(TallyClient $client, TallySyncService $svc): int
    {
        $summary = $client->summary();
        $this->table(['Setting', 'Value'], collect($summary)->map(fn ($v, $k) => [$k, is_bool($v) ? ($v ? 'true' : 'false') : (string) $v])->values()->all());

        if ($this->option('check')) {
            $ok = $client->isEnabled() ? $client->ping() : false;
            $this->line('');
            if (!$client->isEnabled()) {
                $this->warn('Tally is DISABLED (TALLY_ENABLED=false). The connection won\'t be probed.');
            } elseif ($ok) {
                $this->info('Tally gateway responded OK.');
            } else {
                $this->error('Tally gateway is unreachable or returned an invalid response.');
                return self::FAILURE;
            }
            return self::SUCCESS;
        }

        $type = $this->option('type');
        $direction = $this->option('direction');
        $valid = ['customers', 'products', 'stock', 'orders', 'payments', 'all', 'reconcile'];
        if (!in_array($type, $valid, true)) {
            $this->error("Unknown --type={$type}. Valid: " . implode(', ', $valid));
            return self::FAILURE;
        }
        if (!in_array($direction, ['pull', 'push'], true)) {
            $this->error("Unknown --direction={$direction}. Use pull or push.");
            return self::FAILURE;
        }

        $this->line('');
        $this->info("Starting Tally sync (type={$type}, direction={$direction})…");
        if (!$client->isEnabled()) {
            $this->warn('  Tally is DISABLED — running in DEMO mode. No data leaves OCC and no real Tally calls happen.');
        }

        // 'reconcile' runs both directions
        if ($type === 'reconcile') {
            $result = $svc->reconcile();
            foreach ($result['pull'] as $name => $log) $this->printLog("pull/{$name}", $log);
            foreach ($result['push'] as $name => $log) $this->printLog("push/{$name}", $log);
            $this->line('');
            $this->info('Done.');
            return self::SUCCESS;
        }

        $methods = $direction === 'pull'
            ? ($type === 'all' ? ['customers', 'products', 'stock'] : [$type])
            : ($type === 'all' ? ['customers', 'orders', 'payments'] : [$type]);

        foreach ($methods as $m) {
            $method = match ($direction . ':' . $m) {
                'pull:customers' => 'syncCustomers',
                'pull:products' => 'syncProducts',
                'pull:stock' => 'syncStock',
                'push:customers' => 'pushCustomers',
                'push:orders' => 'pushOrders',
                'push:payments' => 'pushPayments',
                default => null,
            };
            if (!$method) {
                $this->error("Combination not supported: direction={$direction}, type={$m}");
                continue;
            }
            $this->printLog("{$direction}/{$m}", $svc->$method());
        }

        $this->line('');
        $this->info('Done.');
        return self::SUCCESS;
    }

    private function printLog(string $label, $log): void
    {
        $this->line(sprintf(
            '  %s: %s (created %d · updated %d · failed %d · %0.2fs)',
            str_pad($label, 18),
            strtoupper($log->status),
            $log->records_created,
            $log->records_updated,
            $log->records_failed,
            $log->duration_seconds ?? 0,
        ));
        if ($log->error_message) {
            $this->error('    Error: ' . $log->error_message);
        }
    }
}
