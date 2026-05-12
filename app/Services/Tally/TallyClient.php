<?php

namespace App\Services\Tally;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;

/**
 * Low-level client for the TallyPrime XML/HTTP gateway.
 *
 * Tally runs an XML-over-HTTP server on a configurable port (default 9000)
 * when "ODBC server" is enabled inside the Tally instance. We POST a
 * <ENVELOPE>…</ENVELOPE> XML document and Tally responds with XML data.
 *
 * Configure via env:
 *   TALLY_HOST=127.0.0.1
 *   TALLY_PORT=9000
 *   TALLY_COMPANY="GC Communication"     # the loaded company in Tally
 *   TALLY_ENABLED=true                   # master switch
 *   TALLY_TIMEOUT=30                     # seconds
 *
 * When TALLY_ENABLED is false, every method returns demo data so the rest of
 * the app (sync command, settings UI, audit log) is testable end-to-end
 * without a running Tally.
 */
class TallyClient
{
    public function __construct(
        protected ?string $host = null,
        protected ?int $port = null,
        protected ?string $company = null,
        protected int $timeoutSeconds = 30,
    ) {
        $this->host ??= (string) config('services.tally.host', env('TALLY_HOST', '127.0.0.1'));
        $this->port ??= (int) config('services.tally.port', env('TALLY_PORT', 9000));
        $this->company ??= (string) config('services.tally.company', env('TALLY_COMPANY', 'GC Communication'));
        $this->timeoutSeconds = (int) config('services.tally.timeout', env('TALLY_TIMEOUT', 30));
    }

    public function isEnabled(): bool
    {
        return (bool) config('services.tally.enabled', env('TALLY_ENABLED', false));
    }

    public function endpoint(): string
    {
        return "http://{$this->host}:{$this->port}";
    }

    public function summary(): array
    {
        return [
            'enabled' => $this->isEnabled(),
            'host' => $this->host,
            'port' => $this->port,
            'company' => $this->company,
            'endpoint' => $this->endpoint(),
        ];
    }

    /**
     * Ping the Tally gateway by requesting the loaded company name.
     * Returns true if Tally responds with valid XML, false otherwise.
     */
    public function ping(): bool
    {
        if (!$this->isEnabled()) return false;

        try {
            $resp = $this->postXml($this->envelope('CollectionName', 'Company Collection', $this->companyCollectionTdl()));
            return str_contains($resp, '<COMPANY');
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * Fetch the list of ledgers under the Sundry Debtors group (≈ customers).
     *
     * @return array<int, array{tally_id: string, name: string, gstin: ?string, address: ?string, phone: ?string, email: ?string, payment_terms: ?string}>
     */
    public function fetchCustomers(): array
    {
        if (!$this->isEnabled()) return $this->demoCustomers();

        // TODO: real implementation
        // $xml = $this->postXml($this->envelope('CollectionName', 'Customer Ledgers', $this->customerLedgersTdl()));
        // return $this->parseLedgers($xml);
        return $this->demoCustomers();
    }

    /**
     * Fetch the stock items master.
     *
     * @return array<int, array{tally_id: string, name: string, sku: ?string, unit: ?string, gst_rate: ?float, mrp: ?float, hsn_code: ?string}>
     */
    public function fetchProducts(): array
    {
        if (!$this->isEnabled()) return $this->demoProducts();

        // TODO: real implementation — Stock Item collection
        return $this->demoProducts();
    }

    /**
     * Fetch current stock levels per item per godown.
     *
     * @return array<int, array{tally_id: string, godown: string, qty: float, as_of_date: string}>
     */
    public function fetchStock(): array
    {
        if (!$this->isEnabled()) return $this->demoStock();

        // TODO: real implementation — Stock Summary with godown breakdown
        return $this->demoStock();
    }

    // ─── Low-level XML helpers ──────────────────────────────────────

    /**
     * POST raw XML to the Tally gateway and return the response body as a string.
     *
     * @throws ConnectionException When Tally is unreachable.
     * @throws RequestException    When Tally responds with a non-200 status.
     */
    protected function postXml(string $xml): string
    {
        return Http::timeout($this->timeoutSeconds)
            ->withHeaders(['Content-Type' => 'text/xml; charset=utf-8'])
            ->withBody($xml, 'text/xml')
            ->post($this->endpoint())
            ->throw()
            ->body();
    }

    /**
     * Wrap a TDL fragment in the standard Tally <ENVELOPE> for a Collection export.
     */
    protected function envelope(string $reportTag, string $reportName, string $tdl): string
    {
        return <<<XML
<ENVELOPE>
    <HEADER>
        <TALLYREQUEST>Export Data</TALLYREQUEST>
        <TYPE>Collection</TYPE>
        <ID>{$reportName}</ID>
    </HEADER>
    <BODY>
        <DESC>
            <STATICVARIABLES>
                <SVCURRENTCOMPANY>{$this->company}</SVCURRENTCOMPANY>
            </STATICVARIABLES>
            <TDL>
                <TDLMESSAGE>
                    {$tdl}
                </TDLMESSAGE>
            </TDL>
        </DESC>
    </BODY>
</ENVELOPE>
XML;
    }

    protected function companyCollectionTdl(): string
    {
        return <<<XML
            <COLLECTION NAME="Company Collection">
                <TYPE>Company</TYPE>
                <FETCH>NAME</FETCH>
            </COLLECTION>
XML;
    }

    // ─── Demo data — used when TALLY_ENABLED=false ──────────────────

    private function demoCustomers(): array
    {
        return [
            ['tally_id' => 'TALLY-DEMO-CUST-001', 'name' => 'Sharma Electricals', 'gstin' => '27AAAAA1234A1Z5', 'address' => 'Plot 12, Nashik MIDC', 'phone' => '+91 9876543210', 'email' => 'sharma@example.in', 'payment_terms' => '30_days'],
            ['tally_id' => 'TALLY-DEMO-CUST-002', 'name' => 'Patel Switchgears', 'gstin' => '24BBBBB5678B2Z6', 'address' => 'Surat, GJ', 'phone' => '+91 9876543211', 'email' => null, 'payment_terms' => '15_days'],
            ['tally_id' => 'TALLY-DEMO-CUST-003', 'name' => 'BuildPro Contractors', 'gstin' => null, 'address' => 'Pune', 'phone' => '+91 9876543212', 'email' => 'orders@buildpro.in', 'payment_terms' => '45_days'],
        ];
    }

    private function demoProducts(): array
    {
        return [
            ['tally_id' => 'TALLY-DEMO-PROD-001', 'name' => 'C&S MCB 6A SP', 'sku' => 'CS-MCB-6A', 'unit' => 'NOS', 'gst_rate' => 18.0, 'mrp' => 180.0, 'hsn_code' => '8536'],
            ['tally_id' => 'TALLY-DEMO-PROD-002', 'name' => 'BCH Contactor 32A', 'sku' => 'BCH-CTR-32A', 'unit' => 'NOS', 'gst_rate' => 18.0, 'mrp' => 1450.0, 'hsn_code' => '8536'],
        ];
    }

    private function demoStock(): array
    {
        return [
            ['tally_id' => 'TALLY-DEMO-PROD-001', 'godown' => 'Main', 'qty' => 240.0, 'as_of_date' => now()->toDateString()],
            ['tally_id' => 'TALLY-DEMO-PROD-002', 'godown' => 'Main', 'qty' => 75.0, 'as_of_date' => now()->toDateString()],
        ];
    }
}
