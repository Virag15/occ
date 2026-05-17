<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use App\Notifications\NewLeadReceived;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\View\View;

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
    public function home(Request $request): View|RedirectResponse
    {
        // Authed users go to the Inertia app at /dashboard. We must NOT
        // render an Inertia response here: `/` also serves the Blade
        // marketing page to guests, and an Inertia XHR landing on Blade
        // triggers Inertia's white-modal overlay. A 302 to /dashboard
        // (a real Inertia route) keeps the two worlds cleanly separate.
        if ($request->user()) {
            return redirect()->route('dashboard');
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

    public function privacy(): View
    {
        return view('marketing.legal.privacy');
    }

    public function terms(): View
    {
        return view('marketing.legal.terms');
    }

    public function dpa(): View
    {
        return view('marketing.legal.dpa');
    }

    /**
     * Contact form POST. Persists the lead, then pings the founder via
     * email (always) and Slack (if a webhook URL is configured). The
     * honeypot field silently drops obvious bot traffic — same redirect
     * response as a real submission so bots can't probe by reading the
     * difference.
     */
    public function submitLead(Request $request): RedirectResponse
    {
        // Honeypot — bots fill this; humans don't see it. Drop silently.
        if ($request->filled('company_website')) {
            return back()->with('lead_submitted', true);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'business_name' => ['required', 'string', 'max:150'],
            'phone' => ['required', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:150'],
            'current_software' => ['nullable', 'string', 'max:30'],
            'orders_per_month' => ['nullable', 'string', 'max:30'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $lead = Lead::create($data + [
            'source' => Lead::SOURCE_CONTACT_FORM,
            'status' => Lead::STATUS_NEW,
            'utm_source' => $request->query('utm_source'),
            'utm_medium' => $request->query('utm_medium'),
            'utm_campaign' => $request->query('utm_campaign'),
            'referrer' => substr((string) $request->header('referer', ''), 0, 255),
            'ip' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 255),
        ]);

        $this->notifyFounder($lead);

        return back()->with('lead_submitted', true);
    }

    /**
     * Notify the founder of a new lead via every configured channel.
     * Failure to notify must not block the lead from being saved — we'd
     * rather have a quiet lead in the DB than no lead at all because
     * SMTP was momentarily down.
     */
    private function notifyFounder(Lead $lead): void
    {
        $email = (string) config('marketing.notify_email');
        if ($email !== '') {
            try {
                Notification::route('mail', $email)->notify(new NewLeadReceived($lead));
            } catch (\Throwable $e) {
                Log::warning('Failed to send new-lead email', [
                    'lead_id' => $lead->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $slack = (string) config('marketing.slack_webhook_url');
        if ($slack !== '') {
            try {
                $whatsappUrl = 'https://wa.me/'.preg_replace('/\D/', '', $lead->phone);
                $text = sprintf(
                    "*New OCC lead* — %s\n*Contact:* %s · %s%s\nWhatsApp: %s",
                    $lead->business_name,
                    $lead->name,
                    $lead->phone,
                    $lead->email ? " · {$lead->email}" : '',
                    $whatsappUrl,
                );
                Http::timeout(5)->post($slack, ['text' => $text]);
            } catch (\Throwable $e) {
                Log::warning('Failed to send new-lead Slack ping', [
                    'lead_id' => $lead->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }
}
