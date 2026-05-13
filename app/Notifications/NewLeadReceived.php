<?php

namespace App\Notifications;

use App\Models\Lead;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Notification fired when a new lead lands in the database. Routes:
 *   - mail → MARKETING_NOTIFY_EMAIL (the founder's inbox)
 *
 * Slack webhook is handled out-of-band in MarketingController because
 * it's a single Http::post and doesn't need a full notification channel.
 */
class NewLeadReceived extends Notification
{
    use Queueable;

    public function __construct(public Lead $lead) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $l = $this->lead;
        $whatsappUrl = 'https://wa.me/'.preg_replace('/\D/', '', $l->phone);

        $message = (new MailMessage)
            ->subject("New OCC lead — {$l->business_name}")
            ->greeting('A new lead just came in.')
            ->line("**Business**: {$l->business_name}")
            ->line("**Contact**: {$l->name}")
            ->line("**Phone**: {$l->phone}")
            ->action('WhatsApp them now', $whatsappUrl);

        if ($l->email) {
            $message->line("**Email**: {$l->email}");
        }
        if ($l->current_software) {
            $message->line("**Current software**: {$l->current_software}");
        }
        if ($l->orders_per_month) {
            $message->line("**Orders / month**: {$l->orders_per_month}");
        }
        if ($l->notes) {
            $message->line('**Notes**:')->line($l->notes);
        }

        $message->line("Source: {$l->source}");
        if ($l->email) {
            $message->replyTo($l->email, $l->name);
        }

        return $message;
    }
}
