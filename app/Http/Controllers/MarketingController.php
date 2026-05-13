<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Inertia\Response as InertiaResponse;

/**
 * Public marketing site. Server-rendered Blade (not Inertia) so the
 * pages load fast for SEO + non-customers. Routes are all unauthenticated.
 *
 * The root route (`/`) double-duties: for unauthed visitors, we render
 * the marketing home. For authed users, we delegate straight to the
 * DashboardController so the existing role-based-landing behavior is
 * preserved — and tests like RoleLandingTest keep passing.
 *
 * Contact form posts to submitLead() which currently stubs with a flash
 * message. P2.2 wires up the leads table + Slack/WhatsApp/email ping.
 */
class MarketingController extends Controller
{
    public function home(Request $request): View|RedirectResponse|InertiaResponse
    {
        // Authed users get the dashboard (with role-based redirects inside).
        // Delegate to the actual controller so behavior stays in one place.
        if ($request->user()) {
            return app(DashboardController::class)->index();
        }

        return view('marketing.home');
    }

    public function features(): View
    {
        return view('marketing.features');
    }

    public function tally(): View
    {
        return view('marketing.tally');
    }

    public function pricing(): View
    {
        return view('marketing.pricing');
    }

    public function about(): View
    {
        return view('marketing.about');
    }

    public function contact(): View
    {
        return view('marketing.contact');
    }

    /**
     * Contact form POST. Stub for P2.1 — validates input and returns a
     * thank-you flash. P2.2 will persist to `leads` table + send a
     * Slack/WhatsApp/email ping to the founder.
     */
    public function submitLead(Request $request): RedirectResponse
    {
        // Honeypot — bots fill this; humans don't even see it.
        if ($request->filled('company_website')) {
            return back()->with('lead_submitted', true);
        }

        $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'business_name' => ['required', 'string', 'max:150'],
            'phone' => ['required', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:150'],
            'current_software' => ['nullable', 'string', 'max:30'],
            'orders_per_month' => ['nullable', 'string', 'max:30'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        // TODO P2.2: Lead::create($request->validated()) + notify owner

        return back()->with('lead_submitted', true);
    }
}
