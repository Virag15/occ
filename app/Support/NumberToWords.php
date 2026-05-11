<?php

namespace App\Support;

/**
 * Indian numbering system (Lakh / Crore) — for "Amount in words" on tax invoices.
 *
 * Example: 1234567.89 → "Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven and Eighty Nine Paise Only"
 */
class NumberToWords
{
    private static array $ones = [
        '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
        'Seventeen', 'Eighteen', 'Nineteen',
    ];
    private static array $tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    public static function rupees(float $amount): string
    {
        $rupees = (int) floor($amount);
        $paise = (int) round(($amount - $rupees) * 100);

        $words = self::convert($rupees);
        $out = ($words === '' ? 'Zero' : $words) . ' Rupees';
        if ($paise > 0) {
            $out .= ' and ' . self::convert($paise) . ' Paise';
        }
        return $out . ' Only';
    }

    private static function convert(int $n): string
    {
        if ($n === 0) return '';
        if ($n < 0) return 'Minus ' . self::convert(-$n);

        $parts = [];
        if ($n >= 10000000) {
            $parts[] = self::convert((int) ($n / 10000000)) . ' Crore';
            $n %= 10000000;
        }
        if ($n >= 100000) {
            $parts[] = self::convert((int) ($n / 100000)) . ' Lakh';
            $n %= 100000;
        }
        if ($n >= 1000) {
            $parts[] = self::convert((int) ($n / 1000)) . ' Thousand';
            $n %= 1000;
        }
        if ($n >= 100) {
            $parts[] = self::convert((int) ($n / 100)) . ' Hundred';
            $n %= 100;
        }
        if ($n >= 20) {
            $tens = self::$tens[(int) ($n / 10)];
            $ones = $n % 10;
            $parts[] = $ones ? $tens . ' ' . self::$ones[$ones] : $tens;
        } elseif ($n > 0) {
            $parts[] = self::$ones[$n];
        }
        return trim(implode(' ', $parts));
    }
}
