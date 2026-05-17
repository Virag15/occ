import { Head, useForm } from '@inertiajs/react';
import { useMemo } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
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

    const setItem = (idx: number, patch: Partial<Item>) => {
        const items = form.data.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
        form.setData('items', items);
    };

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
        if (id === 'adhoc') {
            form.setData('customer_id', null);
            return;
        }
        const c = customers.find((x) => String(x.id) === id);
        if (!c) return;
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
        const total = Math.max(0, subtotal + tax - form.data.discount_amount);
        return { subtotal, tax, total };
    }, [form.data.items, form.data.discount_amount]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            form.put(`/quotations/${quotation!.id}`);
        } else {
            form.post('/quotations');
        }
    };

    return (
        <AdminLayout breadcrumbs={[{ label: 'Quotations', href: '/quotations' }, { label: isEdit ? 'Edit' : 'New' }]}>
            <Head title={isEdit ? 'Edit quotation' : 'New quotation'} />
            <form onSubmit={submit} className="p-6 max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {isEdit ? `Edit ${quotation!.customer_name}` : 'New quotation'}
                        {!isEdit && <span className="ml-2 text-sm font-mono text-muted-foreground">{nextCode}</span>}
                    </h1>
                    <Button type="submit" disabled={form.processing}>
                        <Save className="h-4 w-4 mr-1" /> {isEdit ? 'Save changes' : 'Create quotation'}
                    </Button>
                </div>

                {/* Customer */}
                <Card>
                    <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label>Pick existing customer (optional)</Label>
                            <Select onValueChange={pickCustomer} defaultValue={quotation?.customer_id ? String(quotation.customer_id) : 'adhoc'}>
                                <SelectTrigger><SelectValue placeholder="Type details below, or pick a customer" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="adhoc">— Ad-hoc (type below) —</SelectItem>
                                    {customers.map((c) => (
                                        <SelectItem key={c.id} value={String(c.id)}>
                                            {c.company || c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label>Contact name *</Label>
                                <Input value={form.data.customer_name} onChange={(e) => form.setData('customer_name', e.target.value)} required maxLength={150} />
                                {form.errors.customer_name && <p className="text-xs text-red-600 mt-1">{form.errors.customer_name}</p>}
                            </div>
                            <div>
                                <Label>Company</Label>
                                <Input value={form.data.customer_company} onChange={(e) => form.setData('customer_company', e.target.value)} maxLength={150} />
                            </div>
                            <div>
                                <Label>GSTIN</Label>
                                <Input value={form.data.customer_gstin} onChange={(e) => form.setData('customer_gstin', e.target.value)} maxLength={20} />
                            </div>
                            <div>
                                <Label>Phone</Label>
                                <Input value={form.data.customer_phone} onChange={(e) => form.setData('customer_phone', e.target.value)} maxLength={20} />
                            </div>
                            <div className="sm:col-span-2">
                                <Label>Address</Label>
                                <Textarea value={form.data.customer_address} onChange={(e) => form.setData('customer_address', e.target.value)} rows={2} maxLength={1000} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Dates */}
                <Card>
                    <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <Label>Quotation date *</Label>
                            <Input type="date" value={form.data.quotation_date} onChange={(e) => form.setData('quotation_date', e.target.value)} required />
                        </div>
                        <div>
                            <Label>Valid until</Label>
                            <Input type="date" value={form.data.valid_until} onChange={(e) => form.setData('valid_until', e.target.value)} />
                        </div>
                        <div>
                            <Label>Overall discount (₹)</Label>
                            <Input type="number" min={0} step="0.01" value={form.data.discount_amount}
                                   onChange={(e) => form.setData('discount_amount', Number(e.target.value))} />
                        </div>
                    </CardContent>
                </Card>

                {/* Line items */}
                <Card>
                    <CardHeader className="flex-row items-center justify-between">
                        <CardTitle className="text-base">Line items</CardTitle>
                        <Button type="button" variant="outline" size="sm"
                                onClick={() => form.setData('items', [...form.data.items, blankItem()])}>
                            <Plus className="h-4 w-4 mr-1" /> Add line
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {form.data.items.map((it, idx) => {
                            const taxable = it.qty * it.unit_price * (1 - it.discount_pct / 100);
                            const lineTotal = taxable + (taxable * it.tax_rate) / 100;
                            return (
                                <div key={idx} className="grid grid-cols-12 gap-2 items-end border-b pb-3 last:border-0">
                                    <div className="col-span-12 sm:col-span-4">
                                        <Label className="text-xs">Product</Label>
                                        <Select onValueChange={(v) => pickProduct(idx, v)}>
                                            <SelectTrigger className="h-9"><SelectValue placeholder="Pick or type below" /></SelectTrigger>
                                            <SelectContent>
                                                {products.map((p) => (
                                                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Input className="mt-1" placeholder="Description *" value={it.product_name}
                                               onChange={(e) => setItem(idx, { product_name: e.target.value })} required maxLength={255} />
                                    </div>
                                    <div className="col-span-3 sm:col-span-1">
                                        <Label className="text-xs">HSN</Label>
                                        <Input value={it.hsn_code} onChange={(e) => setItem(idx, { hsn_code: e.target.value })} maxLength={20} />
                                    </div>
                                    <div className="col-span-3 sm:col-span-1">
                                        <Label className="text-xs">Qty</Label>
                                        <Input type="number" min={0} step="0.001" value={it.qty}
                                               onChange={(e) => setItem(idx, { qty: Number(e.target.value) })} />
                                    </div>
                                    <div className="col-span-3 sm:col-span-1">
                                        <Label className="text-xs">Unit</Label>
                                        <Input value={it.unit} onChange={(e) => setItem(idx, { unit: e.target.value })} maxLength={20} />
                                    </div>
                                    <div className="col-span-3 sm:col-span-2">
                                        <Label className="text-xs">Rate</Label>
                                        <Input type="number" min={0} step="0.01" value={it.unit_price}
                                               onChange={(e) => setItem(idx, { unit_price: Number(e.target.value) })} />
                                    </div>
                                    <div className="col-span-3 sm:col-span-1">
                                        <Label className="text-xs">Disc%</Label>
                                        <Input type="number" min={0} max={100} step="0.01" value={it.discount_pct}
                                               onChange={(e) => setItem(idx, { discount_pct: Number(e.target.value) })} />
                                    </div>
                                    <div className="col-span-3 sm:col-span-1">
                                        <Label className="text-xs">Tax%</Label>
                                        <Input type="number" min={0} max={100} step="0.01" value={it.tax_rate}
                                               onChange={(e) => setItem(idx, { tax_rate: Number(e.target.value) })} />
                                    </div>
                                    <div className="col-span-9 sm:col-span-1 text-right font-mono text-sm pb-2">
                                        {formatCurrency(lineTotal)}
                                    </div>
                                    <div className="col-span-3 sm:col-span-12 sm:flex sm:justify-end">
                                        {form.data.items.length > 1 && (
                                            <button type="button"
                                                    onClick={() => form.setData('items', form.data.items.filter((_, i) => i !== idx))}
                                                    className="text-red-600 hover:bg-red-50 rounded p-1">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {form.errors.items && <p className="text-xs text-red-600">{form.errors.items}</p>}

                        <div className="flex justify-end pt-2">
                            <div className="w-64 space-y-1 text-sm">
                                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">{formatCurrency(totals.subtotal)}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="font-mono">{formatCurrency(totals.tax)}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="font-mono">− {formatCurrency(form.data.discount_amount)}</span></div>
                                <div className="flex justify-between border-t pt-1 font-semibold"><span>Total</span><span className="font-mono">{formatCurrency(totals.total)}</span></div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Notes + terms */}
                <Card>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6">
                        <div>
                            <Label>Notes</Label>
                            <Textarea value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} rows={3} maxLength={2000} />
                        </div>
                        <div>
                            <Label>Terms &amp; conditions</Label>
                            <Textarea value={form.data.terms} onChange={(e) => form.setData('terms', e.target.value)} rows={3} maxLength={2000} />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button type="submit" disabled={form.processing}>
                        <Save className="h-4 w-4 mr-1" /> {isEdit ? 'Save changes' : 'Create quotation'}
                    </Button>
                </div>
            </form>
        </AdminLayout>
    );
}
