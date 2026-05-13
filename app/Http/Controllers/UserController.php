<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
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

    public function store(StoreUserRequest $request): RedirectResponse
    {
        $data = $request->validated();

        User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => $data['role'],
            'email_verified_at' => now(),
        ]);

        // AuditObserver writes 'created' automatically.
        return redirect()->route('users.index');
    }

    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $data = $request->validated();

        // Self-demotion guard: an owner editing themselves cannot change role
        // away from owner. Stops "I demoted myself to viewer, now I'm locked
        // out" and "last owner demoted, no admin remains". Other owners can
        // demote this one if they want to revoke it.
        if ($user->id === Auth::id() && $user->role === 'owner' && $data['role'] !== 'owner') {
            return back()->withErrors(['role' => 'You cannot demote yourself from owner. Ask another owner to do it.']);
        }

        // Last-owner guard: don't let the only remaining owner be demoted by
        // anyone (including themselves — already caught above, but belt+braces
        // for the case where another owner edits them down).
        if ($user->role === 'owner' && $data['role'] !== 'owner'
            && User::where('role', 'owner')->where('id', '!=', $user->id)->doesntExist()) {
            return back()->withErrors(['role' => 'Cannot demote the last owner — promote another user first.']);
        }

        $update = [
            'name' => $data['name'],
            'email' => $data['email'],
            'role' => $data['role'],
        ];
        if (! empty($data['password'])) {
            $update['password'] = Hash::make($data['password']);
        }
        $user->update($update);

        // AuditObserver writes 'role_changed' when role is in dirty fields, else 'updated'.
        return redirect()->route('users.index');
    }

    public function destroy(User $user): RedirectResponse
    {
        if ($user->id === Auth::id()) {
            return back()->withErrors(['user' => 'You cannot delete your own account.']);
        }
        // Last-owner guard: deleting the only other owner would leave the
        // current owner unable to delete themselves, but worse — if they
        // somehow lose access, there's no admin left.
        if ($user->role === 'owner'
            && User::where('role', 'owner')->where('id', '!=', $user->id)->doesntExist()) {
            return back()->withErrors(['user' => 'Cannot delete the last owner — promote another user first.']);
        }
        $user->delete();

        // AuditObserver writes 'deleted' automatically.
        return redirect()->route('users.index');
    }
}
