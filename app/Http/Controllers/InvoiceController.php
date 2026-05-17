<?php

namespace App\Http\Controllers;

use App\Concerns\BuildsDocumentPdf;
use App\Mail\InvoiceMail;
use App\Models\CompanySetting;
use App\Models\Invoice;
use App\Models\Quotation;
use App\Support\NumberToWords;
use App\Tenancy\TenantContext;
use Barryvdh\DomPDF\PDF;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Tax invoices. Created by converting a quotation (the common path) and
 * rendered with the same parameterised pdf.quotation template. Every
 * query is tenant-scoped by the BelongsToTenant global scope.
 */
class InvoiceController extends Controller
{
    use BuildsDocumentPdf;

    public function index(Request $request): Response
    {
        $q = trim((string) $request->query('q', ''));
        $status = (string) $request->query('status', '');

        $paginated = Invoice::query()
            ->when($q !== '', fn ($qq) => $qq->where(function ($w) use ($q) {
                $w->where('invoice_code', 'like', "%{$q}%")
                    ->orWhere('customer_name', 'like', "%{$q}%")
                    ->orWhere('customer_company', 'like', "%{$q}%");
            }))
            ->when($status !== '', fn ($qq) => $qq->where('status', $status))
            ->orderByDesc('invoice_date')
            ->orderByDesc('id')
            ->paginate(30)
            ->withQueryString();

        return Inertia::render('Invoices/Index', [
            'rows' => $paginated->items(),
            'pagination' => [
                'total' => $paginated->total(),
                'per_page' => $paginated->perPage(),
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'from' => $paginated->firstItem(),
                'to' => $paginated->lastItem(),
            ],
            'filters' => ['q' => $q, 'status' => $status],
            'statuses' => Invoice::STATUSES,
        ]);
    }

    /** Convert a quotation into a draft tax invoice (copies all fields + items). */
    public function convert(Quotation $quotation): RedirectResponse
    {
        $quotation->load('items');
        $tenantId = (int) app(TenantContext::class)->id();

        $invoice = DB::transaction(function () use ($quotation, $tenantId) {
            $invoice = Invoice::create([
                'invoice_code' => Invoice::nextCode($tenantId),
                'quotation_id' => $quotation->id,
                'customer_id' => $quotation->customer_id,
                'customer_name' => $quotation->customer_name,
                'customer_company' => $quotation->customer_company,
                'customer_address' => $quotation->customer_address,
                'customer_gstin' => $quotation->customer_gstin,
                'customer_state' => $quotation->customer_state,
                'customer_state_code' => $quotation->customer_state_code,
                'customer_phone' => $quotation->customer_phone,
                'customer_email' => $quotation->customer_email,
                'buyer_ref' => $quotation->buyer_ref,
                'other_references' => $quotation->other_references,
                'dispatched_through' => $quotation->dispatched_through,
                'destination' => $quotation->destination,
                'payment_terms' => $quotation->payment_terms,
                'delivery_terms' => $quotation->delivery_terms,
                'invoice_date' => now()->toDateString(),
                'due_date' => null,
                'status' => Invoice::STATUS_DRAFT,
                'discount_amount' => $quotation->discount_amount,
                'hide_discount' => $quotation->hide_discount,
                'subtotal' => $quotation->subtotal,
                'tax_total' => $quotation->tax_total,
                'total' => $quotation->total,
                'notes' => $quotation->notes,
                'terms' => $quotation->terms,
                'created_by' => Auth::id(),
            ]);

            foreach ($quotation->items as $it) {
                $invoice->items()->create([
                    'product_id' => $it->product_id,
                    'product_name' => $it->product_name,
                    'hsn_code' => $it->hsn_code,
                    'qty' => $it->qty,
                    'unit' => $it->unit,
                    'unit_price' => $it->unit_price,
                    'discount_pct' => $it->discount_pct,
                    'tax_rate' => $it->tax_rate,
                    'line_total' => $it->line_total,
                    'sort_order' => $it->sort_order,
                ]);
            }

            return $invoice;
        });

        return redirect()
            ->route('invoices.show', $invoice)
            ->with('success', "Created {$invoice->invoice_code} from {$quotation->quotation_code}.");
    }

    public function show(Invoice $invoice): Response
    {
        $invoice->load(['items', 'customer:id,name', 'creator:id,name']);

        return Inertia::render('Invoices/Show', [
            'invoice' => $invoice,
            'amountInWords' => NumberToWords::rupees((float) $invoice->total),
        ]);
    }

    public function pdf(Request $request, Invoice $invoice): \Symfony\Component\HttpFoundation\Response
    {
        $pdf = $this->renderInvoicePdf($invoice);
        $file = "invoice-{$invoice->invoice_code}.pdf";

        return $request->boolean('inline')
            ? $pdf->stream($file)
            : $pdf->download($file);
    }

    public function email(Request $request, Invoice $invoice): RedirectResponse
    {
        $data = $request->validate([
            'to' => ['required', 'email', 'max:150'],
            'cc' => ['nullable', 'email', 'max:150'],
            'message' => ['nullable', 'string', 'max:2000'],
        ]);

        $invoice->load('items');
        $company = CompanySetting::current();
        $pdf = $this->renderInvoicePdf($invoice)->output();

        Mail::to($data['to'])
            ->when($data['cc'] ?? null, fn ($m, $cc) => $m->cc($cc))
            ->send(new InvoiceMail($invoice, $company, $this->brandData(), $pdf, $data['message'] ?? null));

        if ($invoice->status === Invoice::STATUS_DRAFT) {
            $invoice->update(['status' => Invoice::STATUS_SENT]);
        }

        return back()->with('success', "Invoice emailed to {$data['to']}.");
    }

    public function updateStatus(Request $request, Invoice $invoice): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(Invoice::STATUSES)],
        ]);
        $invoice->update(['status' => $data['status']]);

        return back();
    }

    public function destroy(Invoice $invoice): RedirectResponse
    {
        $invoice->delete();

        return redirect()->route('invoices.index');
    }

    /** @return PDF */
    private function renderInvoicePdf(Invoice $invoice)
    {
        $invoice->loadMissing('items');
        $company = CompanySetting::current();

        return $this->renderSharedPdf($invoice, $this->invoiceDoc($invoice), $company);
    }

    /** @return array<string, mixed> */
    private function invoiceDoc(Invoice $invoice): array
    {
        return [
            'title' => 'TAX INVOICE',
            'subtitle' => 'Original for Recipient',
            'codeLabel' => 'Invoice No.',
            'code' => $invoice->invoice_code,
            'date' => $invoice->invoice_date,
            'date2Label' => 'Due Date',
            'date2' => $invoice->due_date,
            'footer' => 'Tax invoice issued under GST &nbsp;·&nbsp; Subject to realisation of payment &nbsp;·&nbsp; Computer-generated, no signature required',
        ];
    }
}
