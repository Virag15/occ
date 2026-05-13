<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string|null $tally_id
 * @property string|null $tally_guid
 * @property Carbon|null $tally_synced_at
 * @property string|null $transporter_code
 * @property string $name
 * @property string|null $contact_person
 * @property string|null $primary_phone
 * @property string|null $secondary_phone
 * @property string|null $whatsapp
 * @property string|null $email
 * @property string|null $office_address
 * @property string|null $city
 * @property string|null $gstin
 * @property array<int,string>|null $areas_served
 * @property array<int,string>|null $vehicle_types
 * @property int|null $avg_transit_days
 * @property string|null $cost_per_kg
 * @property string|null $triplicate_reliability
 * @property string|null $payment_terms
 * @property string $status
 * @property Carbon|null $onboarded_at
 * @property string|null $notes
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Collection<int,Order> $orders
 */
class Transporter extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'tally_id', 'tally_guid', 'tally_synced_at',
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
            'tally_synced_at' => 'datetime',
        ];
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}
