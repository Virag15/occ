<?php

namespace App\Http\Controllers;

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

    public function update(Request $request, User $user): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
            'role' => ['required', Rule::in(User::ROLES)],
        ]);

        $update = [
            'name' => $data['name'],
            'email' => $data['email'],
            'role' => $data['role'],
        ];
        if (!empty($data['password'])) {
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
        $user->delete();
        // AuditObserver writes 'deleted' automatically.
        return redirect()->route('users.index');
    }
}
