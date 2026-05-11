<?php

namespace App\Http\Controllers;

use App\Models\CompanySetting;
use App\Support\ImageCompressor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class CompanySettingController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('Settings/Company', [
            'settings' => CompanySetting::current(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'company_name' => ['required', 'string', 'max:255'],
            'legal_name' => ['nullable', 'string', 'max:255'],
            'address_line_1' => ['nullable', 'string', 'max:255'],
            'address_line_2' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'state_code' => ['nullable', 'string', 'size:2'],
            'pincode' => ['nullable', 'string', 'max:10'],
            'gstin' => ['nullable', 'string', 'size:15'],
            'pan' => ['nullable', 'string', 'size:10'],
            'cin' => ['nullable', 'string', 'max:30'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'website' => ['nullable', 'string', 'max:255'],
            'bank_name' => ['nullable', 'string', 'max:255'],
            'bank_branch' => ['nullable', 'string', 'max:255'],
            'bank_account_number' => ['nullable', 'string', 'max:30'],
            'bank_ifsc' => ['nullable', 'string', 'max:15'],
            'upi_id' => ['nullable', 'string', 'max:50'],
            'signatory_name' => ['nullable', 'string', 'max:255'],
            'signatory_designation' => ['nullable', 'string', 'max:255'],
            'terms_and_conditions' => ['nullable', 'string'],
            'invoice_footer_note' => ['nullable', 'string'],
            'logo' => ['nullable', 'image', 'max:5120'],
            'signature' => ['nullable', 'image', 'max:5120'],
        ]);

        $settings = CompanySetting::current();

        if ($request->hasFile('logo')) {
            if ($settings->logo_path && Storage::disk('public')->exists($settings->logo_path)) {
                Storage::disk('public')->delete($settings->logo_path);
            }
            $path = $request->file('logo')->store('company', 'public');
            $absolute = Storage::disk('public')->path($path);
            $compressed = ImageCompressor::compress($absolute, 600, 90);
            if ($compressed !== $absolute) {
                $path = preg_replace('/\.(png|webp|jpe?g)$/i', '.jpg', $path);
                if (!str_ends_with(strtolower($path), '.jpg')) $path .= '.jpg';
            }
            $data['logo_path'] = $path;
        }

        if ($request->hasFile('signature')) {
            if ($settings->signature_path && Storage::disk('public')->exists($settings->signature_path)) {
                Storage::disk('public')->delete($settings->signature_path);
            }
            $path = $request->file('signature')->store('company', 'public');
            $absolute = Storage::disk('public')->path($path);
            // Signatures look better when slightly larger and on transparent background — but we
            // still compress for size. Keep wide max so handwriting stays legible.
            $compressed = ImageCompressor::compress($absolute, 800, 92);
            if ($compressed !== $absolute) {
                $path = preg_replace('/\.(png|webp|jpe?g)$/i', '.jpg', $path);
                if (!str_ends_with(strtolower($path), '.jpg')) $path .= '.jpg';
            }
            $data['signature_path'] = $path;
        }

        unset($data['logo'], $data['signature']);
        $settings->update($data);

        return back()->with('success', 'Company settings updated.');
    }
}
