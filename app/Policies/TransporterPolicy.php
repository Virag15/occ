<?php

namespace App\Policies;

use App\Models\Transporter;
use App\Models\User;

class TransporterPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Transporter $transporter): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['owner', 'manager'], true);
    }

    public function update(User $user, Transporter $transporter): bool
    {
        return in_array($user->role, ['owner', 'manager'], true);
    }

    public function delete(User $user, Transporter $transporter): bool
    {
        return in_array($user->role, ['owner', 'manager'], true);
    }

    public function restore(User $user, Transporter $transporter): bool
    {
        return in_array($user->role, ['owner', 'manager'], true);
    }

    public function forceDelete(User $user, Transporter $transporter): bool
    {
        return $user->role === 'owner';
    }
}
