import { Head, useForm } from '@inertiajs/react';
import { useMemo } from 'react';
import { Plus, Trash2, Save, User, FileText, ListPlus } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Combobox, type ComboOption } from '@/components/ui/combobox';
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

/** Inline labelled field — same shape Settings/Company uses. */
function Field({
    id, label, value, onChange, error, type = 'text', placeholder,
}: {
    id: string; label: string; value: string; onChange: (v: string) => void;
    error?: string; type?: string; placeholder?: string;
}) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id} className="text-xs">{label}</Label>
            <Input id={id} type={type} value={value} placeholder={placeholder}
                   onChange={(e) => onChange(e.target.value)} />
            {error && <p className="text-xs text-destructive">{error}</p>}
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

            <form onSubmit={submit} className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">
                            {isEdit ? 'Edit quotation' : 'New quotation'}
                        </h1>
                        {!isEdit && (
                            <p className="text-xs text-muted-foreground">
                                Code <span className="font-mono">{nextCode}</span> · no order required
                            </p>
                        )}
                    </div>
                    <Button type="submit" disabled={form.processing}>
                        <Save className="mr-1 h-4 w-4" /> {isEdit ? 'Save changes' : 'Create quotation'}
                    </Button>
                </div>

                {/* Customer */}
                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium">
                            <User className="h-4 w-4 text-muted-foreground" /> Customer
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 p-4 pt-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Pick existing customer (optional)</Label>
                            <Combobox
                                value={form.data.customer_id ? String(form.data.customer_id) : ''}
                                onChange={pickCustomer}
                                options={customerOptions}
                                placeholder="Search customers, or type details below"
                                searchPlaceholder="Search customers…"
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Field id="customer_name" label="Contact name *" value={form.data.customer_name}
                                   onChange={(v) => form.setData('customer_name', v)} error={form.errors.customer_name} />
                            <Field id="customer_company" label="Company" value={form.data.customer_company}
                                   onChange={(v) => form.setData('customer_company', v)} error={form.errors.customer_company} />
                            <Field id="customer_gstin" label="GSTIN" value={form.data.customer_gstin}
                                   onChange={(v) => form.setData('customer_gstin', v)} error={form.errors.customer_gstin} />
                            <Field id="customer_phone" label="Phone" value={form.data.customer_phone}
                                   onChange={(v) => form.setData('customer_phone', v)} error={form.errors.customer_phone} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="customer_address" className="text-xs">Address</Label>
                            <Textarea id="customer_address" rows={2} maxLength={1000}
                                      value={form.data.customer_address}
                                      onChange={(e) => form.setData('customer_address', e.target.value)} />
                        </div>
                    </CardContent>
                </Card>

                {/* Details */}
                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium">
                            <FileText className="h-4 w-4 text-muted-foreground" /> Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-3 p-4 pt-2 sm:grid-cols-3">
                        <Field id="quotation_date" label="Quotation date *" type="date"
                               value={form.data.quotation_date} onChange={(v) => form.setData('quotation_date', v)}
                               error={form.errors.quotation_date} />
                        <Field id="valid_until" label="Valid until" type="date"
                               value={form.data.valid_until} onChange={(v) => form.setData('valid_until', v)}
                               error={form.errors.valid_until} />
                        <Field id="discount_amount" label="Overall discount (₹)" type="number"
                               value={String(form.data.discount_amount)}
                               onChange={(v) => form.setData('discount_amount', Number(v))} />
                    </CardContent>
                </Card>

                {/* Line items */}
                <Card>
                    <CardHeader className="flex-row items-center justify-between p-4 pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium">
                            <ListPlus className="h-4 w-4 text-muted-foreground" /> Line items
                        </CardTitle>
                        <Button type="button" variant="outline" size="sm"
                                onClick={() => form.setData('items', [...form.data.items, blankItem()])}>
                            <Plus className="mr-1 h-4 w-4" /> Add line
                        </Button>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-xs text-muted-foreground">
                                        <th className="px-2 py-2 text-left font-medium" style={{ minWidth: 240 }}>Product / description</th>
                                        <th className="px-2 py-2 text-right font-medium" style={{ width: 80 }}>Qty</th>
                                        <th className="px-2 py-2 text-left font-medium" style={{ width: 60 }}>Unit</th>
                                        <th className="px-2 py-2 text-right font-medium" style={{ width: 110 }}>Rate</th>
                                        <th className="px-2 py-2 text-right font-medium" style={{ width: 80 }}>Disc %</th>
                                        <th className="px-2 py-2 text-right font-medium" style={{ width: 80 }}>GST %</th>
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
                                                <td className="px-2 py-2">
                                                    <Input className="h-8" maxLength={20}
                                                           value={it.unit} onChange={(e) => setItem(i, { unit: e.target.value })} />
                                                </td>
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
                        {form.errors.items && <p className="mt-2 text-xs text-destructive">{form.errors.items}</p>}

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

                {/* Notes + terms */}
                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium">Notes &amp; terms</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-3 p-4 pt-2 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="notes" className="text-xs">Notes</Label>
                            <Textarea id="notes" rows={3} maxLength={2000}
                                      value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="terms" className="text-xs">Terms &amp; conditions</Label>
                            <Textarea id="terms" rows={3} maxLength={2000}
                                      value={form.data.terms} onChange={(e) => form.setData('terms', e.target.value)} />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button type="submit" disabled={form.processing}>
                        <Save className="mr-1 h-4 w-4" /> {isEdit ? 'Save changes' : 'Create quotation'}
                    </Button>
                </div>
            </form>
        </AdminLayout>
    );
}
