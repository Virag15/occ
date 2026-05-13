<?php

namespace App\Services\WhatsApp;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * AiSensy WhatsApp Business API client. Demo mode (WHATSAPP_ENABLED=false)
 * is the default — sendTemplate() logs the payload locally and returns a
 * fake message id. When the AiSensy account is provisioned, flip the env
 * flag + drop the API key in and the same call hits the live API.
 *
 * Mirrors the TallyClient pattern: services.whatsapp.* in config, the
 * Communication model logs every send (real or demo), and templates are
 * named so they map 1:1 to AiSensy-approved templates.
 */
class WhatsAppClient
{
    public function __construct(
        protected ?string $apiKey = null,
        protected ?string $endpoint = null,
        protected ?string $sender = null,
        protected int $timeoutSeconds = 15,
    ) {
        $this->apiKey ??= (string) config('services.whatsapp.api_key');
        $this->endpoint ??= (string) config('services.whatsapp.endpoint', 'https://backend.aisensy.com/campaign/t1/api/v2');
        $this->sender ??= (string) config('services.whatsapp.sender');
    }

    public function isEnabled(): bool
    {
        return (bool) config('services.whatsapp.enabled');
    }

    /** Diagnostic summary for the Integrations page. */
    public function summary(): array
    {
        return [
            'enabled' => $this->isEnabled(),
            'endpoint' => $this->endpoint,
            'sender' => $this->sender,
            'api_key_present' => $this->apiKey !== '',
        ];
    }

    /**
     * Send a templated WhatsApp message. Templates must already be approved
     * in AiSensy. `$params` are the placeholder values in template order.
     *
     * Returns ['ok' => bool, 'message_id' => string|null, 'error' => string|null].
     */
    public function sendTemplate(string $to, string $template, array $params = []): array
    {
        // Demo mode — log and return a fake id. No real send happens.
        if (! $this->isEnabled()) {
            $fakeId = 'DEMO-'.substr(md5($to.$template.microtime(true)), 0, 12);
            Log::info('WhatsApp demo send', ['to' => $to, 'template' => $template, 'params' => $params, 'fake_id' => $fakeId]);

            return ['ok' => true, 'message_id' => $fakeId, 'error' => null];
        }

        try {
            $response = Http::timeout($this->timeoutSeconds)
                ->withHeaders(['Authorization' => "Bearer {$this->apiKey}"])
                ->post($this->endpoint, [
                    'apiKey' => $this->apiKey,
                    'campaignName' => $template,
                    'destination' => $to,
                    'userName' => $this->sender,
                    'templateParams' => $params,
                ]);

            if (! $response->successful()) {
                return ['ok' => false, 'message_id' => null, 'error' => 'HTTP '.$response->status().': '.$response->body()];
            }

            return [
                'ok' => true,
                'message_id' => (string) ($response->json('submitted_message_id') ?? $response->json('messageId') ?? ''),
                'error' => null,
            ];
        } catch (ConnectionException $e) {
            return ['ok' => false, 'message_id' => null, 'error' => $e->getMessage()];
        }
    }
}
