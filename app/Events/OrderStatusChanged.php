<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Broadcast when an order's status changes — fires from OrderController
 * actions (updateStatus, advance via shipments, etc.) and from auto-push
 * paths (Tally observer). Client-side: subscribe to the `orders` channel
 * and refresh the Order Show / Kanban / Tasks pages when this lands.
 *
 * Stays inert until BROADCAST_CONNECTION is set to a real driver
 * (reverb/pusher). Dispatching with `null` driver is a no-op so the rest
 * of the app's event::dispatch() calls don't fail in demo mode.
 */
class OrderStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Order $order,
        public string $oldStatus,
        public string $newStatus,
        public ?int $actorId = null,
    ) {}

    /** @return array<int, Channel> */
    public function broadcastOn(): array
    {
        // Public channel for the dashboard / kanban refresh; private would
        // require channel auth setup which can come later.
        return [new Channel('orders')];
    }

    public function broadcastAs(): string
    {
        return 'status.changed';
    }

    /** Compact payload — the client refetches order details on receipt. */
    public function broadcastWith(): array
    {
        return [
            'order_id' => $this->order->id,
            'order_code' => $this->order->order_code,
            'old_status' => $this->oldStatus,
            'new_status' => $this->newStatus,
            'actor_id' => $this->actorId,
            'at' => now()->toIso8601String(),
        ];
    }
}
