<?php

namespace App\Services\Ocr;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * OCR provider abstraction. Demo mode (OCR_ENABLED=false) returns canned
 * field values keyed by evidence kind so the rest of the app can be built
 * against this contract before AWS Textract / Google Document AI is wired.
 *
 * Same pattern as TallyClient and WhatsAppClient — config in services.ocr.*,
 * and a single env flip swaps demo for real once credentials are dropped in.
 *
 * Supported providers (selected via OCR_PROVIDER):
 *   - 'textract' → AWS Textract analyze-document
 *   - 'gdai'     → Google Document AI process-document
 *   - 'demo'     → in-process canned data (default when OCR_ENABLED=false)
 */
class OcrClient
{
    public function __construct(
        protected ?string $provider = null,
        protected ?string $apiKey = null,
        protected ?string $region = null,
        protected int $timeoutSeconds = 30,
    ) {
        $this->provider ??= (string) config('services.ocr.provider', 'demo');
        $this->apiKey ??= (string) config('services.ocr.api_key');
        $this->region ??= (string) config('services.ocr.region', 'ap-south-1');
    }

    public function isEnabled(): bool
    {
        return (bool) config('services.ocr.enabled');
    }

    public function summary(): array
    {
        return [
            'enabled' => $this->isEnabled(),
            'provider' => $this->provider,
            'region' => $this->region,
            'api_key_present' => $this->apiKey !== '',
        ];
    }

    /**
     * Run OCR on an image. Returns an array of best-effort field extractions
     * keyed by the canonical field names OCC uses on shipments.
     *
     * @param  string  $imagePath  absolute path on the local filesystem
     * @param  string  $kind  one of: pod, triplicate, lr, parcel
     * @return array{
     *     ok: bool,
     *     fields: array<string,mixed>,
     *     confidence: array<string,float>,
     *     raw: array<string,mixed>|null,
     *     error: string|null
     * }
     */
    public function extract(string $imagePath, string $kind): array
    {
        if (! $this->isEnabled()) {
            return $this->demoResponse($kind);
        }

        if (! is_readable($imagePath)) {
            return ['ok' => false, 'fields' => [], 'confidence' => [], 'raw' => null, 'error' => 'File not readable: '.$imagePath];
        }

        try {
            return match ($this->provider) {
                'textract' => $this->callTextract($imagePath, $kind),
                'gdai' => $this->callDocumentAi($imagePath, $kind),
                default => $this->demoResponse($kind),
            };
        } catch (ConnectionException $e) {
            return ['ok' => false, 'fields' => [], 'confidence' => [], 'raw' => null, 'error' => $e->getMessage()];
        }
    }

    /**
     * Canned response per evidence kind. Useful for UI development and tests —
     * the values look real enough to drive the suggest-and-confirm flow.
     */
    private function demoResponse(string $kind): array
    {
        Log::info('OCR demo extract', ['kind' => $kind]);

        $fields = match ($kind) {
            'lr' => [
                'lr_number' => 'DEMO-LR-'.now()->format('Ymd').'-'.random_int(1000, 9999),
                'dispatch_date' => now()->toDateString(),
                'transporter_name_hint' => null,
            ],
            'pod' => [
                'delivered_date' => now()->subDays(1)->toDateString(),
                'signature_detected' => true,
                'receiver_name_hint' => null,
            ],
            'triplicate' => [
                'triplicate_received_date' => now()->toDateString(),
                'stamp_detected' => true,
                'invoice_number_hint' => null,
            ],
            'parcel' => [
                'number_of_boxes' => 1,
                'weight_kg' => null,
            ],
            default => [],
        };

        return [
            'ok' => true,
            'fields' => $fields,
            'confidence' => array_map(fn () => 0.0, $fields), // demo: 0 confidence so UI knows it's mock
            'raw' => ['provider' => 'demo'],
            'error' => null,
        ];
    }

    /**
     * AWS Textract path — stubbed out until credentials are present. Drops
     * the actual call here so swapping to real is just composer-require
     * aws/aws-sdk-php and removing the throw.
     */
    private function callTextract(string $imagePath, string $kind): array
    {
        throw new \RuntimeException(
            'Textract path not yet implemented. Install aws/aws-sdk-php, configure OCR_API_KEY/OCR_REGION, '
            .'and replace this stub with a Textract::analyzeDocument call. The demo response shape is the '
            .'target contract.'
        );
    }

    /**
     * Google Document AI path — same stub treatment.
     */
    private function callDocumentAi(string $imagePath, string $kind): array
    {
        // Reserved for the future google/cloud-document-ai integration.
        // Keep the unused arg names since they document the contract for the
        // real call: needs a processor name + the raw file bytes.
        unset($imagePath, $kind);

        $endpoint = (string) config('services.ocr.endpoint', '');
        $processor = (string) config('services.ocr.processor_id', '');

        if (empty($endpoint) || empty($processor)) {
            throw new \RuntimeException('Document AI requires services.ocr.endpoint + services.ocr.processor_id.');
        }

        // The actual call would Http::withToken(...)->post($endpoint . '/processors/' . $processor . ':process', [...])
        // Pending integration.
        $response = Http::timeout($this->timeoutSeconds);
        unset($response);

        throw new \RuntimeException('Document AI path not yet implemented.');
    }
}
