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
 * @property string|null $customer_code
 * @property string $name
 * @property string|null $company
 * @property string|null $gstin
 * @property string|null $contact_person
 * @property string|null $phone
 * @property string|null $whatsapp
 * @property string|null $email
 * @property string|null $billing_address
 * @property string|null $delivery_address
 * @property string|null $city
 * @property string|null $state
 * @property string|null $payment_terms
 * @property string|null $credit_limit
 * @property array<int,string>|null $brand_preferences
 * @property string|null $customer_type
 * @property string $status
 * @property Carbon|null $onboarded_at
 * @property string|null $notes
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Collection<int,Order> $orders
 * @property-read Collection<int,ReturnCase> $returns
 */
class Customer extends Model
{
    use HasFactory, SoftDeletes;

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
