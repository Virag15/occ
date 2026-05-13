<?php

namespace App\Policies;

use App\Models\Payment;
use App\Models\User;

class PaymentPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Payment $payment): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['owner', 'manager', 'accounts'], true);
    }

    public function update(User $user, Payment $payment): bool
    {
        return in_array($user->role, ['owner', 'manager', 'accounts'], true);
    }

    public function delete(User $user, Payment $payment): bool
    {
        return in_array($user->role, ['owner', 'manager', 'accounts'], true);
    }

    public function restore(User $user, Payment $payment): bool
    {
        return in_array($user->role, ['owner', 'manager'], true);
    }

    public function forceDelete(User $user, Payment $payment): bool
    {
        return $user->role === 'owner';
    }
}
