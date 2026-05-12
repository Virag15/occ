<?php

namespace App\Listeners;

use App\Models\AuditLog;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;

class LogAuthEvents
{
    public function handleLogin(Login $event): void
    {
        AuditLog::create([
            'user_id' => $event->user->getKey(),
            'entity_type' => 'user',
            'entity_id' => $event->user->getKey(),
            'action' => 'login',
            'changes' => null,
        ]);
    }

    public function handleLogout(Logout $event): void
    {
        if (! $event->user) {
            return;
        }

        AuditLog::create([
            'user_id' => $event->user->getKey(),
            'entity_type' => 'user',
            'entity_id' => $event->user->getKey(),
            'action' => 'logout',
            'changes' => null,
        ]);
    }

    public function handleFailed(Failed $event): void
    {
        $email = $event->credentials['email'] ?? 'unknown';

        AuditLog::create([
            'user_id' => null,
            'entity_type' => 'user',
            'entity_id' => $event->user?->getKey() ?? 0,
            'action' => 'login_failed',
            'changes' => ['email' => ['from' => null, 'to' => $email]],
        ]);
    }
}
