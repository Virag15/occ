<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Users/Index', [
            'rows' => User::query()->orderBy('name')->get(['id', 'name', 'email', 'role', 'created_at']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Users/Create');
    }

    public function edit(User $user): Response
    {
        return Inertia::render('Users/Edit', ['user' => $user->only(['id', 'name', 'email', 'role'])]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'role' => ['required', Rule::in(User::ROLES)],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => $data['role'],
            'email_verified_at' => now(),
        ]);

        $this->audit('user_created', $user, [
            'role' => ['from' => null, 'to' => $user->role],
        ]);

        return redirect()->route('users.index');
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
            'role' => ['required', Rule::in(User::ROLES)],
        ]);

        $oldRole = $user->role;
        $update = [
            'name' => $data['name'],
            'email' => $data['email'],
            'role' => $data['role'],
        ];
        if (!empty($data['password'])) {
            $update['password'] = Hash::make($data['password']);
        }
        $user->update($update);

        if ($oldRole !== $user->role) {
            $this->audit('role_changed', $user, ['role' => ['from' => $oldRole, 'to' => $user->role]]);
        }

        return redirect()->route('users.index');
    }

    public function destroy(User $user): RedirectResponse
    {
        if ($user->id === Auth::id()) {
            return back()->withErrors(['user' => 'You cannot delete your own account.']);
        }
        $this->audit('user_deleted', $user, ['email' => ['from' => $user->email, 'to' => null]]);
        $user->delete();
        return redirect()->route('users.index');
    }

    private function audit(string $action, User $user, array $changes): void
    {
        AuditLog::create([
            'user_id' => Auth::id(),
            'entity_type' => 'user',
            'entity_id' => $user->id,
            'action' => $action,
            'changes' => $changes,
        ]);
    }
}
