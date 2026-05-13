<?php

namespace App\Policies;

use App\Models\Shipment;
use App\Models\User;

class ShipmentPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Shipment $shipment): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['owner', 'manager', 'warehouse'], true);
    }

    public function update(User $user, Shipment $shipment): bool
    {
        return in_array($user->role, ['owner', 'manager', 'warehouse'], true);
    }

    public function delete(User $user, Shipment $shipment): bool
    {
        return in_array($user->role, ['owner', 'manager', 'warehouse'], true);
    }

    public function restore(User $user, Shipment $shipment): bool
    {
        return in_array($user->role, ['owner', 'manager'], true);
    }

    public function forceDelete(User $user, Shipment $shipment): bool
    {
        return $user->role === 'owner';
    }
}
