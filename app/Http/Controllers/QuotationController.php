<?php

namespace App\Http\Controllers;

use App\Mail\QuotationMail;
use App\Models\BrandLogo;
use App\Models\CompanySetting;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Quotation;
use App\Support\NumberToWords;
use App\Tenancy\TenantContext;
use Barryvdh\DomPDF\Facade\Pdf;
use chillerlan\QRCode\Output\QRGdImagePNG;
use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Standalone quotations — no order required. Every query is tenant-scoped
 * by the BelongsToTenant global scope, so a quotation from one workspace
 * is invisible to another. PDF embeds the company logo + brand-logo strip
 * as base64 data URIs (DomPDF can't fetch over the network).
 */
class QuotationController extends Controller
{
    public function index(Request $request): Response
    {
        $q = trim((string) $request->query('q', ''));
        $status = (string) $request->query('status', '');

        $paginated = Quotation::query()
            ->with('customer:id,name')
            ->when($q !== '', fn ($qq) => $qq->where(function ($w) use ($q) {
                $w->where('quotation_code', 'like', "%{$q}%")
                    ->orWhere('customer_name', 'like', "%{$q}%")
                    ->orWhere('customer_company', 'like', "%{$q}%");
            }))
            ->when($status !== '', fn ($qq) => $qq->where('status', $status))
            ->orderByDesc('quotation_date')
            ->orderByDesc('id')
            ->paginate(30)
            ->withQueryString();

        return Inertia::render('Quotations/Index', [
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
            'statuses' => Quotation::STATUSES,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Quotations/Create', $this->formData());
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validateQuotation($request);

        $tenantId = app(TenantContext::class)->id();
        $quotation = DB::transaction(function () use ($data, $tenantId) {
            $totals = $this->computeTotals($data['items'], (float) ($data['discount_amount'] ?? 0));

            $quotation = Quotation::create([
                'quotation_code' => Quotation::nextCode((int) $tenantId),
                'customer_id' => $data['customer_id'] ?? null,
                'customer_name' => $data['customer_name'],
                'customer_company' => $data['customer_company'] ?? null,
                'customer_address' => $data['customer_address'] ?? null,
                'customer_gstin' => $data['customer_gstin'] ?? null,
                'customer_state' => $data['customer_state'] ?? null,
                'customer_state_code' => $data['customer_state_code'] ?? null,
                'customer_phone' => $data['customer_phone'] ?? null,
                'customer_email' => $data['customer_email'] ?? null,
                'buyer_ref' => $data['buyer_ref'] ?? null,
                'other_references' => $data['other_references'] ?? null,
                'dispatched_through' => $data['dispatched_through'] ?? null,
                'destination' => $data['destination'] ?? null,
                'payment_terms' => $data['payment_terms'] ?? null,
                'delivery_terms' => $data['delivery_terms'] ?? null,
                'quotation_date' => $data['quotation_date'],
                'valid_until' => $data['valid_until'] ?? null,
                'status' => Quotation::STATUS_DRAFT,
                'discount_amount' => $data['discount_amount'] ?? 0,
                'hide_discount' => $data['hide_discount'] ?? false,
                'subtotal' => $totals['subtotal'],
                'tax_total' => $totals['tax_total'],
                'total' => $totals['total'],
                'notes' => $data['notes'] ?? null,
                'terms' => $data['terms'] ?? null,
                'created_by' => Auth::id(),
            ]);

            $this->syncItems($quotation, $data['items']);

            return $quotation;
        });

        return redirect()->route('quotations.show', $quotation);
    }

    public function show(Quotation $quotation): Response
    {
        $quotation->load(['items', 'customer:id,name', 'creator:id,name']);
        $company = CompanySetting::current();

        $brands = BrandLogo::query()
            ->orderBy('sort_order')->orderBy('name')->get()
            ->map(fn (BrandLogo $b) => ['name' => $b->name, 'data_uri' => $b->dataUri()])
            ->filter(fn ($b) => $b['data_uri'] !== null)
            ->values()
            ->all();

        return Inertia::render('Quotations/Show', [
            'quotation' => $quotation,
            'company' => [
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
            ],
            'logoBase64' => $this->imageAsDataUri($company->logo_path),
            'signatureBase64' => $this->imageAsDataUri($company->signature_path),
            'brands' => $brands,
            'upiQr' => $this->upiQr($company, $quotation),
            'layout' => $company->quotation_layout ?: 'classic',
            'amountInWords' => NumberToWords::rupees((float) $quotation->total),
        ]);
    }

    public function edit(Quotation $quotation): Response
    {
        $quotation->load('items');

        return Inertia::render('Quotations/Create', array_merge($this->formData(), [
            'quotation' => $quotation,
        ]));
    }

    public function update(Request $request, Quotation $quotation): RedirectResponse
    {
        $data = $this->validateQuotation($request);

        DB::transaction(function () use ($data, $quotation) {
            $totals = $this->computeTotals($data['items'], (float) ($data['discount_amount'] ?? 0));

            $quotation->update([
                'customer_id' => $data['customer_id'] ?? null,
                'customer_name' => $data['customer_name'],
                'customer_company' => $data['customer_company'] ?? null,
                'customer_address' => $data['customer_address'] ?? null,
                'customer_gstin' => $data['customer_gstin'] ?? null,
                'customer_state' => $data['customer_state'] ?? null,
                'customer_state_code' => $data['customer_state_code'] ?? null,
                'customer_phone' => $data['customer_phone'] ?? null,
                'customer_email' => $data['customer_email'] ?? null,
                'buyer_ref' => $data['buyer_ref'] ?? null,
                'other_references' => $data['other_references'] ?? null,
                'dispatched_through' => $data['dispatched_through'] ?? null,
                'destination' => $data['destination'] ?? null,
                'payment_terms' => $data['payment_terms'] ?? null,
                'delivery_terms' => $data['delivery_terms'] ?? null,
                'quotation_date' => $data['quotation_date'],
                'valid_until' => $data['valid_until'] ?? null,
                'discount_amount' => $data['discount_amount'] ?? 0,
                'hide_discount' => $data['hide_discount'] ?? false,
                'subtotal' => $totals['subtotal'],
                'tax_total' => $totals['tax_total'],
                'total' => $totals['total'],
                'notes' => $data['notes'] ?? null,
                'terms' => $data['terms'] ?? null,
            ]);

            $quotation->items()->delete();
            $this->syncItems($quotation, $data['items']);
        });

        return redirect()->route('quotations.show', $quotation);
    }

    public function updateStatus(Request $request, Quotation $quotation): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(Quotation::STATUSES)],
        ]);
        $quotation->update(['status' => $data['status']]);

        return back();
    }

    public function destroy(Quotation $quotation): RedirectResponse
    {
        $quotation->delete();

        return redirect()->route('quotations.index');
    }

    public function pdf(Request $request, Quotation $quotation): \Symfony\Component\HttpFoundation\Response
    {
        $pdf = $this->renderPdf($quotation);
        $file = "quotation-{$quotation->quotation_code}.pdf";

        // ?inline=1 streams it in the browser (for the Print button — the
        // viewer's print dialog); default downloads the file.
        return $request->boolean('inline')
            ? $pdf->stream($file)
            : $pdf->download($file);
    }

    /**
     * Email the quotation PDF to the customer (or a typed address) with a
     * branded HTML body. Marks a draft as 'sent' once delivered.
     */
    public function email(Request $request, Quotation $quotation): RedirectResponse
    {
        $data = $request->validate([
            'to' => ['required', 'email', 'max:150'],
            'cc' => ['nullable', 'email', 'max:150'],
            'message' => ['nullable', 'string', 'max:2000'],
        ]);

        $quotation->load('items');
        $company = CompanySetting::current();
        $pdf = $this->renderPdf($quotation)->output();

        Mail::to($data['to'])
            ->when($data['cc'] ?? null, fn ($m, $cc) => $m->cc($cc))
            ->send(new QuotationMail($quotation, $company, $this->brandData(), $pdf, $data['message'] ?? null));

        if ($quotation->status === Quotation::STATUS_DRAFT) {
            $quotation->update(['status' => 'sent']);
        }

        return back()->with('success', "Quotation emailed to {$data['to']}.");
    }

    /**
     * @return \Barryvdh\DomPDF\PDF
     */
    private function renderPdf(Quotation $quotation)
    {
        $quotation->loadMissing('items');
        $company = CompanySetting::current();

        return Pdf::loadView('pdf.quotation', [
            'quotation' => $quotation,
            'company' => $company,
            'logoBase64' => $this->imageAsDataUri($company->logo_path),
            'signatureBase64' => $this->imageAsDataUri($company->signature_path),
            'brands' => $this->brandData(),
            'upiQr' => $this->upiQr($company, $quotation),
            'layout' => $company->quotation_layout ?: 'classic',
            'amountInWords' => NumberToWords::rupees((float) $quotation->total),
        ])
            ->setPaper('a4', 'portrait')
            // Trusted, self-authored template only — enables the inline
            // <script type="text/php"> footer that prints page numbers.
            ->setOption('isPhpEnabled', true);
    }

    /**
     * UPI "scan to pay" QR as a PNG data URI, or null if no UPI ID is set.
     * Encodes a standard upi://pay deep link prefilled with the total.
     */
    private function upiQr(CompanySetting $company, Quotation $quotation): ?string
    {
        if (! $company->upi_id) {
            return null;
        }

        $params = http_build_query([
            'pa' => $company->upi_id,
            'pn' => $company->bank_account_holder ?: $company->company_name,
            'am' => number_format((float) $quotation->total, 2, '.', ''),
            'cu' => 'INR',
            'tn' => "Quotation {$quotation->quotation_code}",
        ]);

        return (new QRCode(new QROptions([
            'outputInterface' => QRGdImagePNG::class,
            'outputBase64' => true,
            'scale' => 5,
            'quietzoneSize' => 1,
        ])))->render("upi://pay?{$params}");
    }

    /**
     * @return array<int, array{name: string, data_uri: string}>
     */
    private function brandData(): array
    {
        return BrandLogo::query()
            ->orderBy('sort_order')->orderBy('name')->get()
            ->map(fn (BrandLogo $b) => ['name' => $b->name, 'data_uri' => $b->dataUri()])
            ->filter(fn ($b) => $b['data_uri'] !== null)
            ->values()
            ->all();
    }

    // ─── helpers ──────────────────────────────────────────────────────

    private function formData(): array
    {
        return [
            'customers' => Customer::query()->orderBy('name')->get(['id', 'name', 'company', 'gstin', 'phone', 'email']),
            'products' => Product::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'sku', 'hsn_code', 'unit', 'default_sale_price', 'gst_rate']),
            'nextCode' => Quotation::nextCode((int) app(TenantContext::class)->id()),
        ];
    }

    /** @return array<string, mixed> */
    private function validateQuotation(Request $request): array
    {
        $tenantId = app(TenantContext::class)->id();

        // exists:* rules use a raw DB query that bypasses the Eloquent
        // tenant scope. Scope the existence check to the active tenant so
        // a caller can't reference another workspace's customer/product id.
        $customerExists = Rule::exists('customers', 'id')->where('tenant_id', $tenantId);
        $productExists = Rule::exists('products', 'id')->where('tenant_id', $tenantId);

        return $request->validate([
            'customer_id' => ['nullable', 'integer', $customerExists],
            'customer_name' => ['required', 'string', 'max:150'],
            'customer_company' => ['nullable', 'string', 'max:150'],
            'customer_address' => ['nullable', 'string', 'max:1000'],
            'customer_gstin' => ['nullable', 'string', 'max:20'],
            'customer_state' => ['nullable', 'string', 'max:60'],
            'customer_state_code' => ['nullable', 'string', 'max:4'],
            'customer_phone' => ['nullable', 'string', 'max:20'],
            'customer_email' => ['nullable', 'email', 'max:150'],
            'buyer_ref' => ['nullable', 'string', 'max:80'],
            'other_references' => ['nullable', 'string', 'max:120'],
            'dispatched_through' => ['nullable', 'string', 'max:80'],
            'destination' => ['nullable', 'string', 'max:80'],
            'payment_terms' => ['nullable', 'string', 'max:120'],
            'delivery_terms' => ['nullable', 'string', 'max:120'],
            'quotation_date' => ['required', 'date'],
            'valid_until' => ['nullable', 'date', 'after_or_equal:quotation_date'],
            'discount_amount' => ['nullable', 'numeric', 'min:0', 'max:99999999'],
            'hide_discount' => ['boolean'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'terms' => ['nullable', 'string', 'max:2000'],
            'items' => ['required', 'array', 'min:1', 'max:200'],
            'items.*.product_id' => ['nullable', 'integer', $productExists],
            'items.*.product_name' => ['required', 'string', 'max:255'],
            'items.*.hsn_code' => ['nullable', 'string', 'max:20'],
            'items.*.qty' => ['required', 'numeric', 'min:0.001', 'max:9999999'],
            'items.*.unit' => ['nullable', 'string', 'max:20'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0', 'max:99999999'],
            'items.*.discount_pct' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'items.*.tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array{subtotal: float, tax_total: float, total: float}
     */
    private function computeTotals(array $items, float $orderDiscount): array
    {
        $subtotal = 0.0;
        $taxTotal = 0.0;
        foreach ($items as $it) {
            $qty = (float) $it['qty'];
            $rate = (float) $it['unit_price'];
            $discPct = (float) ($it['discount_pct'] ?? 0);
            $taxRate = (float) ($it['tax_rate'] ?? 0);
            $taxable = $qty * $rate * (1 - $discPct / 100);
            $subtotal += $taxable;
            $taxTotal += $taxable * $taxRate / 100;
        }
        $total = max(0.0, $subtotal + $taxTotal - $orderDiscount);

        return [
            'subtotal' => round($subtotal, 2),
            'tax_total' => round($taxTotal, 2),
            'total' => round($total, 2),
        ];
    }

    /** @param  array<int, array<string, mixed>>  $items */
    private function syncItems(Quotation $quotation, array $items): void
    {
        foreach (array_values($items) as $i => $it) {
            $qty = (float) $it['qty'];
            $rate = (float) $it['unit_price'];
            $discPct = (float) ($it['discount_pct'] ?? 0);
            $taxRate = (float) ($it['tax_rate'] ?? 0);
            $taxable = $qty * $rate * (1 - $discPct / 100);
            $lineTotal = round($taxable + ($taxable * $taxRate / 100), 2);

            $quotation->items()->create([
                'product_id' => $it['product_id'] ?? null,
                'product_name' => $it['product_name'],
                'hsn_code' => $it['hsn_code'] ?? null,
                'qty' => $qty,
                'unit' => $it['unit'] ?? null,
                'unit_price' => $rate,
                'discount_pct' => $discPct,
                'tax_rate' => $taxRate,
                'line_total' => $lineTotal,
                'sort_order' => $i,
            ]);
        }
    }

    private function imageAsDataUri(?string $relativePath): ?string
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
}
