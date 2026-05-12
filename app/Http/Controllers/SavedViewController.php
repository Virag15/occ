<?php

namespace App\Http\Controllers;

use App\Models\SavedView;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class SavedViewController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'database_type' => ['required', 'string', 'max:50'],
            'name' => ['required', 'string', 'max:100'],
            'view_type' => ['required', Rule::in(['table', 'kanban', 'calendar', 'gallery'])],
            'config' => ['required', 'array'],
            'is_default' => ['nullable', 'boolean'],
        ]);

        DB::transaction(function () use ($data) {
            // Only one default per (user, database_type)
            if (!empty($data['is_default'])) {
                SavedView::where('user_id', Auth::id())
                    ->where('database_type', $data['database_type'])
                    ->update(['is_default' => false]);
            }

            SavedView::create([
                'user_id' => Auth::id(),
                'database_type' => $data['database_type'],
                'name' => $data['name'],
                'view_type' => $data['view_type'],
                'config' => $data['config'],
                'is_default' => $data['is_default'] ?? false,
            ]);
        });

        return back();
    }

    public function update(Request $request, SavedView $savedView): RedirectResponse
    {
        abort_if($savedView->user_id !== Auth::id(), 403);

        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:100'],
            'config' => ['nullable', 'array'],
            'is_default' => ['nullable', 'boolean'],
        ]);

        DB::transaction(function () use ($data, $savedView) {
            if (!empty($data['is_default'])) {
                SavedView::where('user_id', Auth::id())
                    ->where('database_type', $savedView->database_type)
                    ->where('id', '!=', $savedView->id)
                    ->update(['is_default' => false]);
            }
            $savedView->update(array_filter($data, fn ($v) => $v !== null));
        });

        return back();
    }

    public function destroy(SavedView $savedView): RedirectResponse
    {
        abort_if($savedView->user_id !== Auth::id(), 403);
        $savedView->delete();
        return back();
    }
}
