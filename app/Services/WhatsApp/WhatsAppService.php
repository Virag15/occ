<?php

namespace App\Services\WhatsApp;

use App\Models\Communication;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Shipment;
use Illuminate\Support\Facades\Log;

/**
 * Application-level orchestration around WhatsAppClient. Every send writes
 * to `communications` so the order history has a permanent log regardless
 * of whether the bridge is in demo mode or live. Templates are picked
 * declaratively so callers don't construct AiSensy payloads.
 */
class WhatsAppService
{
    public function __construct(protected WhatsAppClient $client) {}

    public function sendOrderConfirmed(Order $order): ?Communication
    {
        $customer = $order->customer;
        if (! $customer || empty($customer->whatsapp ?: $customer->phone)) {
            return null;
        }
        [$template, $params] = Templates::orderConfirmed($order, $customer);

        return $this->dispatch($order, $customer->whatsapp ?: $customer->phone, $template, $params);
    }

    public function sendLrShared(Order $order, Shipment $shipment): ?Communication
    {
        $customer = $order->customer;
        if (! $customer || empty($customer->whatsapp ?: $customer->phone)) {
            return null;
        }
        [$template, $params] = Templates::lrShared($order, $shipment, $customer);

        return $this->dispatch($order, $customer->whatsapp ?: $customer->phone, $template, $params);
    }

    public function sendDispatched(Order $order, ?string $trackingUrl = null): ?Communication
    {
        $customer = $order->customer;
        if (! $customer || empty($customer->whatsapp ?: $customer->phone)) {
            return null;
        }
        $url = $trackingUrl ?? ($order->tracking_uuid ? url("/track/{$order->tracking_uuid}") : null);
        [$template, $params] = Templates::dispatched($order, $customer, $url);

        return $this->dispatch($order, $customer->whatsapp ?: $customer->phone, $template, $params);
    }

    public function sendPaymentReceived(Order $order, Payment $payment): ?Communication
    {
        $customer = $order->customer;
        if (! $customer || empty($customer->whatsapp ?: $customer->phone)) {
            return null;
        }
        [$template, $params] = Templates::paymentReceived($order, $payment, $customer);

        return $this->dispatch($order, $customer->whatsapp ?: $customer->phone, $template, $params);
    }

    public function sendPaymentReminder(Order $order, int $daysOverdue): ?Communication
    {
        $customer = $order->customer;
        if (! $customer || empty($customer->whatsapp ?: $customer->phone)) {
            return null;
        }
        [$template, $params] = Templates::paymentReminder($order, $customer, $daysOverdue);

        return $this->dispatch($order, $customer->whatsapp ?: $customer->phone, $template, $params);
    }

    private function dispatch(Order $order, string $to, string $template, array $params): Communication
    {
        $result = $this->client->sendTemplate($to, $template, $params);

        // Always record the attempt — even failures — so the timeline is honest.
        $communication = Communication::create([
            'order_id' => $order->id,
            'channel' => 'whatsapp',
            'template_name' => $template,
            'to_recipient' => $to,
            'body' => json_encode($params),
            'status' => $result['ok'] ? 'sent' : 'failed',
            'external_id' => $result['message_id'],
            'sent_at' => $result['ok'] ? now() : null,
        ]);

        if (! $result['ok']) {
            Log::warning('WhatsApp send failed', ['to' => $to, 'template' => $template, 'error' => $result['error']]);
        }

        return $communication;
    }
}
