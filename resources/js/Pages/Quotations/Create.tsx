import { Head, Link, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import {
    CirclePlus, Trash2, Save, Building2, CalendarClock, Package,
    StickyNote, Search, UserPlus, X, Check, MapPin, Truck,
} from '@/lib/icons';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Combobox, type ComboOption } from '@/components/ui/combobox';
import { DatePicker } from '@/components/ui/date-picker';
import { Switch } from '@/components/ui/switch';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

type CustomerLite = { id: number; name: string; company: string | null; gstin: string | null; phone: string | null; email: string | null };
type ProductLite = { id: number; name: string; sku: string | null; hsn_code: string | null; unit: string | null; default_sale_price: string | null; gst_rate: string | null };

type Item = {
    product_id: number | null;
    product_name: string;
    hsn_code: string;
    qty: number;
    unit: string;
    unit_price: number;
    discount_pct: number;
    tax_rate: number;
};

type Quotation = {
    id: number;
    customer_id: number | null;
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
    discount_amount: string;
    hide_discount: boolean;
    notes: string | null;
    terms: string | null;
    items: Array<Item & { id: number }>;
};

type Props = {
    customers: CustomerLite[];
    products: ProductLite[];
    nextCode: string;
    quotation?: Quotation;
};

const blankItem = (): Item => ({
    product_id: null, product_name: '', hsn_code: '', qty: 1,
    unit: '', unit_price: 0, discount_pct: 0, tax_rate: 18,
});

/** Section heading — icon + label + optional hint. No card chrome. */
function SectionHead({ icon: Icon, title, hint }: { icon: typeof Building2; title: string; hint?: string }) {
    return (
        <div className="mb-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                <Icon className="h-4 w-4 text-muted-foreground" /> {title}
            </h2>
            {hint && <p className="mt-0.5 pl-6 text-xs text-muted-foreground">{hint}</p>}
        </div>
    );
}

function Field({ label, id, error, help, children }: {
    label: string; id: string; error?: string; help?: string; children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id} className="text-xs">{label}</Label>
            {children}
            {help && !error && <p className="text-[10px] text-muted-foreground">{help}</p>}
            {error && <p className="text-[10px] text-destructive">{error}</p>}
        </div>
    );
}

