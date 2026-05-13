<?php

namespace App\Policies;

use App\Models\ReturnCase;
use App\Models\User;

class ReturnCasePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, ReturnCase $returnCase): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['owner', 'manager', 'accounts', 'warehouse'], true);
    }

    public function update(User $user, ReturnCase $returnCase): bool
    {
        return in_array($user->role, ['owner', 'manager', 'accounts', 'warehouse'], true);
    }

    public function delete(User $user, ReturnCase $returnCase): bool
    {
        return in_array($user->role, ['owner', 'manager'], true);
    }

    public function restore(User $user, ReturnCase $returnCase): bool
    {
        return in_array($user->role, ['owner', 'manager'], true);
    }

    public function forceDelete(User $user, ReturnCase $returnCase): bool
    {
        return $user->role === 'owner';
    }
}
