<?php

namespace Tests\Feature;

use App\Models\CompanySetting;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Services\Invoice\InvoiceCalculator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Golden, paise-exact tests for the single invoice money engine (M3).
 * These are the contract: the Tally sales voucher (M4) must reproduce
 * these exact numbers, so any drift here is a release blocker.
 */
class InvoiceCalculatorTest extends TestCase
{
    use RefreshDatabase;

    /** Seller in Maharashtra (state code 27). */
    private function company(string $stateCode = '27'): CompanySetting
    {
        return new CompanySetting(['company_name' => 'GC', 'state_code' => $stateCode]);
    }

    private function order(string $gstin = '', float $tradeDiscount = 0.0): Order
    {
        $cust = Customer::create([
            'tally_id' => 'T-'.uniqid(),
            'name' => 'Test Buyer',
            'status' => 'active',
            'gstin' => $gstin ?: null,
        ]);

        return Order::create([
            'order_code' => 'OCC-TEST-'.uniqid(),
            'customer_id' => $cust->id,
            'order_date' => '2026-05-17',
            'status' => 'confirmed',
            'discount_amount' => $tradeDiscount,
        ]);
    }

    private function addItem(Order $o, float $qty, float $price, float $discPct, float $taxRate): void
    {
        OrderItem::create([
            'order_id' => $o->id,
            'product_name' => 'Item',
            'qty_ordered' => $qty,
            'unit_price' => $price,
            'discount_pct' => $discPct,
            'tax_rate' => $taxRate,
        ]);
    }

    public function test_intra_state_single_rate_splits_into_cgst_sgst(): void
    {
        // Buyer GSTIN starts 27 ⇒ same state as seller (27).
        $o = $this->order('27ABCDE1234F1Z5');
        $this->addItem($o, 10, 540, 0, 18);

        $b = InvoiceCalculator::for($o->fresh('items'), $this->company());

        $this->assertTrue($b->sameState);
        $this->assertSame(5400.0, $b->taxableTotal);
        $this->assertSame(972.0, $b->taxTotal);
        $this->assertSame(486.0, $b->cgst);
        $this->assertSame(486.0, $b->sgst);
        $this->assertSame(0.0, $b->igst);
        $this->assertSame(6372.0, $b->grandTotal);
        $this->assertSame(0.0, $b->roundOff);
    }

    public function test_inter_state_uses_igst(): void
    {
        // Buyer GSTIN starts 24 (Gujarat) ⇒ inter-state.
        $o = $this->order('24ABCDE1234F1Z5');
        $this->addItem($o, 10, 540, 0, 18);

        $b = InvoiceCalculator::for($o->fresh('items'), $this->company());

        $this->assertFalse($b->sameState);
        $this->assertSame(972.0, $b->igst);
        $this->assertSame(0.0, $b->cgst);
        $this->assertSame(6372.0, $b->grandTotal);
    }

    public function test_line_discount_is_applied_pre_tax(): void
    {
        $o = $this->order('27ABCDE1234F1Z5');
        $this->addItem($o, 10, 100, 10, 18); // gross 1000, -10% = 900 taxable

        $b = InvoiceCalculator::for($o->fresh('items'), $this->company());

        $this->assertSame(1000.0, $b->subtotal);
        $this->assertSame(100.0, $b->lineDiscountTotal);
        $this->assertSame(900.0, $b->taxableTotal);
        $this->assertSame(162.0, $b->taxTotal);
        $this->assertSame(1062.0, $b->grandTotal);
    }

    public function test_trade_discount_post_tax_with_round_off(): void
    {
        $o = $this->order('27ABCDE1234F1Z5', tradeDiscount: 50.50);
        $this->addItem($o, 1, 1000, 0, 18); // taxable 1000, tax 180 ⇒ preRound 1129.50

        $b = InvoiceCalculator::for($o->fresh('items'), $this->company());

        $this->assertSame(50.5, $b->tradeDiscount);
        $this->assertSame(1130.0, $b->grandTotal);   // 1129.50 → nearest rupee
        $this->assertSame(0.5, $b->roundOff);          // +0.50 to a Round Off ledger
        $this->assertTrue($b->hasRoundOff());
    }

    public function test_b2c_no_gstin_falls_to_igst_preserving_legacy_behaviour(): void
    {
        $o = $this->order(''); // unregistered buyer, no GSTIN
        $this->addItem($o, 1, 1000, 0, 18);

        $b = InvoiceCalculator::for($o->fresh('items'), $this->company());

        $this->assertFalse($b->sameState);
        $this->assertSame(180.0, $b->igst);
        $this->assertSame(0.0, $b->cgst);
    }

    public function test_explicit_place_of_supply_overrides_gstin_prefix(): void
    {
        $o = $this->order(''); // no GSTIN, but we know the supply is in-state
        $this->addItem($o, 1, 1000, 0, 18);

        $b = InvoiceCalculator::for($o->fresh('items'), $this->company('27'), '27');

        $this->assertTrue($b->sameState);
        $this->assertSame(90.0, $b->cgst);
        $this->assertSame(90.0, $b->sgst);
    }

    public function test_rate_buckets_summarise_each_distinct_gst_rate(): void
    {
        $o = $this->order('27ABCDE1234F1Z5');
        $this->addItem($o, 1, 1000, 0, 18);
        $this->addItem($o, 1, 1000, 0, 12);

        $b = InvoiceCalculator::for($o->fresh('items'), $this->company());

        $this->assertCount(2, $b->rateBuckets);
        $this->assertSame(12.0, $b->rateBuckets[0]->rate); // sorted ascending
        $this->assertSame(18.0, $b->rateBuckets[1]->rate);
        $this->assertSame(120.0, $b->rateBuckets[0]->tax);
        $this->assertSame(180.0, $b->rateBuckets[1]->tax);
        $this->assertSame(90.0, $b->rateBuckets[1]->cgst); // 180/2 intra-state
        $this->assertSame(300.0, $b->taxTotal);
    }
}
