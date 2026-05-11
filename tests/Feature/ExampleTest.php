<?php

namespace Tests\Feature;

use Tests\TestCase;

class ExampleTest extends TestCase
{
    public function test_login_page_renders(): void
    {
        $this->get('/login')->assertOk();
    }
}
