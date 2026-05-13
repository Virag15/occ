<?php

namespace App\Policies;

use App\Models\Customer;
use App\Models\User;

class CustomerPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Customer $customer): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['owner', 'manager', 'accounts'], true);
    }

    public function update(User $user, Customer $customer): bool
    {
        return in_array($user->role, ['owner', 'manager', 'accounts'], true);
    }

    public function delete(User $user, Customer $customer): bool
    {
        return in_array($user->role, ['owner', 'manager', 'accounts'], true);
    }

    public function restore(User $user, Customer $customer): bool
    {
        return in_array($user->role, ['owner', 'manager'], true);
    }

    public function forceDelete(User $user, Customer $customer): bool
    {
        return $user->role === 'owner';
    }
}
