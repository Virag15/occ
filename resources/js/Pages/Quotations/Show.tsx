import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, FileDown, Pencil, Trash2, Mail, Send, Printer, Receipt } from '@/lib/icons';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useConfirm } from '@/components/confirm-dialog';
import { formatDateIN } from '@/lib/format';

type Item = {
    id: number; product_name: string; hsn_code: string | null;
    qty: string; unit: string | null; unit_price: string;
    discount_pct: string; tax_rate: string; line_total: string;
};

type Quotation = {
    id: number;
    quotation_code: string;
    customer_name: string;
    customer_company: string | null;
    customer_address: string | null;
    customer_gstin: string | null;
    customer_state: string | null;
    customer_state_code: string | null;
    customer_phone: string | null;
    customer_email: string | null;
    buyer_ref: string | null;
    other_references: string | null;
    dispatched_through: string | null;
    destination: string | null;
    payment_terms: string | null;
    delivery_terms: string | null;
    quotation_date: string;
    valid_until: string | null;
    status: string;
    subtotal: string;
    tax_total: string;
    discount_amount: string;
    hide_discount: boolean;
    total: string;
    notes: string | null;
    terms: string | null;
    items: Item[];
    creator?: { id: number; name: string } | null;
};

type Company = {
    company_name: string;
    legal_name: string | null;
    address_line_1: string | null;
    address_line_2: string | null;
    city: string | null;
    state: string | null;
    state_code: string | null;
    pincode: string | null;
    gstin: string | null;
    phone: string | null;
    email: string | null;
    bank_name: string | null;
    bank_branch: string | null;
    bank_account_number: string | null;
    bank_account_holder: string | null;
    bank_ifsc: string | null;
    upi_id: string | null;
    signatory_name: string | null;
    signatory_designation: string | null;
    invoice_footer_note: string | null;
    invoice_declaration: string | null;
};

type Brand = { name: string; data_uri: string };

type Props = {
    quotation: Quotation;
    company: Company;
    logoBase64: string | null;
    signatureBase64: string | null;
    brands: Brand[];
    upiQr: string | null;
    layout: string;
    amountInWords: string;
};

const STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired'];

const STATUS_VARIANT: Record<string, 'secondary' | 'default' | 'destructive' | 'outline'> = {
    draft: 'secondary',
    sent: 'outline',
    accepted: 'default',
    rejected: 'destructive',
    expired: 'secondary',
};

const inr2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Mirrors the PDF's `$money`: "₹ 1,234.00". */
const money = (v: string | number) => `₹ ${inr2.format(Number(v))}`;
const qtyFmt = (v: string) => String(Number(v)).replace(/\.?0+$/, (m) => (m.includes('.') ? '' : m));

/** Tiny tracked-out uppercase micro-label — mirrors the PDF's `.lbl`. */
function Lbl({ children }: { children: React.ReactNode }) {
    return (
        <div className="text-[9px] font-medium uppercase tracking-[0.06em] text-neutral-400">
            {children}
        </div>
    );
}

