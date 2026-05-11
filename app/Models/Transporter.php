<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Transporter extends Model
{
    use HasFactory;

    protected $fillable = [
        'transporter_code', 'name', 'contact_person',
        'primary_phone', 'secondary_phone', 'whatsapp', 'email',
        'office_address', 'city', 'gstin',
        'areas_served', 'vehicle_types',
        'avg_transit_days', 'cost_per_kg', 'triplicate_reliability',
        'payment_terms', 'status', 'onboarded_at', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'areas_served' => 'array',
            'vehicle_types' => 'array',
            'cost_per_kg' => 'decimal:2',
            'onboarded_at' => 'date',
        ];
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}
