<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\User;

/**
 * Mirrors the RBAC matrix in routes/web.php — duplicated here so model-level
 * `$user->can('update', $order)` checks work without going through HTTP routes.
 * Route middleware is the first line of defence; policies cover programmatic
 * authorisation (notifications, jobs, console commands, future API access).
 */
class OrderPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Order $order): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['owner', 'manager'], true);
    }

    public function update(User $user, Order $order): bool
    {
        return in_array($user->role, ['owner', 'manager'], true);
    }

    public function delete(User $user, Order $order): bool
    {
        return in_array($user->role, ['owner', 'manager'], true);
    }

    public function restore(User $user, Order $order): bool
    {
        return in_array($user->role, ['owner', 'manager'], true);
    }

    public function forceDelete(User $user, Order $order): bool
    {
        return $user->role === 'owner';
    }

    /** Status advance — warehouse can drive dispatch/delivery side. */
    public function advanceStatus(User $user, Order $order): bool
    {
        return in_array($user->role, ['owner', 'manager', 'warehouse'], true);
    }
}
