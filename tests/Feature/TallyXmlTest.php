<?php

namespace Tests\Feature;

use App\Services\Tally\TallyClient;
use Tests\TestCase;

/**
 * Validates the XML the bridge sends to TallyPrime. Each test parses the
 * generated string with SimpleXML and asserts on the structure, so a
 * malformed envelope (bad tag nesting, unescaped &, dropped node) fails
 * loudly here instead of silently against a real Tally instance.
 *
 * These tests don't hit a live Tally — they verify the *contract*. Live
 * verification is what tally:preview is for during integration days.
 */
class TallyXmlTest extends TestCase
{
    private function client(): TallyClient
    {
        return new TallyClient(company: 'Test Company');
    }

    private function parse(string $xml): \SimpleXMLElement
    {
        $prev = libxml_use_internal_errors(true);
        $doc = simplexml_load_string($xml);
        libxml_use_internal_errors($prev);
        $this->assertNotFalse($doc, 'TallyClient emitted malformed XML: '.implode('; ', array_map(fn ($e) => $e->message, libxml_get_errors())));

        return $doc;
    }

    public function test_sales_voucher_xml_structure_is_well_formed(): void
    {
        $voucher = [
            'order_code' => 'ORD-2026-0001',
            'invoice_number' => 'INV-100',
            'order_date' => '2026-05-12',
            'customer_name' => 'Acme Electricals',
            'line_items' => [
                ['name' => 'C&S 16A MCB', 'qty' => 10, 'rate' => 250, 'tax_rate' => 18],
                ['name' => 'BCH 32A Switch', 'qty' => 5, 'rate' => 480, 'tax_rate' => 18],
            ],
        ];

        $xml = $this->client()->previewSalesVoucherXml($voucher);
        $doc = $this->parse($xml);

        // Envelope shape
        $this->assertSame('Import Data', (string) $doc->HEADER->TALLYREQUEST);
        $this->assertSame('Test Company', (string) $doc->BODY->IMPORTDATA->REQUESTDESC->STATICVARIABLES->SVCURRENTCOMPANY);

        $voucherNode = $doc->BODY->IMPORTDATA->REQUESTDATA->TALLYMESSAGE->VOUCHER;
        $this->assertSame('Sales', (string) $voucherNode['VCHTYPE']);
        $this->assertSame('Create', (string) $voucherNode['ACTION']);
        $this->assertSame('20260512', (string) $voucherNode->DATE);
        $this->assertSame('INV-100', (string) $voucherNode->VOUCHERNUMBER);
        $this->assertSame('Acme Electricals', (string) $voucherNode->PARTYLEDGERNAME);

        // Inventory entries
        $entries = $voucherNode->{'ALLINVENTORYENTRIES.LIST'};
        $this->assertCount(2, $entries);
        $this->assertSame('C&S 16A MCB', (string) $entries[0]->STOCKITEMNAME);
        $this->assertSame('10 Nos', (string) $entries[0]->ACTUALQTY);
        // Amount = qty * rate * (1 + tax%) = 10 * 250 * 1.18 = 2950.00
        $this->assertSame('2950.00', (string) $entries[0]->AMOUNT);
    }

    public function test_sales_voucher_falls_back_to_order_code_when_invoice_number_absent(): void
    {
        $voucher = [
            'order_code' => 'ORD-2026-0042',
            'order_date' => '2026-05-12',
            'customer_name' => 'X',
            'line_items' => [['name' => 'A', 'qty' => 1, 'rate' => 100, 'tax_rate' => 0]],
        ];

        $xml = $this->client()->previewSalesVoucherXml($voucher);
        $doc = $this->parse($xml);
        $this->assertSame('ORD-2026-0042', (string) $doc->BODY->IMPORTDATA->REQUESTDATA->TALLYMESSAGE->VOUCHER->VOUCHERNUMBER);
    }

