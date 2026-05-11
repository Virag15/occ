<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    use HasFactory;

    protected $fillable = [
        'tally_id', 'tally_guid', 'tally_synced_at',
        'customer_code', 'name', 'company', 'gstin',
        'contact_person', 'phone', 'whatsapp', 'email',
        'billing_address', 'delivery_address', 'city', 'state',
        'payment_terms', 'credit_limit', 'brand_preferences',
        'customer_type', 'status', 'onboarded_at', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'brand_preferences' => 'array',
            'credit_limit' => 'decimal:2',
            'onboarded_at' => 'date',
            'tally_synced_at' => 'datetime',
        ];
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function returns(): HasMany
    {
        return $this->hasMany(ReturnCase::class);
    }
}
