<?php

namespace App\Concerns;

use App\Models\BrandLogo;
use App\Models\CompanySetting;
use App\Support\NumberToWords;
use Barryvdh\DomPDF\Facade\Pdf;
use chillerlan\QRCode\Output\QRGdImagePNG;
use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use Illuminate\Support\Facades\Storage;

/**
 * Shared building blocks for the quotation / invoice document (they use
 * the one parameterised pdf.quotation template). Keeps InvoiceController
 * from duplicating the company / brand / UPI-QR / render plumbing.
 */
trait BuildsDocumentPdf
{
    /** @return array<string, mixed> */
    protected function companyArray(CompanySetting $company): array
    {
        return [
            'company_name' => $company->company_name,
            'legal_name' => $company->legal_name,
            'address_line_1' => $company->address_line_1,
            'address_line_2' => $company->address_line_2,
            'city' => $company->city,
            'state' => $company->state,
            'state_code' => $company->state_code,
            'pincode' => $company->pincode,
            'gstin' => $company->gstin,
            'phone' => $company->phone,
            'email' => $company->email,
            'bank_name' => $company->bank_name,
            'bank_branch' => $company->bank_branch,
            'bank_account_number' => $company->bank_account_number,
            'bank_account_holder' => $company->bank_account_holder,
            'bank_ifsc' => $company->bank_ifsc,
            'upi_id' => $company->upi_id,
            'signatory_name' => $company->signatory_name,
            'signatory_designation' => $company->signatory_designation,
            'invoice_footer_note' => $company->invoice_footer_note,
            'invoice_declaration' => $company->invoice_declaration,
        ];
    }

    protected function imageAsDataUri(?string $relativePath): ?string
    {
        if (! $relativePath) {
            return null;
        }
        $disk = Storage::disk('public');
        if (! $disk->exists($relativePath)) {
            return null;
        }
        $absolute = $disk->path($relativePath);
        $mime = mime_content_type($absolute) ?: 'image/png';

        return 'data:'.$mime.';base64,'.base64_encode((string) file_get_contents($absolute));
    }

    /**
     * @return array<int, array{name: string, data_uri: string}>
     */
    protected function brandData(): array
    {
        return BrandLogo::query()
            ->orderBy('sort_order')->orderBy('name')->get()
            ->map(fn (BrandLogo $b) => ['name' => $b->name, 'data_uri' => $b->dataUri()])
            ->filter(fn ($b) => $b['data_uri'] !== null)
            ->values()
            ->all();
    }

    /** UPI "scan to pay" QR as a PNG data URI, or null if no UPI ID. */
    protected function upiQr(CompanySetting $company, float $total, string $label): ?string
    {
        if (! $company->upi_id) {
            return null;
        }

        $params = http_build_query([
            'pa' => $company->upi_id,
            'pn' => $company->bank_account_holder ?: $company->company_name,
            'am' => number_format($total, 2, '.', ''),
            'cu' => 'INR',
            'tn' => $label,
        ]);

        return (new QRCode(new QROptions([
            'outputInterface' => QRGdImagePNG::class,
            'outputBase64' => true,
            'scale' => 5,
            'quietzoneSize' => 1,
        ])))->render("upi://pay?{$params}");
    }

    /**
     * Render the shared pdf.quotation template for any document record.
     *
     * @param  array<string, mixed>  $doc
     * @return \Barryvdh\DomPDF\PDF
     */
    protected function renderSharedPdf(object $record, array $doc, CompanySetting $company)
    {
        return Pdf::loadView('pdf.quotation', [
            'quotation' => $record,
            'company' => $company,
            'doc' => $doc,
            'logoBase64' => $this->imageAsDataUri($company->logo_path),
            'signatureBase64' => $this->imageAsDataUri($company->signature_path),
            'brands' => $this->brandData(),
            'upiQr' => $this->upiQr($company, (float) $record->total, (string) $doc['code']),
            'layout' => $company->quotation_layout ?: 'classic',
            'amountInWords' => NumberToWords::rupees((float) $record->total),
        ])
            ->setPaper('a4', 'portrait')
            ->setOption('isPhpEnabled', true);
    }
}