export default function QuotationCreate({ customers, products, nextCode, quotation }: Props) {
    const isEdit = !!quotation;

    const form = useForm({
        customer_id: quotation?.customer_id ?? null,
        customer_name: quotation?.customer_name ?? '',
        customer_company: quotation?.customer_company ?? '',
        customer_address: quotation?.customer_address ?? '',
        customer_gstin: quotation?.customer_gstin ?? '',
        customer_state: quotation?.customer_state ?? '',
        customer_state_code: quotation?.customer_state_code ?? '',
        customer_phone: quotation?.customer_phone ?? '',
        customer_email: quotation?.customer_email ?? '',
        buyer_ref: quotation?.buyer_ref ?? '',
        other_references: quotation?.other_references ?? '',
        dispatched_through: quotation?.dispatched_through ?? '',
        destination: quotation?.destination ?? '',
        payment_terms: quotation?.payment_terms ?? '',
        delivery_terms: quotation?.delivery_terms ?? '',
        quotation_date: quotation?.quotation_date ?? new Date().toISOString().slice(0, 10),
        valid_until: quotation?.valid_until ?? '',
        discount_amount: quotation ? Number(quotation.discount_amount) : 0,
        hide_discount: quotation?.hide_discount ?? false,
        notes: quotation?.notes ?? '',
        terms: quotation?.terms ?? '',
        items: (quotation?.items?.map((i) => ({
            product_id: i.product_id, product_name: i.product_name, hsn_code: i.hsn_code ?? '',
            qty: Number(i.qty), unit: i.unit ?? '', unit_price: Number(i.unit_price),
            discount_pct: Number(i.discount_pct), tax_rate: Number(i.tax_rate),
        })) ?? [blankItem()]) as Item[],
    });

    // Editing an ad-hoc quote (typed customer, not linked) → start in manual mode.
    const [manual, setManual] = useState<boolean>(isEdit && !quotation?.customer_id && !!quotation?.customer_name);
    const [showAddr, setShowAddr] = useState<boolean>(!!quotation?.customer_address);

    const selectedCustomer = useMemo(
        () => customers.find((c) => c.id === form.data.customer_id) ?? null,
        [customers, form.data.customer_id],
    );

    const customerOptions: ComboOption[] = useMemo(
        () => customers.map((c) => ({
            value: String(c.id),
            label: c.company || c.name,
            sublabel: [c.company ? c.name : null, c.gstin, c.phone].filter(Boolean).join(' · ') || undefined,
        })),
        [customers],
    );
    const productOptions: ComboOption[] = useMemo(
        () => products.map((p) => ({ value: String(p.id), label: p.name, sublabel: p.sku ?? (p.hsn_code ?? undefined) })),
        [products],
    );

    const setDate = (key: 'quotation_date' | 'valid_until') => (d: Date | undefined) => {
        if (!d) { form.setData(key, ''); return; }
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        form.setData(key, `${yyyy}-${mm}-${dd}`);
    };

    const setItem = (idx: number, patch: Partial<Item>) =>
        form.setData('items', form.data.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

    const pickProduct = (idx: number, productId: string) => {
        const p = products.find((x) => String(x.id) === productId);
        if (!p) return;
        setItem(idx, {
            product_id: p.id, product_name: p.name, hsn_code: p.hsn_code ?? '',
            unit: p.unit ?? '', unit_price: Number(p.default_sale_price ?? 0),
            tax_rate: Number(p.gst_rate ?? 18),
        });
    };

    const pickCustomer = (id: string) => {
        const c = customers.find((x) => String(x.id) === id);
        if (!c) return;
        setManual(false);
        form.setData((d) => ({
            ...d,
            customer_id: c.id,
            customer_name: c.name,
            customer_company: c.company ?? '',
            customer_gstin: c.gstin ?? '',
            customer_phone: c.phone ?? '',
            customer_email: c.email ?? '',
            customer_address: d.customer_address,
        }));
    };

    const clearCustomer = () => {
        form.setData((d) => ({
            ...d, customer_id: null, customer_name: '', customer_company: '',
            customer_gstin: '', customer_phone: '', customer_email: '',
        }));
        setManual(false);
    };

    const totals = useMemo(() => {
        let subtotal = 0, tax = 0;
        for (const it of form.data.items) {
            const taxable = it.qty * it.unit_price * (1 - it.discount_pct / 100);
            subtotal += taxable;
            tax += (taxable * it.tax_rate) / 100;
        }
        return { subtotal, tax, total: Math.max(0, subtotal + tax - form.data.discount_amount) };
    }, [form.data.items, form.data.discount_amount]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        isEdit ? form.put(`/quotations/${quotation!.id}`) : form.post('/quotations');
    };

    const SaveBtn = ({ size }: { size?: 'sm' }) => (
        <Button type="submit" size={size} disabled={form.processing}>
            <Save className={cn('mr-1', size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
            {form.processing ? 'Saving…' : isEdit ? 'Update quotation' : 'Create quotation'}
        </Button>
    );

    return (
        <AdminLayout breadcrumbs={[{ label: 'Quotations', href: '/quotations' }, { label: isEdit ? 'Edit' : 'New' }]}>
            <Head title={isEdit ? 'Edit quotation' : 'New quotation'} />

            <form onSubmit={submit} noValidate>
              {/* Cancel AdminLayout's <main> padding so the sticky bar pins flush
                  to the scroll-container top (no padding strip to bleed through). */}
              <div className="-m-4 sm:-m-6">
                {/* Sticky action bar — title, live customer + total, actions.
                    Negative top offset cancels <main>'s p-4/sm:p-6 so the bar
                    pins flush to the scroll-container edge (no bleed band). */}
                <div className="sticky -top-4 z-30 flex items-center gap-4 border-b bg-background px-4 py-3 shadow-sm sm:-top-6 sm:px-6">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold leading-tight">
                            {isEdit ? 'Edit quotation' : 'New quotation'}
                        </p>
                        <p className="truncate font-mono text-[11px] text-muted-foreground">
                            {isEdit ? quotation!.id && `#${quotation!.id}` : nextCode} · no order required
                        </p>
                    </div>

                    {/* Live state — fills the bar with what actually matters */}
                    <div className="ml-auto hidden items-center gap-6 md:flex">
                        <div className="text-right">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Customer</p>
                            <p className="max-w-[200px] truncate text-xs font-medium">
                                {selectedCustomer?.company || selectedCustomer?.name || form.data.customer_name || '—'}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
                            <p className="font-mono text-sm font-semibold tabular-nums">{formatCurrency(totals.total)}</p>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 md:ml-6">
                        <Button type="button" variant="ghost" size="sm" asChild>
                            <Link href="/quotations">Cancel</Link>
                        </Button>
                        <SaveBtn size="sm" />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-x-10 gap-y-8 px-4 py-6 sm:px-6 lg:grid-cols-3">
                    {/* ── Main column ───────────────────────────────── */}
                    <div className="space-y-10 lg:col-span-2">

                        {/* Customer — search first, add-new optional */}
                        <section>
                            <SectionHead
                                icon={Building2}
                                title="Customer"
                                hint="Search an existing customer. Only add a one-off if they're not in the list."
                            />

                            {selectedCustomer ? (
                                <div className="flex items-start justify-between gap-4 rounded-lg border bg-muted/30 px-4 py-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                                            <span className="truncate font-medium">
                                                {selectedCustomer.company || selectedCustomer.name}
                                            </span>
                                        </div>
                                        <div className="mt-1 pl-6 text-xs text-muted-foreground">
                                            {[
                                                selectedCustomer.company ? selectedCustomer.name : null,
                                                selectedCustomer.gstin,
                                                selectedCustomer.phone,
                                            ].filter(Boolean).join('  ·  ') || '—'}
                                        </div>
                                    </div>
                                    <Button type="button" variant="ghost" size="sm" onClick={clearCustomer}
                                            className="shrink-0 text-muted-foreground">
                                        <X className="mr-1 h-3.5 w-3.5" /> Change
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-3 top-3 z-10 h-4 w-4 text-muted-foreground" />
                                        <Combobox
                                            value=""
                                            onChange={pickCustomer}
                                            options={customerOptions}
                                            placeholder="Search customer — name, company, GSTIN, phone…"
                                            searchPlaceholder="Type to search customers…"
                                            className="h-11 pl-9 text-[15px]"
                                        />
                                    </div>
                                    {!manual ? (
                                        <button
                                            type="button"
                                            onClick={() => setManual(true)}
                                            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                                        >
                                            <UserPlus className="h-3.5 w-3.5" />
                                            Not in the list? Add a one-off customer
                                        </button>
                                    ) : (
                                        <div className="rounded-lg border border-dashed p-4">
                                            <div className="mb-3 flex items-center justify-between">
                                                <span className="text-xs font-medium text-muted-foreground">One-off customer (this quote only)</span>
                                                <Button type="button" variant="ghost" size="sm"
                                                        onClick={() => { setManual(false); clearCustomer(); }}
                                                        className="h-6 px-2 text-muted-foreground">
                                                    <X className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <Field label="Contact name *" id="customer_name" error={form.errors.customer_name}>
                                                    <Input id="customer_name" value={form.data.customer_name}
                                                           onChange={(e) => form.setData('customer_name', e.target.value)} />
                                                </Field>
                                                <Field label="Company" id="customer_company" error={form.errors.customer_company}>
                                                    <Input id="customer_company" value={form.data.customer_company}
                                                           onChange={(e) => form.setData('customer_company', e.target.value)} />
                                                </Field>
                                                <Field label="GSTIN" id="customer_gstin" error={form.errors.customer_gstin}>
                                                    <Input id="customer_gstin" className="font-mono text-xs"
                                                           value={form.data.customer_gstin}
                                                           onChange={(e) => form.setData('customer_gstin', e.target.value)} />
                                                </Field>
                                                <Field label="Phone" id="customer_phone" error={form.errors.customer_phone}>
                                                    <Input id="customer_phone" className="font-mono text-xs"
                                                           value={form.data.customer_phone}
                                                           onChange={(e) => form.setData('customer_phone', e.target.value)} />
                                                </Field>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Address is secondary — a quiet disclosure, not a
                                big box hogging the top of the form. */}
                            <div className="mt-3">
                                {showAddr ? (
                                    <Field label="Delivery / site address (optional)" id="customer_address">
                                        <Textarea id="customer_address" rows={2} maxLength={1000}
                                                  placeholder="Overrides the master address on this quote only"
                                                  value={form.data.customer_address}
                                                  onChange={(e) => form.setData('customer_address', e.target.value)} />
                                    </Field>
                                ) : (
                                    <button type="button"
                                            onClick={() => setShowAddr(true)}
                                            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                                        <MapPin className="h-3.5 w-3.5" />
                                        Add delivery / site address
                                    </button>
                                )}
                            </div>
                            {form.errors.customer_name && !manual && !selectedCustomer && (
                                <p className="mt-2 text-[10px] text-destructive">
                                    Pick a customer or add a one-off customer.
                                </p>
                            )}
                        </section>

                        <Separator />

                        {/* Line items */}
                        <section>
                            <div className="mb-4 flex items-center justify-between">
                                <SectionHead icon={Package} title="Line items" />
                                <div className="flex items-center gap-3">
                                    <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                                        <Switch
                                            checked={form.data.hide_discount}
                                            onCheckedChange={(v: boolean) => form.setData('hide_discount', v)}
                                        />
                                        Hide discount on PDF
                                    </label>
                                    <Button type="button" variant="outline" size="sm"
                                            onClick={() => form.setData('items', [...form.data.items, blankItem()])}>
                                        <CirclePlus className="mr-1 h-3.5 w-3.5" /> Add line
                                    </Button>
                                </div>
                            </div>
                            <div className="-mx-1 overflow-x-auto">
                                <table className="w-full min-w-[680px] text-sm">
                                    <thead>
                                        <tr className="text-xs text-muted-foreground">
                                            <th className="px-2 py-2 text-left font-medium" style={{ minWidth: 240 }}>Product / description</th>
                                            <th className="px-2 py-2 text-right font-medium" style={{ width: 80 }}>Qty</th>
                                            <th className="px-2 py-2 text-left font-medium" style={{ width: 56 }}>Unit</th>
                                            <th className="px-2 py-2 text-right font-medium" style={{ width: 110 }}>Rate</th>
                                            <th className="px-2 py-2 text-right font-medium" style={{ width: 72 }}>Disc %</th>
                                            <th className="px-2 py-2 text-right font-medium" style={{ width: 72 }}>GST %</th>
                                            <th className="px-2 py-2 text-right font-medium" style={{ width: 110 }}>Amount</th>
                                            <th className="px-2 py-2" style={{ width: 36 }} />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {form.data.items.map((it, i) => {
                                            const taxable = it.qty * it.unit_price * (1 - it.discount_pct / 100);
                                            const lineTotal = taxable + (taxable * it.tax_rate) / 100;
                                            return (
                                                <tr key={i} className="border-t border-border/40 align-top">
                                                    <td className="px-2 py-2">
                                                        <Combobox
                                                            value={it.product_id ? String(it.product_id) : ''}
                                                            onChange={(v) => pickProduct(i, v)}
                                                            options={productOptions}
                                                            placeholder="Pick product"
                                                            searchPlaceholder="Search products…"
                                                        />
                                                        <Input className="mt-1 h-8" placeholder="Description *"
                                                               value={it.product_name} maxLength={255}
                                                               onChange={(e) => setItem(i, { product_name: e.target.value })} />
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <Input type="number" step="0.001" min="0" className="h-8 text-right tabular-nums"
                                                               value={it.qty} onChange={(e) => setItem(i, { qty: Number(e.target.value) })} />
                                                    </td>
                                                    <td className="px-2 py-2 text-xs text-muted-foreground">{it.unit || '—'}</td>
                                                    <td className="px-2 py-2">
                                                        <Input type="number" step="0.01" min="0" className="h-8 text-right tabular-nums"
                                                               value={it.unit_price} onChange={(e) => setItem(i, { unit_price: Number(e.target.value) })} />
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <Input type="number" step="0.01" min="0" max="100" className="h-8 text-right tabular-nums"
                                                               value={it.discount_pct} onChange={(e) => setItem(i, { discount_pct: Number(e.target.value) })} />
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <Input type="number" step="0.01" min="0" max="100" className="h-8 text-right tabular-nums"
                                                               value={it.tax_rate} onChange={(e) => setItem(i, { tax_rate: Number(e.target.value) })} />
                                                    </td>
                                                    <td className="px-2 py-2 text-right font-mono tabular-nums">
                                                        {formatCurrency(lineTotal)}
                                                    </td>
                                                    <td className="px-2 py-2 text-center">
                                                        {form.data.items.length > 1 && (
                                                            <Button type="button" variant="ghost" size="icon"
                                                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                                    onClick={() => form.setData('items', form.data.items.filter((_, x) => x !== i))}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {form.errors.items && <p className="mt-2 text-[10px] text-destructive">{form.errors.items}</p>}
                        </section>

                        <Separator />

                        {/* Dispatch & references — Tally invoice-parity block */}
                        <section>
                            <SectionHead
                                icon={Truck}
                                title="Dispatch & references"
                                hint="Optional. Place of supply drives the CGST/SGST vs IGST split on the PDF."
                            />
                            <div className="grid gap-4 sm:grid-cols-3">
                                <Field label="Buyer state (place of supply)" id="customer_state" error={form.errors.customer_state}>
                                    <Input id="customer_state" value={form.data.customer_state}
                                           placeholder="e.g. Maharashtra"
                                           onChange={(e) => form.setData('customer_state', e.target.value)} />
                                </Field>
                                <Field label="State code" id="customer_state_code" error={form.errors.customer_state_code} help="2-digit GST code, e.g. 27">
                                    <Input id="customer_state_code" className="font-mono text-xs"
                                           value={form.data.customer_state_code} maxLength={4}
                                           onChange={(e) => form.setData('customer_state_code', e.target.value)} />
                                </Field>
                                <Field label="Buyer's Ref. / Order No." id="buyer_ref" error={form.errors.buyer_ref}>
                                    <Input id="buyer_ref" value={form.data.buyer_ref}
                                           onChange={(e) => form.setData('buyer_ref', e.target.value)} />
                                </Field>
                                <Field label="Other references" id="other_references" error={form.errors.other_references}>
                                    <Input id="other_references" value={form.data.other_references}
                                           onChange={(e) => form.setData('other_references', e.target.value)} />
                                </Field>
                                <Field label="Dispatched through" id="dispatched_through" error={form.errors.dispatched_through}>
                                    <Input id="dispatched_through" value={form.data.dispatched_through}
                                           placeholder="e.g. By road"
                                           onChange={(e) => form.setData('dispatched_through', e.target.value)} />
                                </Field>
                                <Field label="Destination" id="destination" error={form.errors.destination}>
                                    <Input id="destination" value={form.data.destination}
                                           onChange={(e) => form.setData('destination', e.target.value)} />
                                </Field>
                                <Field label="Mode / terms of payment" id="payment_terms" error={form.errors.payment_terms}>
                                    <Input id="payment_terms" value={form.data.payment_terms}
                                           placeholder="e.g. 50% advance, balance on delivery"
                                           onChange={(e) => form.setData('payment_terms', e.target.value)} />
                                </Field>
                                <Field label="Terms of delivery" id="delivery_terms" error={form.errors.delivery_terms}>
                                    <Input id="delivery_terms" value={form.data.delivery_terms}
                                           onChange={(e) => form.setData('delivery_terms', e.target.value)} />
                                </Field>
                            </div>
                        </section>

                        <Separator />

                        {/* Notes & terms */}
                        <section>
                            <SectionHead icon={StickyNote} title="Notes & terms" hint="Both print on the quotation PDF." />
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="Notes" id="notes">
                                    <Textarea id="notes" rows={4} maxLength={2000}
                                              value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} />
                                </Field>
                                <Field label="Terms & conditions" id="terms">
                                    <Textarea id="terms" rows={4} maxLength={2000}
                                              value={form.data.terms} onChange={(e) => form.setData('terms', e.target.value)} />
                                </Field>
                            </div>
                        </section>
                    </div>

                    {/* ── Summary rail (sticky on desktop) ───────────── */}
                    <aside className="lg:col-span-1">
                        <div className="space-y-5 lg:sticky lg:top-20">
                            <div className="rounded-xl border bg-card p-5">
                                <SectionHead icon={CalendarClock} title="Quotation details" />
                                <div className="space-y-3">
                                    <Field label="Quotation date *" id="quotation_date" error={form.errors.quotation_date}>
                                        <DatePicker id="quotation_date" value={form.data.quotation_date} onChange={setDate('quotation_date')} />
                                    </Field>
                                    <Field label="Valid until" id="valid_until" error={form.errors.valid_until} help="Quote expiry">
                                        <DatePicker id="valid_until" value={form.data.valid_until || null}
                                                    onChange={setDate('valid_until')} placeholder="No expiry" />
                                    </Field>
                                    <Field label="Overall discount (₹)" id="discount_amount" help="Flat amount off the total">
                                        <Input id="discount_amount" type="number" step="0.01" min="0"
                                               className="text-right tabular-nums"
                                               value={form.data.discount_amount}
                                               onChange={(e) => form.setData('discount_amount', Number(e.target.value))} />
                                    </Field>
                                </div>

                                <Separator className="my-4" />

                                <dl className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <dt className="text-muted-foreground">Subtotal</dt>
                                        <dd className="font-mono tabular-nums">{formatCurrency(totals.subtotal)}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-muted-foreground">Tax</dt>
                                        <dd className="font-mono tabular-nums">{formatCurrency(totals.tax)}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-muted-foreground">Discount</dt>
                                        <dd className="font-mono tabular-nums">− {formatCurrency(form.data.discount_amount)}</dd>
                                    </div>
                                    <div className="flex items-baseline justify-between border-t pt-3">
                                        <dt className="font-semibold">Total</dt>
                                        <dd className="font-mono text-xl font-semibold tabular-nums">{formatCurrency(totals.total)}</dd>
                                    </div>
                                </dl>

                                <Badge variant="secondary" className="mt-4">
                                    {form.data.items.length} line{form.data.items.length === 1 ? '' : 's'}
                                </Badge>
                            </div>

                            {/* Desktop save (rail) */}
                            <div className="hidden lg:flex lg:justify-end">
                                <SaveBtn />
                            </div>
                        </div>
                    </aside>
                </div>

                {/* Mobile sticky save bar */}
                <div className="sticky -bottom-4 z-30 flex items-center justify-end gap-2 border-t bg-background px-4 py-3 shadow-[0_-1px_3px_rgba(0,0,0,0.06)] sm:-bottom-6 sm:px-6 lg:hidden">
                    <Button type="button" variant="ghost" asChild>
                        <Link href="/quotations">Cancel</Link>
                    </Button>
                    <SaveBtn />
                </div>
              </div>
            </form>
        </AdminLayout>
    );
}
