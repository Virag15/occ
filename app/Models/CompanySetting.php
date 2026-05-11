<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Single-row config table for company-wide settings used on invoices, slips,
 * dashboards. Access via CompanySetting::current() — caller treats it as a
 * singleton.
 */
class CompanySetting extends Model
{
    use HasFactory;

    protected $guarded = [];

    /**
     * Get (or lazily create) the single settings row.
     */
    public static function current(): self
    {
        return static::firstOrCreate(['id' => 1], [
            'company_name' => 'GC Communication',
            'country' => 'India',
        ]);
    }

    /**
     * Two parties are in the same state for GST purposes if state_code matches.
     * Used to decide CGST+SGST vs IGST on the invoice.
     */
    public function isSameState(?string $buyerStateCode): bool
    {
        if (!$this->state_code || !$buyerStateCode) return true; // Conservative default
        return strtoupper(trim($this->state_code)) === strtoupper(trim($buyerStateCode));
    }
}
