<?php

namespace App\Services\WhatsApp;

use App\Models\Customer;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Shipment;

/**
 * Template payload builders. Each method returns [template_name, params_array]
 * ready to feed into WhatsAppClient::sendTemplate(). Template names must match
 * what's been approved in AiSensy — keep the strings in sync with that account.
 *
 * Params are positional — the order matches the {{1}}, {{2}}, ... placeholders
 * in the AiSensy template body.
 */
class Templates
{
    /** Order confirmation right after the order is placed. */
    public static function orderConfirmed(Order $order, Customer $customer): array
    {
        return ['order_confirmed', [
            $customer->name,
            $order->order_code,
            $order->order_value !== null ? '₹ '.number_format((float) $order->order_value, 0) : '—',
        ]];
    }

    /** LR + transporter share — sent once the LR number is on a shipment. */
    public static function lrShared(Order $order, Shipment $shipment, Customer $customer): array
    {
        return ['lr_shared', [
            $customer->name,
            $order->order_code,
            $shipment->lr_number ?? '—',
            $shipment->transporter?->name ?? 'transporter',
        ]];
    }

    /** Dispatch notification — sent when status flips to dispatched. */
    public static function dispatched(Order $order, Customer $customer, ?string $trackingUrl = null): array
    {
        return ['dispatched', [
            $customer->name,
            $order->order_code,
            $trackingUrl ?? '',
        ]];
    }

    /** Delivery confirmation request — asks customer to confirm POD. */
    public static function deliveryConfirmation(Order $order, Customer $customer): array
    {
        return ['delivery_confirmation', [
            $customer->name,
            $order->order_code,
        ]];
    }

    /** Payment received — receipt acknowledgement. */
    public static function paymentReceived(Order $order, Payment $payment, Customer $customer): array
    {
        return ['payment_received', [
            $customer->name,
            '₹ '.number_format((float) $payment->amount, 0),
            $order->order_code,
            $payment->reference ?? '—',
        ]];
    }

    /** Payment reminder — sent on D+1 / D+7 after due date. */
    public static function paymentReminder(Order $order, Customer $customer, int $daysOverdue): array
    {
        $outstanding = max(0.0, (float) $order->order_value - (float) ($order->amount_received ?? 0));

        return ['payment_reminder', [
            $customer->name,
            $order->order_code,
            '₹ '.number_format($outstanding, 0),
            (string) $daysOverdue,
        ]];
    }
}
