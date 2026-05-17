<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\IdempotencyKey;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * M7-B: the offline queue replays mutations on reconnect. The server
 * must absorb the replay so we never get a duplicate customer / order /
 * voucher.
 */
class IdempotencyMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    private function owner(): User
    {
        return User::factory()->create(['role' => 'owner']);
    }

    public function test_replay_with_same_key_does_not_double_write(): void
    {
        $this->actingAs($this->owner());
        $key = 'occ-'.str_repeat('a', 20);
        $payload = ['name' => 'Replayed Traders'];

        $first = $this->withHeader('Idempotency-Key', $key)->post('/customers', $payload);
        $first->assertRedirect();

        $replay = $this->withHeader('Idempotency-Key', $key)->post('/customers', $payload);
        $replay->assertRedirect();
        $replay->assertHeader('X-Idempotent-Replay', '1');

        $this->assertSame(1, Customer::where('name', 'Replayed Traders')->count());
        $this->assertSame(1, IdempotencyKey::where('key', $key)->count());
        $this->assertSame('completed', IdempotencyKey::where('key', $key)->first()->status);
    }

    public function test_requests_without_the_header_are_unaffected(): void
    {
        $this->actingAs($this->owner());

        $this->post('/customers', ['name' => 'No Key A'])->assertRedirect();
        $this->post('/customers', ['name' => 'No Key B'])->assertRedirect();

        $this->assertSame(2, Customer::whereIn('name', ['No Key A', 'No Key B'])->count());
        $this->assertSame(0, IdempotencyKey::count());
    }

    public function test_replay_while_first_in_flight_returns_409(): void
    {
        $this->actingAs($this->owner());
        $key = 'occ-inflight-000001';

        // Simulate the original still processing (row claimed, not completed).
        IdempotencyKey::create([
            'key' => $key, 'method' => 'POST', 'path' => 'customers', 'status' => 'processing',
        ]);

        $this->withHeader('Idempotency-Key', $key)
            ->post('/customers', ['name' => 'Racing'])
            ->assertStatus(409);

        $this->assertSame(0, Customer::where('name', 'Racing')->count());
    }
}
