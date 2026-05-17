<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * M7-A: the app must be installable and keep its shell openable offline.
 * Static PWA files are served by the web server (not the Laravel router),
 * so we assert them on disk; the shell wiring is asserted in the rendered
 * HTML head.
 */
class PwaShellTest extends TestCase
{
    use RefreshDatabase;

    public function test_pwa_static_assets_exist_with_expected_content(): void
    {
        $base = public_path();

        $manifest = json_decode(file_get_contents("{$base}/manifest.webmanifest"), true);
        $this->assertSame('standalone', $manifest['display']);
        $this->assertSame('/dashboard?pwa=1', $manifest['start_url']);
        $this->assertNotEmpty($manifest['icons']);

        $sw = file_get_contents("{$base}/sw.js");
        $this->assertStringContainsString("addEventListener('fetch'", $sw);
        $this->assertStringContainsString('/offline.html', $sw);
        // The SW must never intercept mutations (writes belong to the queue).
        $this->assertStringContainsString("request.method !== 'GET'", $sw);

        $this->assertFileExists("{$base}/offline.html");
        $this->assertFileExists("{$base}/icon.svg");
    }

    public function test_app_shell_registers_sw_and_links_manifest(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'owner']));

        $html = $this->get('/dashboard')->assertOk()->getContent();

        $this->assertStringContainsString('rel="manifest" href="/manifest.webmanifest"', $html);
        $this->assertStringContainsString('theme-color', $html);
        $this->assertStringContainsString("navigator.serviceWorker.register('/sw.js')", $html);
    }
}
