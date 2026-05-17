<?php

namespace App\Http\Controllers;

use App\Models\BrandLogo;
use App\Support\ImageCompressor;
use App\Tenancy\TenantContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Manage the brand logos a tenant deals in. These render on quotation /
 * invoice PDFs as an authorised-dealer strip. All queries are tenant-
 * scoped by the BelongsToTenant global scope, so one tenant can never
 * see or mutate another's brand logos.
 */
class BrandLogoController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Settings/Branding', [
            'brands' => BrandLogo::query()
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'name', 'logo_path', 'sort_order'])
                ->map(fn (BrandLogo $b) => [
                    'id' => $b->id,
                    'name' => $b->name,
                    'sort_order' => $b->sort_order,
                    // Public URL for on-screen preview only. The PDF uses a
                    // base64 data URI (BrandLogo::dataUri) instead.
                    'logo_url' => Storage::disk('public')->url($b->logo_path),
                ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'logo' => ['required', 'image', 'max:2048'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:999'],
        ]);

        $prefix = app(TenantContext::class)->storagePath('brand-logos');
        $path = $request->file('logo')->store($prefix, 'public');

        // Compress to keep PDFs small + consistent. Brand logos are small.
        $absolute = Storage::disk('public')->path($path);
        $compressed = ImageCompressor::compress($absolute, 400, 90);
        if ($compressed !== $absolute) {
            $path = preg_replace('/\.(png|webp|jpe?g)$/i', '.jpg', $path);
            if (! str_ends_with(strtolower($path), '.jpg')) {
                $path .= '.jpg';
            }
        }

        BrandLogo::create([
            'name' => $data['name'],
            'logo_path' => $path,
            'sort_order' => $data['sort_order'] ?? 0,
        ]);

        return back()->with('success', "Added {$data['name']} logo.");
    }

    public function destroy(BrandLogo $brandLogo): RedirectResponse
    {
        // Route-model binding already applies the tenant scope, so a
        // cross-tenant id 404s before reaching here. Defensive delete of
        // the file too.
        if ($brandLogo->logo_path && Storage::disk('public')->exists($brandLogo->logo_path)) {
            Storage::disk('public')->delete($brandLogo->logo_path);
        }
        $brandLogo->delete();

        return back()->with('success', 'Brand logo removed.');
    }
}
