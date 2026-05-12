<?php

namespace App\Console\Commands;

use App\Services\Tally\TallyClient;
use App\Services\Tally\TallySyncService;
use Illuminate\Console\Command;

class TallySync extends Command
{
    protected $signature = 'tally:sync
                            {--type=all : customers | products | stock | all}
                            {--check : Just ping the Tally gateway and report status}';

    protected $description = 'Sync masters + stock from TallyPrime (or run demo mode when TALLY_ENABLED=false)';

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
        if (!in_array($type, ['customers', 'products', 'stock', 'all'], true)) {
            $this->error("Unknown --type={$type}. Use customers, products, stock, or all.");
            return self::FAILURE;
        }

        $this->line('');
        $this->info("Starting Tally sync (type={$type})…");
        if (!$client->isEnabled()) {
            $this->warn('  Tally is DISABLED — running in DEMO mode. No data leaves OCC and no real Tally calls happen.');
        }

        $methods = $type === 'all'
            ? ['customers', 'products', 'stock']
            : [$type];

        foreach ($methods as $m) {
            $method = match ($m) {
                'customers' => 'syncCustomers',
                'products' => 'syncProducts',
                'stock' => 'syncStock',
            };
            $log = $svc->$method();
            $this->line(sprintf(
                '  %s: %s (created %d · updated %d · failed %d · %0.2fs)',
                str_pad($m, 10),
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

        $this->line('');
        $this->info('Done.');
        return self::SUCCESS;
    }
}