    public function test_xml_escapes_special_characters_in_customer_and_item_names(): void
    {
        $voucher = [
            'order_code' => 'ORD-X',
            'order_date' => '2026-05-12',
            // Ampersand and angle brackets — common in real names
            'customer_name' => 'Sharma & Sons <Pvt Ltd>',
            'line_items' => [
                ['name' => 'A&B MCB <16A>', 'qty' => 1, 'rate' => 100, 'tax_rate' => 0],
            ],
        ];

        $xml = $this->client()->previewSalesVoucherXml($voucher);

        // Raw string should NOT contain unescaped & or <name> embedded — htmlspecialchars()
        // converts them. Parser will then resolve back to the original.
        $this->assertStringContainsString('Sharma &amp; Sons', $xml);
        $this->assertStringContainsString('&lt;Pvt Ltd&gt;', $xml);

        $doc = $this->parse($xml);
        $this->assertSame('Sharma & Sons <Pvt Ltd>', (string) $doc->BODY->IMPORTDATA->REQUESTDATA->TALLYMESSAGE->VOUCHER->PARTYNAME);
        $this->assertSame('A&B MCB <16A>', (string) $doc->BODY->IMPORTDATA->REQUESTDATA->TALLYMESSAGE->VOUCHER->{'ALLINVENTORYENTRIES.LIST'}[0]->STOCKITEMNAME);
    }

    public function test_receipt_voucher_has_two_balanced_ledger_entries(): void
    {
        $receipt = [
            'customer_name' => 'Acme Electricals',
            'amount' => 5000.00,
            'paid_on' => '2026-05-12',
            'mode' => 'neft',
            'reference' => 'UTR-12345',
        ];

        $xml = $this->client()->previewReceiptVoucherXml($receipt);
        $doc = $this->parse($xml);

        $voucherNode = $doc->BODY->IMPORTDATA->REQUESTDATA->TALLYMESSAGE->VOUCHER;
        $this->assertSame('Receipt', (string) $voucherNode['VCHTYPE']);
        $this->assertSame('20260512', (string) $voucherNode->DATE);

        $entries = $voucherNode->{'ALLLEDGERENTRIES.LIST'};
        $this->assertCount(2, $entries, 'Receipt voucher needs two balanced ledger entries');
        // Party leg: positive amount, ISDEEMEDPOSITIVE=No
        $this->assertSame('Acme Electricals', (string) $entries[0]->LEDGERNAME);
        $this->assertSame('No', (string) $entries[0]->ISDEEMEDPOSITIVE);
        $this->assertSame('5000.00', (string) $entries[0]->AMOUNT);
        // Bank leg: negative amount, ISDEEMEDPOSITIVE=Yes
        $this->assertSame('Bank Account', (string) $entries[1]->LEDGERNAME);
        $this->assertSame('Yes', (string) $entries[1]->ISDEEMEDPOSITIVE);
        $this->assertSame('-5000.00', (string) $entries[1]->AMOUNT);
    }

    public function test_receipt_voucher_uppercases_mode_in_narration(): void
    {
        $xml = $this->client()->previewReceiptVoucherXml([
            'customer_name' => 'X',
            'amount' => 100,
            'paid_on' => '2026-05-12',
            'mode' => 'upi',
            'reference' => 'TXN-1',
        ]);
        $doc = $this->parse($xml);
        $this->assertSame('Payment TXN-1 via UPI', (string) $doc->BODY->IMPORTDATA->REQUESTDATA->TALLYMESSAGE->VOUCHER->NARRATION);
    }

    public function test_receipt_voucher_defaults_mode_to_neft_when_missing(): void
    {
        $xml = $this->client()->previewReceiptVoucherXml([
            'customer_name' => 'X',
            'amount' => 100,
            'paid_on' => '2026-05-12',
        ]);
        $doc = $this->parse($xml);
        $this->assertStringContainsString('via NEFT', (string) $doc->BODY->IMPORTDATA->REQUESTDATA->TALLYMESSAGE->VOUCHER->NARRATION);
    }

    public function test_demo_mode_returns_canned_data_without_network(): void
    {
        config(['services.tally.enabled' => false]);
        $client = new TallyClient(company: 'Test Co');

        $this->assertFalse($client->isEnabled());
        // Demo fetches return arrays without hitting any network
        $this->assertNotEmpty($client->fetchCustomers());
        $this->assertNotEmpty($client->fetchProducts());
        $this->assertNotEmpty($client->fetchStock());
        $this->assertNotEmpty($client->fetchSalesVouchers());
    }
}
