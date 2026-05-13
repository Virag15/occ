<?php

namespace App\Events;

use App\Models\Payment;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PaymentRecorded implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Payment $payment) {}

    /** @return array<int, Channel> */
    public function broadcastOn(): array
    {
        return [new Channel('payments')];
    }

    public function broadcastAs(): string
    {
        return 'payment.recorded';
    }

    public function broadcastWith(): array
    {
        return [
            'payment_id' => $this->payment->id,
            'order_id' => $this->payment->order_id,
            'amount' => $this->payment->amount,
            'mode' => $this->payment->mode,
            'paid_on' => $this->payment->paid_on?->toDateString(),
            'at' => now()->toIso8601String(),
        ];
    }
}
