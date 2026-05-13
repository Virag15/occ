<?php

namespace App\Policies;

use App\Models\User;

/**
 * Owner-only across the board per RBAC matrix. Manager has audit-log
 * read but no user management. Self-delete is blocked explicitly so a
 * lone owner can't lock themselves out.
 */
class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->role === 'owner';
    }

    public function view(User $user, User $model): bool
    {
        return $user->role === 'owner';
    }

    public function create(User $user): bool
    {
        return $user->role === 'owner';
    }

    public function update(User $user, User $model): bool
    {
        return $user->role === 'owner';
    }

    public function delete(User $user, User $model): bool
    {
        if ($user->role !== 'owner') {
            return false;
        }

        // Self-delete blocked at the policy level — UserController also enforces this,
        // belt-and-braces so future programmatic deletes can't circumvent it.
        return $user->id !== $model->id;
    }

    public function restore(User $user, User $model): bool
    {
        return $user->role === 'owner';
    }

    public function forceDelete(User $user, User $model): bool
    {
        return $user->role === 'owner' && $user->id !== $model->id;
    }
}
