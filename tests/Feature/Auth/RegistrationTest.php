<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_route_is_disabled_by_default(): void
    {
        // OCC is a B2B internal tool — public registration is off unless explicitly
        // re-enabled via ALLOW_PUBLIC_REGISTRATION=true. The route should not exist.
        $this->get('/register')->assertNotFound();
        $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertNotFound();
        $this->assertGuest();
    }
}
