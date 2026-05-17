<?php

namespace App\Mail;

use App\Models\CompanySetting;
use App\Models\Quotation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Branded HTML quotation email with the PDF attached. Brand logos are
 * embedded inline (CID) from their data URIs so they render in every
 * mail client (data: URIs are stripped by Gmail/Outlook).
 */
class QuotationMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  array<int, array{name: string, data_uri: string}>  $brands
     */
    public function __construct(
        public Quotation $quotation,
        public CompanySetting $company,
        public array $brands,
        public string $pdfData,
        public ?string $note = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Quotation {$this->quotation->quotation_code} from {$this->company->company_name}",
        );
    }

    public function content(): Content
    {
        return new Content(view: 'mail.quotation');
    }

    /**
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        return [
            Attachment::fromData(fn () => $this->pdfData, "Quotation-{$this->quotation->quotation_code}.pdf")
                ->withMime('application/pdf'),
        ];
    }
}
