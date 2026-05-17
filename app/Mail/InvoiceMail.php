<?php

namespace App\Mail;

use App\Models\CompanySetting;
use App\Models\Invoice;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Branded HTML tax-invoice email with the PDF attached. Mirrors
 * QuotationMail; brand logos are embedded inline (CID).
 */
class InvoiceMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  array<int, array{name: string, data_uri: string}>  $brands
     */
    public function __construct(
        public Invoice $invoice,
        public CompanySetting $company,
        public array $brands,
        public string $pdfData,
        public ?string $note = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Tax Invoice {$this->invoice->invoice_code} from {$this->company->company_name}",
        );
    }

    public function content(): Content
    {
        return new Content(view: 'mail.invoice');
    }

    /**
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        return [
            Attachment::fromData(fn () => $this->pdfData, "Invoice-{$this->invoice->invoice_code}.pdf")
                ->withMime('application/pdf'),
        ];
    }
}