export default function QuotationShow({
    quotation, company, logoBase64, signatureBase64, brands, upiQr, layout, amountInWords,
}: Props) {
    const setStatus = (status: string) => {
        router.patch(`/quotations/${quotation.id}/status`, { status }, { preserveScroll: true });
    };

    const confirm = useConfirm();
    const destroy = async () => {
        const ok = await confirm({
            title: `Delete ${quotation.quotation_code}?`,
            description: 'This cannot be undone.',
            confirmText: 'Delete',
            destructive: true,
        });
        if (!ok) return;
        router.delete(`/quotations/${quotation.id}`);
    };

    const convertToInvoice = async () => {
        const ok = await confirm({
            title: `Convert ${quotation.quotation_code} to a tax invoice?`,
            description: 'Creates a new draft invoice with the same customer, items and totals. The quotation stays unchanged.',
            confirmText: 'Convert',
        });
        if (!ok) return;
        router.post(`/quotations/${quotation.id}/convert`);
    };

    const [mailOpen, setMailOpen] = useState(false);
    const mail = useForm({
        to: quotation.customer_email ?? '',
        cc: '',
        message: '',
    });
    const sendMail = (e: React.FormEvent) => {
        e.preventDefault();
        mail.post(`/quotations/${quotation.id}/email`, {
            preserveScroll: true,
            onSuccess: () => {
                setMailOpen(false);
                mail.reset('message', 'cc');
                toast.success(`Quotation emailed to ${mail.data.to}.`);
            },
            onError: (errs) => toast.error(Object.values(errs).join(', ') || 'Could not send the email.'),
        });
    };

    const addrLine = [
        company.address_line_1,
        company.address_line_2,
        [[company.city, company.state].filter(Boolean).join(', '), company.pincode].filter(Boolean).join(' ').trim(),
    ].filter(Boolean).join(', ');
    const contact = [company.phone, company.email].filter(Boolean).join(' · ');
    const showDiscCol = !quotation.hide_discount;
    const showDiscount = Number(quotation.discount_amount) > 0 && !quotation.hide_discount;
    const hasBank = company.bank_name || company.bank_account_number || company.bank_ifsc
        || company.upi_id || company.bank_account_holder;

    const sellerStateLine = [company.state, company.state_code && `Code ${company.state_code}`]
        .filter(Boolean).join(' · ');
    const buyerStateLine = [quotation.customer_state, quotation.customer_state_code && `Code ${quotation.customer_state_code}`]
        .filter(Boolean).join(' · ');
    const totalQty = quotation.items.reduce((s, it) => s + Number(it.qty), 0);
    const totalQtyStr = String(Number(totalQty.toFixed(3)));

    const sellerCode = (company.state_code ?? '').trim();
    const buyerCode = (quotation.customer_state_code ?? '').trim();
    const interState = sellerCode !== '' && buyerCode !== '' && sellerCode !== buyerCode;
    const taxTotalNum = Number(quotation.tax_total);

    const metaPairs = Object.entries({
        "Buyer's Ref. / Order No.": quotation.buyer_ref,
        'Other References': quotation.other_references,
        'Dispatched Through': quotation.dispatched_through,
        Destination: quotation.destination,
        'Mode / Terms of Payment': quotation.payment_terms,
        'Terms of Delivery': quotation.delivery_terms,
    }).filter(([, v]) => v != null && String(v).trim() !== '') as [string, string][];

    // HSN/SAC-wise tax summary (Tally / GST standard) — mirrors the PDF.
    const hsnMap = new Map<string, { hsn: string; rate: number; taxable: number; tax: number }>();
    for (const it of quotation.items) {
        const rate = Number(it.tax_rate);
        const hsn = it.hsn_code || '—';
        const taxable = Number(it.qty) * Number(it.unit_price) * (1 - Number(it.discount_pct) / 100);
        const tax = (taxable * rate) / 100;
        const key = `${hsn}@${rate}`;
        const row = hsnMap.get(key) ?? { hsn, rate, taxable: 0, tax: 0 };
        row.taxable += taxable;
        row.tax += tax;
        hsnMap.set(key, row);
    }
    const hsnRows = [...hsnMap.values()];
    const hsnTaxable = hsnRows.reduce((s, r) => s + r.taxable, 0);
    const hsnTax = hsnRows.reduce((s, r) => s + r.tax, 0);

    return (
        <AdminLayout breadcrumbs={[{ label: 'Quotations', href: '/quotations' }, { label: quotation.quotation_code }]}>
            <Head title={quotation.quotation_code} />

            <div className="-m-4 sm:-m-6">

            {/* ── App control bar — chrome, not the document ── */}
            <div className="sticky -top-4 z-30 border-b bg-background sm:-top-6">
                <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
                    <Button asChild variant="ghost" size="sm" className="-ml-2">
                        <Link href="/quotations"><ArrowLeft className="mr-1 h-4 w-4" /> Quotations</Link>
                    </Button>
                    <span className="font-mono text-sm font-semibold tracking-tight">{quotation.quotation_code}</span>
                    <Badge variant={STATUS_VARIANT[quotation.status] ?? 'secondary'} className="capitalize">
                        {quotation.status}
                    </Badge>

                    <div className="ml-auto flex flex-wrap items-center gap-2">
                        <Select value={quotation.status} onValueChange={setStatus}>
                            <SelectTrigger size="sm" className="w-32 capitalize"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {STATUSES.map((s) => (
                                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="default" size="sm" onClick={convertToInvoice}>
                            <Receipt className="mr-1 h-4 w-4" /> Convert to Invoice
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setMailOpen(true)}>
                            <Mail className="mr-1 h-4 w-4" /> Email
                        </Button>
                        <Button asChild variant="outline" size="sm">
                            <a href={`/quotations/${quotation.id}/pdf?inline=1`} target="_blank" rel="noopener">
                                <Printer className="mr-1 h-4 w-4" /> Print
                            </a>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                            <a href={`/quotations/${quotation.id}/pdf`}><FileDown className="mr-1 h-4 w-4" /> PDF</a>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                            <Link href={`/quotations/${quotation.id}/edit`}><Pencil className="mr-1 h-4 w-4" /> Edit</Link>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={destroy}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Email dialog */}
            <Dialog open={mailOpen} onOpenChange={setMailOpen}>
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={sendMail}>
                        <DialogHeader>
                            <DialogTitle>Email quotation {quotation.quotation_code}</DialogTitle>
                            <DialogDescription>
                                Sends a branded HTML email with the PDF attached. Marks a draft as “sent”.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3 py-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="mail_to" className="text-xs">To *</Label>
                                <Input id="mail_to" type="email" required value={mail.data.to}
                                       onChange={(e) => mail.setData('to', e.target.value)}
                                       placeholder="customer@example.com" />
                                {mail.errors.to && <p className="text-xs text-destructive">{mail.errors.to}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="mail_cc" className="text-xs">CC (optional)</Label>
                                <Input id="mail_cc" type="email" value={mail.data.cc}
                                       onChange={(e) => mail.setData('cc', e.target.value)} />
                                {mail.errors.cc && <p className="text-xs text-destructive">{mail.errors.cc}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="mail_msg" className="text-xs">Message (optional)</Label>
                                <Textarea id="mail_msg" rows={4} value={mail.data.message}
                                          onChange={(e) => mail.setData('message', e.target.value)}
                                          placeholder="Adds a short note above the summary in the email." />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setMailOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={mail.processing}>
                                <Send className="mr-1 h-4 w-4" />
                                {mail.processing ? 'Sending…' : 'Send email'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── The document — an exact on-screen mirror of the PDF ── */}
            <div className="bg-muted/40 px-4 py-8 sm:px-6 sm:py-12">
                <div className="mx-auto max-w-3xl">
                    <article className="border border-neutral-800 bg-white text-[12px] leading-snug text-neutral-900 shadow-sm dark:bg-white">

                        {/* Masthead */}
                        {layout === 'banner' ? (
                            <div className="border-b border-neutral-800">
                                <div className="px-3 pt-4 pb-3 text-center">
                                    {logoBase64 && (
                                        <img src={logoBase64} alt="" className="mx-auto max-h-[64px] max-w-[220px]" />
                                    )}
                                    <div className="mt-2 text-[20px] font-bold tracking-tight">{company.company_name}</div>
                                    <div className="mt-1 text-[10px] leading-relaxed text-neutral-500">
                                        {addrLine && <span>{addrLine} · </span>}
                                        GSTIN <span className="font-mono font-bold">{company.gstin || '—'}</span>
                                        {contact && <span> · {contact}</span>}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between border-t border-neutral-800 bg-neutral-100 px-3 py-1.5">
                                    <span className="text-[15px] font-bold tracking-[0.22em]">QUOTATION</span>
                                    <span className="text-[8px] uppercase tracking-[0.1em] text-neutral-500">Not a tax invoice</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center border-b border-neutral-800">
                                {logoBase64 && (
                                    <div className="flex shrink-0 items-center justify-center p-3">
                                        <img src={logoBase64} alt="" className="max-h-[52px] max-w-[84px]" />
                                    </div>
                                )}
                                <div className="min-w-0 flex-1 p-3">
                                    <div className="text-[17px] font-bold tracking-tight">{company.company_name}</div>
                                    <div className="mt-1 text-[10px] leading-relaxed text-neutral-500">
                                        {addrLine && <div>{addrLine}</div>}
                                        <div>
                                            GSTIN <span className="font-mono font-bold">{company.gstin || '—'}</span>
                                            {contact && <span> · {contact}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex w-[210px] shrink-0 flex-col items-end justify-center self-stretch border-l border-neutral-800 p-3 text-right">
                                    <div className="text-[20px] font-bold tracking-[0.08em]">QUOTATION</div>
                                    <div className="mt-0.5 text-[8px] uppercase tracking-[0.1em] text-neutral-400">
                                        Not a tax invoice
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Reference strip */}
                        <div className="grid grid-cols-4 border-b border-neutral-800">
                            {[
                                { k: 'Quotation No.', v: quotation.quotation_code, mono: true },
                                { k: 'Date', v: formatDateIN(quotation.quotation_date), mono: true },
                                { k: 'Valid Until', v: quotation.valid_until ? formatDateIN(quotation.valid_until) : '—', mono: true },
                                { k: 'Status', v: quotation.status, mono: false, cap: true },
                            ].map((c, i) => (
                                <div key={c.k} className={`px-3 py-2 ${i > 0 ? 'border-l border-neutral-200' : ''}`}>
                                    <Lbl>{c.k}</Lbl>
                                    <div className={`mt-0.5 text-[11px] font-bold ${c.mono ? 'font-mono' : ''} ${c.cap ? 'capitalize' : ''}`}>
                                        {c.v}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Reference / dispatch metadata */}
                        {metaPairs.length > 0 && (
                            <div className="grid grid-cols-2 border-b border-neutral-800">
                                {metaPairs.map(([k, v], i) => (
                                    <div
                                        key={k}
                                        className={`px-3 py-2 ${i % 2 === 1 ? 'border-l border-neutral-200' : ''} ${i >= 2 ? 'border-t border-neutral-200' : ''}`}
                                    >
                                        <Lbl>{k}</Lbl>
                                        <div className="mt-0.5 text-[11px]">{v}</div>
                                    </div>
                                ))}
                                {metaPairs.length % 2 === 1 && <div className="border-l border-neutral-200" />}
                            </div>
                        )}

                        {/* Parties */}
                        <div className="grid grid-cols-2 border-b border-neutral-800">
                            <div className="p-3">
                                <Lbl>Quotation for</Lbl>
                                <div className="mt-1 text-[14px] font-bold">
                                    {quotation.customer_company || quotation.customer_name}
                                </div>
                                {quotation.customer_company && quotation.customer_name && (
                                    <div className="mt-0.5 text-[11px] text-neutral-600">{quotation.customer_name}</div>
                                )}
                                {quotation.customer_address && (
                                    <div className="mt-0.5 text-[11px] text-neutral-600">{quotation.customer_address}</div>
                                )}
                                <div className="mt-0.5 text-[11px] text-neutral-600">
                                    GSTIN <span className="font-mono font-bold text-neutral-800">{quotation.customer_gstin || '—'}</span>
                                </div>
                                {buyerStateLine && (
                                    <div className="mt-0.5 text-[11px] text-neutral-600">State {buyerStateLine}</div>
                                )}
                                {quotation.customer_phone && (
                                    <div className="mt-0.5 text-[11px] text-neutral-600">{quotation.customer_phone}</div>
                                )}
                                {quotation.customer_email && (
                                    <div className="mt-0.5 text-[11px] text-neutral-600">{quotation.customer_email}</div>
                                )}
                            </div>
                            <div className="border-l border-neutral-800 p-3">
                                <Lbl>Supplier</Lbl>
                                <div className="mt-1 text-[14px] font-bold">{company.company_name}</div>
                                {addrLine && <div className="mt-0.5 text-[11px] text-neutral-600">{addrLine}</div>}
                                <div className="mt-0.5 text-[11px] text-neutral-600">
                                    GSTIN <span className="font-mono font-bold text-neutral-800">{company.gstin || '—'}</span>
                                </div>
                                {sellerStateLine && (
                                    <div className="mt-0.5 text-[11px] text-neutral-600">State {sellerStateLine}</div>
                                )}
                                {contact && <div className="mt-0.5 text-[11px] text-neutral-600">{contact}</div>}
                            </div>
                        </div>

                        {/* Items */}
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-neutral-800 bg-neutral-100 text-left text-[8.5px] uppercase tracking-[0.04em] text-neutral-500">
                                    <th className="w-8 px-2 py-2 text-center font-medium">#</th>
                                    <th className="px-2 py-2 font-medium">Description</th>
                                    <th className="w-12 border-l border-neutral-200 px-2 py-2 font-medium">HSN</th>
                                    <th className="w-14 border-l border-neutral-200 px-2 py-2 text-right font-medium">Qty</th>
                                    <th className="w-24 border-l border-neutral-200 px-2 py-2 text-right font-medium">Rate</th>
                                    {showDiscCol && (
                                        <th className="w-12 border-l border-neutral-200 px-2 py-2 text-right font-medium">Disc</th>
                                    )}
                                    <th className="w-12 border-l border-neutral-200 px-2 py-2 text-right font-medium">GST</th>
                                    <th className="w-28 border-l border-neutral-200 px-2 py-2 text-right font-medium">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {quotation.items.map((it, i) => {
                                    const last = i === quotation.items.length - 1;
                                    const rb = last ? 'border-b border-neutral-800' : 'border-b border-neutral-200';
                                    return (
                                        <tr key={it.id} className="align-top">
                                            <td className={`px-2 py-2 text-center font-mono text-[10px] text-neutral-400 ${rb}`}>
                                                {String(i + 1).padStart(2, '0')}
                                            </td>
                                            <td className={`px-2 py-2 font-semibold ${rb}`}>{it.product_name}</td>
                                            <td className={`border-l border-neutral-100 px-2 py-2 font-mono text-[11px] text-neutral-500 ${rb}`}>
                                                {it.hsn_code || '—'}
                                            </td>
                                            <td className={`border-l border-neutral-100 px-2 py-2 text-right font-mono tabular-nums whitespace-nowrap ${rb}`}>
                                                {qtyFmt(it.qty)}{it.unit ? ` ${it.unit}` : ''}
                                            </td>
                                            <td className={`border-l border-neutral-100 px-2 py-2 text-right font-mono tabular-nums ${rb}`}>
                                                {money(it.unit_price)}
                                            </td>
                                            {showDiscCol && (
                                                <td className={`border-l border-neutral-100 px-2 py-2 text-right font-mono tabular-nums ${rb}`}>
                                                    {Number(it.discount_pct) > 0 ? `${Number(it.discount_pct)}%` : '—'}
                                                </td>
                                            )}
                                            <td className={`border-l border-neutral-100 px-2 py-2 text-right font-mono tabular-nums ${rb}`}>
                                                {Number(it.tax_rate) > 0 ? `${Number(it.tax_rate)}%` : '—'}
                                            </td>
                                            <td className={`border-l border-neutral-100 px-2 py-2 text-right font-mono tabular-nums ${rb}`}>
                                                {money(it.line_total)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Totals + amount in words */}
                        <div className="flex border-b border-neutral-800">
                            <div className="flex-1 border-r border-neutral-800 p-3">
                                <Lbl>Amount chargeable (in words)</Lbl>
                                <div className="mt-1 text-[12px] font-bold italic text-neutral-800">{amountInWords}</div>
                            </div>
                            <div className="w-[260px] shrink-0">
                                <div className="flex justify-between px-3 py-1.5 text-[12px]">
                                    <span className="text-neutral-500">Total quantity</span>
                                    <span className="font-mono tabular-nums">{totalQtyStr}</span>
                                </div>
                                <div className="flex justify-between border-t border-neutral-100 px-3 py-1.5 text-[12px]">
                                    <span className="text-neutral-500">Subtotal</span>
                                    <span className="font-mono tabular-nums">{money(quotation.subtotal)}</span>
                                </div>
                                {showDiscount && (
                                    <div className="flex justify-between border-t border-neutral-100 px-3 py-1.5 text-[12px]">
                                        <span className="text-neutral-500">Discount</span>
                                        <span className="font-mono tabular-nums">− {money(quotation.discount_amount)}</span>
                                    </div>
                                )}
                                {interState ? (
                                    <div className="flex justify-between border-t border-neutral-100 px-3 py-1.5 text-[12px]">
                                        <span className="text-neutral-500">IGST</span>
                                        <span className="font-mono tabular-nums">{money(taxTotalNum)}</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex justify-between border-t border-neutral-100 px-3 py-1.5 text-[12px]">
                                            <span className="text-neutral-500">CGST</span>
                                            <span className="font-mono tabular-nums">{money(taxTotalNum / 2)}</span>
                                        </div>
                                        <div className="flex justify-between border-t border-neutral-100 px-3 py-1.5 text-[12px]">
                                            <span className="text-neutral-500">SGST</span>
                                            <span className="font-mono tabular-nums">{money(taxTotalNum / 2)}</span>
                                        </div>
                                    </>
                                )}
                                <div className="flex items-baseline justify-between border-t border-neutral-800 bg-neutral-100 px-3 py-2">
                                    <span className="text-[14px] font-bold">
                                        Total <span className="text-[10px] font-normal text-neutral-400">INR</span>
                                    </span>
                                    <span className="font-mono text-[15px] font-bold tabular-nums">{money(quotation.total)}</span>
                                </div>
                            </div>
                        </div>

                        {/* HSN / GST summary */}
                        {hsnRows.length > 0 && (
                            <div className="border-b border-neutral-800">
                                <div className="px-3 pt-2">
                                    <Lbl>HSN / SAC summary</Lbl>
                                </div>
                                <table className="mt-1.5 w-full border-collapse">
                                    <thead>
                                        <tr className="border-y border-neutral-800 bg-neutral-100 text-[8.5px] uppercase tracking-[0.04em] text-neutral-500">
                                            <th className="px-3 py-1.5 text-left font-medium">HSN/SAC</th>
                                            <th className="border-l border-neutral-200 px-3 py-1.5 text-right font-medium">Taxable value</th>
                                            {interState ? (
                                                <>
                                                    <th className="border-l border-neutral-200 px-3 py-1.5 text-right font-medium">IGST rate</th>
                                                    <th className="border-l border-neutral-200 px-3 py-1.5 text-right font-medium">IGST amount</th>
                                                </>
                                            ) : (
                                                <>
                                                    <th className="border-l border-neutral-200 px-3 py-1.5 text-right font-medium">CGST</th>
                                                    <th className="border-l border-neutral-200 px-3 py-1.5 text-right font-medium">SGST</th>
                                                </>
                                            )}
                                            <th className="border-l border-neutral-200 px-3 py-1.5 text-right font-medium">Total tax</th>
                                        </tr>
                                    </thead>
                                    <tbody className="font-mono tabular-nums text-[11px]">
                                        {hsnRows.map((r) => (
                                            <tr key={`${r.hsn}@${r.rate}`} className="border-b border-neutral-200">
                                                <td className="px-3 py-1.5 text-left">{r.hsn}</td>
                                                <td className="border-l border-neutral-100 px-3 py-1.5 text-right">{money(r.taxable)}</td>
                                                {interState ? (
                                                    <>
                                                        <td className="border-l border-neutral-100 px-3 py-1.5 text-right">{r.rate > 0 ? `${r.rate}%` : '—'}</td>
                                                        <td className="border-l border-neutral-100 px-3 py-1.5 text-right">{money(r.tax)}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="border-l border-neutral-100 px-3 py-1.5 text-right">{money(r.tax / 2)}</td>
                                                        <td className="border-l border-neutral-100 px-3 py-1.5 text-right">{money(r.tax / 2)}</td>
                                                    </>
                                                )}
                                                <td className="border-l border-neutral-100 px-3 py-1.5 text-right">{money(r.tax)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-b border-neutral-800 bg-neutral-50 font-bold">
                                            <td className="px-3 py-1.5 text-left">Total</td>
                                            <td className="border-l border-neutral-100 px-3 py-1.5 text-right font-mono tabular-nums">{money(hsnTaxable)}</td>
                                            {interState ? (
                                                <>
                                                    <td className="border-l border-neutral-100 px-3 py-1.5" />
                                                    <td className="border-l border-neutral-100 px-3 py-1.5 text-right font-mono tabular-nums">{money(hsnTax)}</td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="border-l border-neutral-100 px-3 py-1.5 text-right font-mono tabular-nums">{money(hsnTax / 2)}</td>
                                                    <td className="border-l border-neutral-100 px-3 py-1.5 text-right font-mono tabular-nums">{money(hsnTax / 2)}</td>
                                                </>
                                            )}
                                            <td className="border-l border-neutral-100 px-3 py-1.5 text-right font-mono tabular-nums">{money(hsnTax)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}

                        {/* Bank details — stacked, one line per field */}
                        {hasBank && (
                            <div className="flex items-start justify-between gap-4 border-b border-neutral-800 p-3">
                                <div>
                                <Lbl>Bank details for payment</Lbl>
                                <table className="mt-2 text-[11px]">
                                    <tbody>
                                        {company.bank_account_holder && (
                                            <tr>
                                                <td className="w-[90px] py-1 align-middle text-[9px] uppercase tracking-[0.06em] text-neutral-400">A/c Holder</td>
                                                <td className="py-1 align-middle">{company.bank_account_holder}</td>
                                            </tr>
                                        )}
                                        {company.bank_name && (
                                            <tr>
                                                <td className="w-[90px] py-1 align-middle text-[9px] uppercase tracking-[0.06em] text-neutral-400">Bank</td>
                                                <td className="py-1 align-middle">{company.bank_name}{company.bank_branch ? `, ${company.bank_branch}` : ''}</td>
                                            </tr>
                                        )}
                                        {company.bank_account_number && (
                                            <tr>
                                                <td className="w-[90px] py-1 align-middle text-[9px] uppercase tracking-[0.06em] text-neutral-400">A/C No.</td>
                                                <td className="py-1 align-middle font-mono">{company.bank_account_number}</td>
                                            </tr>
                                        )}
                                        {company.bank_ifsc && (
                                            <tr>
                                                <td className="w-[90px] py-1 align-middle text-[9px] uppercase tracking-[0.06em] text-neutral-400">IFSC</td>
                                                <td className="py-1 align-middle font-mono">{company.bank_ifsc}</td>
                                            </tr>
                                        )}
                                        {company.upi_id && (
                                            <tr>
                                                <td className="w-[90px] py-1 align-middle text-[9px] uppercase tracking-[0.06em] text-neutral-400">UPI</td>
                                                <td className="py-1 align-middle font-mono">{company.upi_id}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                                </div>
                                {upiQr && (
                                    <div className="shrink-0 text-center">
                                        <img src={upiQr} alt="UPI QR" className="h-[88px] w-[88px]" />
                                        <div className="mt-1 text-[8px] uppercase tracking-[0.06em] text-neutral-400">
                                            Scan &amp; pay via UPI
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Notes / terms */}
                        {(quotation.notes || quotation.terms) && (
                            <div className="grid grid-cols-2 border-b border-neutral-800">
                                <div className="p-3">
                                    <Lbl>Notes</Lbl>
                                    <p className="mt-1 whitespace-pre-line text-[11px] leading-relaxed text-neutral-600">
                                        {quotation.notes || '—'}
                                    </p>
                                </div>
                                <div className="border-l border-neutral-800 p-3">
                                    <Lbl>Terms &amp; conditions</Lbl>
                                    <p className="mt-1 whitespace-pre-line text-[11px] leading-relaxed text-neutral-600">
                                        {quotation.terms || '—'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Declaration */}
                        {company.invoice_declaration && (
                            <div className="border-b border-neutral-800 p-3">
                                <Lbl>Declaration</Lbl>
                                <p className="mt-1 whitespace-pre-line text-[11px] leading-relaxed text-neutral-600">
                                    {company.invoice_declaration}
                                </p>
                            </div>
                        )}

                        {/* Authorised dealer strip */}
                        {brands.length > 0 && (
                            <div className="flex flex-wrap items-center gap-5 border-b border-neutral-800 p-3">
                                <Lbl>Authorised dealer for</Lbl>
                                {brands.map((b) => (
                                    <img key={b.name} src={b.data_uri} alt={b.name} className="h-10 w-auto max-w-[110px]" />
                                ))}
                            </div>
                        )}

                        {/* Sign-off — supplier signatory only */}
                        <div className="flex min-h-[96px] flex-col items-end justify-between p-3 text-right">
                            <div className="text-[11px] text-neutral-500">For {company.company_name}</div>
                            {signatureBase64 && (
                                <img src={signatureBase64} alt="" className="my-1 max-h-[40px] max-w-[130px]" />
                            )}
                            <div className="mt-8 inline-block border-t border-neutral-700 pt-1 text-[11px]">
                                <div className="font-bold">{company.signatory_name || 'Authorised signatory'}</div>
                                {company.signatory_designation && (
                                    <div className="text-neutral-500">{company.signatory_designation}</div>
                                )}
                            </div>
                        </div>
                    </article>

                    <div className="mt-2 text-center text-[10px] tracking-wide text-neutral-400">
                        {company.invoice_footer_note && <>{company.invoice_footer_note}  ·  </>}
                        This is a quotation, not a tax invoice  ·  Prices valid till the date shown above  ·  Computer-generated, no signature required
                    </div>
                </div>
            </div>

            </div>
        </AdminLayout>
    );
}
