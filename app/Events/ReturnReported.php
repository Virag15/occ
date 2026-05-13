<?php

namespace App\Events;

use App\Models\ReturnCase;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ReturnReported implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public ReturnCase $case) {}

    /** @return array<int, Channel> */
    public function broadcastOn(): array
    {
        return [new Channel('returns')];
    }

    public function broadcastAs(): string
    {
        return 'return.reported';
    }

    public function broadcastWith(): array
    {
        return [
            'return_id' => $this->case->id,
            'case_code' => $this->case->case_code,
            'order_id' => $this->case->related_order_id,
            'customer_id' => $this->case->customer_id,
            'severity' => $this->case->severity,
            'value_at_risk' => $this->case->value_at_risk,
            'at' => now()->toIso8601String(),
        ];
    }
}
