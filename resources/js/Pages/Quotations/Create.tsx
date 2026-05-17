import { Head, Link, useForm } from '@inertiajs/react';
import { useMemo } from 'react';
import { CirclePlus, Trash2, Save, Building2, CalendarClock, Package, StickyNote } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Combobox, type ComboOption } from '@/components/ui/combobox';
import { DatePicker } from '@/components/ui/date-picker';
import { formatCurrency } from '@/lib/format';

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
    customer_phone: string | null;
    customer_email: string | null;
    quotation_date: string;
    valid_until: string | null;
    discount_amount: string;
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

/** Label + control wrapper — identical to Orders/Form's Field. */
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
        customer_phone: quotation?.customer_phone ?? '',
        customer_email: quotation?.customer_email ?? '',
        quotation_date: quotation?.quotation_date ?? new Date().toISOString().slice(0, 10),
        valid_until: quotation?.valid_until ?? '',
        discount_amount: quotation ? Number(quotation.discount_amount) : 0,
        notes: quotation?.notes ?? '',
        terms: quotation?.terms ?? '',
        items: (quotation?.items?.map((i) => ({
            product_id: i.product_id, product_name: i.product_name, hsn_code: i.hsn_code ?? '',
            qty: Number(i.qty), unit: i.unit ?? '', unit_price: Number(i.unit_price),
            discount_pct: Number(i.discount_pct), tax_rate: Number(i.tax_rate),
        })) ?? [blankItem()]) as Item[],
    });

    const customerOptions: ComboOption[] = useMemo(
        () => customers.map((c) => ({ value: String(c.id), label: c.company || c.name, sublabel: c.company ? c.name : (c.gstin ?? undefined) })),
        [customers],
    );
    const productOptions: ComboOption[] = useMemo(
        () => products.map((p) => ({ value: String(p.id), label: p.name, sublabel: p.sku ?? (p.hsn_code ?? undefined) })),
        [products],
    );

    // Date → yyyy-mm-dd (local), same helper Orders/Form uses.
    const setDate = (key: 'quotation_date' | 'valid_until') => (d: Date | undefined) => {
        if (!d) {
            form.setData(key, '');
            return;
        }
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
            product_id: p.id,
            product_name: p.name,
            hsn_code: p.hsn_code ?? '',
            unit: p.unit ?? '',
            unit_price: Number(p.default_sale_price ?? 0),
            tax_rate: Number(p.gst_rate ?? 18),
        });
    };

    const pickCustomer = (id: string) => {
        const c = customers.find((x) => String(x.id) === id);
        if (!c) {
            form.setData('customer_id', null);
            return;
        }
        form.setData((d) => ({
            ...d,
            customer_id: c.id,
            customer_name: c.name,
            customer_company: c.company ?? '',
            customer_gstin: c.gstin ?? '',
            customer_phone: c.phone ?? '',
            customer_email: c.email ?? '',
        }));
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

    return (
        <AdminLayout breadcrumbs={[{ label: 'Quotations', href: '/quotations' }, { label: isEdit ? 'Edit' : 'New' }]}>
            <Head title={isEdit ? 'Edit quotation' : 'New quotation'} />

            <form onSubmit={submit} noValidate className="space-y-5 pb-10">
                {/* Action row — title shown in breadcrumb */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                        {isEdit
                            ? `Editing ${quotation!.customer_company || quotation!.customer_name}`
                            : <>Creating a new quotation · <span className="font-mono">{nextCode}</span> · no order required</>}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" size="sm" asChild>
                            <Link href="/quotations">Cancel</Link>
                        </Button>
                        <Button type="submit" disabled={form.processing} size="sm">
                            <Save className="mr-1 h-3.5 w-3.5" />
                            {form.processing ? 'Saving…' : isEdit ? 'Update quotation' : 'Create quotation'}
                        </Button>
                    </div>
                </div>

                {/* ─── Customer ─── */}
                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium">
                            <Building2 className="h-4 w-4 text-muted-foreground" /> Customer
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4 pt-2">
                        <Field label="Pick existing customer" id="customer_pick" help="Optional — or type the buyer details below">
                            <Combobox
                                value={form.data.customer_id ? String(form.data.customer_id) : ''}
                                onChange={pickCustomer}
                                options={customerOptions}
                                placeholder="Search customers…"
                                searchPlaceholder="Search by name or company…"
                            />
                        </Field>
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
                                <Input id="customer_gstin" className="font-mono text-xs" value={form.data.customer_gstin}
                                       onChange={(e) => form.setData('customer_gstin', e.target.value)} />
                            </Field>
                            <Field label="Phone" id="customer_phone" error={form.errors.customer_phone}>
                                <Input id="customer_phone" className="font-mono text-xs" value={form.data.customer_phone}
                                       onChange={(e) => form.setData('customer_phone', e.target.value)} />
                            </Field>
                        </div>
                        <Field label="Address" id="customer_address">
                            <Textarea id="customer_address" rows={2} maxLength={1000}
                                      value={form.data.customer_address}
                                      onChange={(e) => form.setData('customer_address', e.target.value)} />
                        </Field>
                    </CardContent>
                </Card>

                {/* ─── Details ─── */}
                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium">
                            <CalendarClock className="h-4 w-4 text-muted-foreground" /> Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                        <div className="grid gap-3 sm:grid-cols-3">
                            <Field label="Quotation date *" id="quotation_date" error={form.errors.quotation_date}>
                                <DatePicker id="quotation_date" value={form.data.quotation_date} onChange={setDate('quotation_date')} />
                            </Field>
                            <Field label="Valid until" id="valid_until" error={form.errors.valid_until} help="Quote expiry date">
                                <DatePicker id="valid_until" value={form.data.valid_until || null} onChange={setDate('valid_until')} placeholder="No expiry" />
                            </Field>
                            <Field label="Overall discount (₹)" id="discount_amount" help="Flat amount off the grand total">
                                <Input id="discount_amount" type="number" step="0.01" min="0"
                                       value={form.data.discount_amount}
                                       onChange={(e) => form.setData('discount_amount', Number(e.target.value))}
                                       className="text-right tabular-nums" />
                            </Field>
                        </div>
                    </CardContent>
                </Card>

                {/* ─── Line items ─── */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium">
                            <Package className="h-4 w-4 text-muted-foreground" /> Line items
                        </CardTitle>
                        <Button type="button" variant="outline" size="sm"
                                onClick={() => form.setData('items', [...form.data.items, blankItem()])}>
                            <CirclePlus className="mr-1 h-3.5 w-3.5" /> Add line
                        </Button>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
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
                                                    <Input
                                                        className="mt-1 h-8"
                                                        placeholder="Description *"
                                                        value={it.product_name}
                                                        onChange={(e) => setItem(i, { product_name: e.target.value })}
                                                        maxLength={255}
                                                    />
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

                        <div className="mt-4 flex justify-end">
                            <div className="w-64 space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span className="font-mono tabular-nums">{formatCurrency(totals.subtotal)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Tax</span>
                                    <span className="font-mono tabular-nums">{formatCurrency(totals.tax)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Discount</span>
                                    <span className="font-mono tabular-nums">− {formatCurrency(form.data.discount_amount)}</span>
                                </div>
                                <div className="flex justify-between border-t pt-1 font-semibold">
                                    <span>Total</span>
                                    <span className="font-mono tabular-nums">{formatCurrency(totals.total)}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ─── Notes & terms ─── */}
                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium">
                            <StickyNote className="h-4 w-4 text-muted-foreground" /> Notes &amp; terms
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Notes" id="notes" help="Shown on the quotation PDF">
                                <Textarea id="notes" rows={3} maxLength={2000}
                                          value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} />
                            </Field>
                            <Field label="Terms & conditions" id="terms" help="Payment terms, delivery, validity">
                                <Textarea id="terms" rows={3} maxLength={2000}
                                          value={form.data.terms} onChange={(e) => form.setData('terms', e.target.value)} />
                            </Field>
                        </div>
                    </CardContent>
                </Card>

                {/* Footer save (mirrors header save for long forms) */}
                <div className="flex items-center justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" asChild>
                        <Link href="/quotations">Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={form.processing}>
                        <Save className="mr-1 h-4 w-4" />
                        {form.processing ? 'Saving…' : isEdit ? 'Update quotation' : 'Create quotation'}
                    </Button>
                </div>
            </form>
        </AdminLayout>
    );
}
