import { Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { ArrowLeft, Plus, Trash2, Package, ListChecks, FileText, Save, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Combobox, ComboOption } from '@/components/ui/combobox';
import { formatCurrency } from '@/lib/format';
import type { CustomerLite, Order, OrderItem, ProductLite } from '@/types/entities';

const STATUSES = ['new_order', 'confirmed', 'stock_check', 'packing', 'packed', 'ready_for_dispatch', 'dispatched', 'delivered', 'closed', 'on_hold', 'cancelled'];
const PRIORITIES = ['urgent', 'high', 'normal', 'low'];
const ORDER_SOURCES = ['whatsapp', 'email', 'phone', 'in_person', 'po'];

type FormShape = {
    order_code: string;
    customer_id: number | string;
    order_date: string;
    order_source: string;
    customer_reference_number: string;
    customer_po_number: string;
    brands: string; // comma-separated input, parsed on submit
    order_value: number | string;
    status: string;
    priority: string;
    internal_notes: string;
    items: OrderItem[];
};

function init(order?: Order | null, defaults?: { order_code?: string }): FormShape {
    return {
        order_code: order?.order_code ?? defaults?.order_code ?? '',
        customer_id: order?.customer_id ?? '',
        order_date: order?.order_date ?? new Date().toISOString().split('T')[0],
        order_source: order?.order_source ?? '',
        customer_reference_number: order?.customer_reference_number ?? '',
        customer_po_number: order?.customer_po_number ?? '',
        brands: (order?.brands ?? []).join(', '),
        order_value: order?.order_value ?? '',
        status: order?.status ?? 'new_order',
        priority: order?.priority ?? 'normal',
        internal_notes: order?.internal_notes ?? '',
        items: order?.items ?? [],
    };
}

export default function OrderForm({
    order,
    customers,
    products,
    nextOrderCode,
}: {
    order?: Order | null;
    customers: CustomerLite[];
    products: ProductLite[];
    nextOrderCode?: string;
}) {
    const isEdit = !!order?.id;
    const form = useForm<FormShape>(init(order, { order_code: nextOrderCode }));

    const lineTotal = (qty: number, unitPrice: number, taxRate: number): number => {
        const subtotal = qty * unitPrice;
        return Math.round((subtotal + subtotal * (taxRate / 100)) * 100) / 100;
    };

    const updateItem = (idx: number, patch: Partial<OrderItem>) => {
        const next = form.data.items.map((it, i) => i === idx ? { ...it, ...patch } : it);
        const item = next[idx];
        const qty = Number(item.qty_ordered) || 0;
        const price = Number(item.unit_price ?? 0);
        const tax = Number(item.tax_rate ?? 0);
        next[idx] = { ...item, line_total: lineTotal(qty, price, tax) };
        form.setData('items', next);
    };

    const pickProduct = (idx: number, productId: string) => {
        const p = products.find((x) => String(x.id) === productId);
        if (!p) return;
        updateItem(idx, {
            product_id: p.id,
            product_name: p.name,
            unit: p.unit ?? null,
            unit_price: p.default_sale_price ?? 0,
            tax_rate: p.gst_rate ?? 0,
        });
    };

    const addItem = () => {
        form.setData('items', [
            ...form.data.items,
            { product_id: null, product_name: '', qty_ordered: 1, unit_price: 0, tax_rate: 0, line_total: 0 },
        ]);
    };

    const removeItem = (idx: number) => {
        form.setData('items', form.data.items.filter((_, i) => i !== idx));
    };

    const itemsTotal = form.data.items.reduce((sum, it) => sum + (Number(it.line_total) || 0), 0);
    const itemsCount = form.data.items.length;

    const setDate = (key: keyof FormShape) => (d: Date | undefined) => {
        if (!d) return;
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        form.setData(key, `${yyyy}-${mm}-${dd}` as never);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.transform((d) => ({
            ...d,
            brands: d.brands.split(',').map((s) => s.trim()).filter(Boolean),
        }));
        const onSuccess = () => toast.success(isEdit ? 'Order updated' : 'Order created');
        if (isEdit) {
            form.patch(route('orders.update', { order: order!.id }), { onSuccess });
        } else {
            form.post(route('orders.store'), { onSuccess });
        }
    };

    return (
        <form onSubmit={submit} noValidate className="space-y-5 pb-10">
            {/* Sticky header */}
            <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-1 border-b bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mt-6 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" asChild className="-ml-2 gap-1.5">
                            <Link href={route('orders.index')}><ArrowLeft className="h-4 w-4" /> Orders</Link>
                        </Button>
                        <span className="text-muted-foreground">/</span>
                        <div>
                            <h1 className="font-mono text-base font-semibold leading-tight">
                                {form.data.order_code || (isEdit ? order?.order_code : 'New order')}
                            </h1>
                            <p className="text-[10px] text-muted-foreground">
                                {isEdit ? 'Editing existing order' : 'Creating a new order'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button type="button" variant="ghost" size="sm" asChild>
                            <Link href={route('orders.index')}>Cancel</Link>
                        </Button>
                        <Button type="submit" disabled={form.processing} size="sm">
                            <Save className="h-3.5 w-3.5 mr-1" />
                            {form.processing ? 'Saving…' : isEdit ? 'Update order' : 'Create order'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Info note about what this form captures */}
            <div className="flex items-start gap-2 rounded-md border border-blue-500/30 bg-blue-500/5 p-3 text-xs">
                <Info className="h-4 w-4 shrink-0 text-blue-600" />
                <p className="text-muted-foreground">
                    This form captures the <span className="font-medium text-foreground">order intake</span> only — what the customer asked for. Dispatch (LR, transporter, vehicle), POD/triplicate, and payment details are captured later from the <span className="font-medium text-foreground">Order page</span> as those events actually happen.
                </p>
            </div>

            {/* ─── Order details card ─── */}
            <Card>
                <CardHeader className="p-4 pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <FileText className="h-4 w-4 text-muted-foreground" /> Order details
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-4">
                    {/* Row 1: identity */}
                    <div className="grid gap-3 sm:grid-cols-3">
                        <Field label="Order code" id="order_code" help="Auto-generated">
                            <Input id="order_code" value={form.data.order_code} readOnly className="bg-muted font-mono text-xs" />
                        </Field>
                        <Field label="Order date *" id="order_date" error={form.errors.order_date}>
                            <DatePicker id="order_date" value={form.data.order_date} onChange={setDate('order_date')} />
                        </Field>
                        <Field label="Source" id="order_source" error={form.errors.order_source} help="How the order reached us">
                            <Select value={form.data.order_source || undefined} onValueChange={(v) => form.setData('order_source', v)}>
                                <SelectTrigger id="order_source"><SelectValue placeholder="—" /></SelectTrigger>
                                <SelectContent>
                                    {ORDER_SOURCES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </Field>
                    </div>

                    {/* Row 2: customer (full width — most important field) */}
                    <Field label="Customer *" id="customer_id" error={form.errors.customer_id}>
                        <Combobox
                            id="customer_id"
                            value={form.data.customer_id ? String(form.data.customer_id) : ''}
                            onChange={(v) => form.setData('customer_id', Number(v))}
                            options={customers.map((c): ComboOption => ({ value: String(c.id), label: c.name, sublabel: c.company ?? undefined }))}
                            placeholder="Search and select customer"
                            searchPlaceholder="Search by name or company…"
                        />
                    </Field>

                    {/* Row 3: customer references */}
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Customer reference #" id="customer_reference_number" help="Their own ref number, if shared">
                            <Input
                                id="customer_reference_number"
                                value={form.data.customer_reference_number}
                                onChange={(e) => form.setData('customer_reference_number', e.target.value)}
                                placeholder="e.g. SHRM-25-1138"
                                className="font-mono text-xs"
                            />
                        </Field>
                        <Field label="Customer PO #" id="customer_po_number" help="Purchase order number from buyer">
                            <Input
                                id="customer_po_number"
                                value={form.data.customer_po_number}
                                onChange={(e) => form.setData('customer_po_number', e.target.value)}
                                placeholder="e.g. PO/2026/04/1138"
                                className="font-mono text-xs"
                            />
                        </Field>
                    </div>

                    {/* Row 4: state */}
                    <div className="grid gap-3 sm:grid-cols-3">
                        <Field label="Status *" id="status" error={form.errors.status}>
                            <Select value={form.data.status} onValueChange={(v) => form.setData('status', v)}>
                                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label="Priority *" id="priority" error={form.errors.priority}>
                            <Select value={form.data.priority} onValueChange={(v) => form.setData('priority', v)}>
                                <SelectTrigger id="priority"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label="Brands" id="brands" error={form.errors.brands} help="Comma-separated">
                            <Input
                                id="brands"
                                placeholder="C&S Electric, BCH Electric"
                                value={form.data.brands}
                                onChange={(e) => form.setData('brands', e.target.value)}
                            />
                        </Field>
                    </div>

                    {/* Row 5: order value (auto when items present) */}
                    {itemsCount === 0 && (
                        <Field label="Order value (₹)" id="order_value" error={form.errors.order_value} help="Will auto-sum from line items once added">
                            <Input
                                id="order_value"
                                type="number"
                                step="0.01"
                                value={form.data.order_value}
                                onChange={(e) => form.setData('order_value', e.target.value)}
                            />
                        </Field>
                    )}
                </CardContent>
            </Card>

            {/* ─── Line items card ─── */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <ListChecks className="h-4 w-4 text-muted-foreground" />
                        Line items
                        {itemsCount > 0 && (
                            <span className="text-xs font-normal text-muted-foreground">
                                · {itemsCount} line{itemsCount === 1 ? '' : 's'} · {formatCurrency(itemsTotal)} total
                            </span>
                        )}
                    </CardTitle>
                    {itemsCount > 0 && (
                        <Button type="button" variant="outline" size="sm" onClick={addItem}>
                            <Plus className="h-3.5 w-3.5 mr-1" /> Add line
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="p-4 pt-2">
                    {itemsCount === 0 ? (
                        <div className="rounded-md border border-dashed bg-muted/20 px-4 py-10 text-center">
                            <Package className="mx-auto mb-2 h-6 w-6 text-muted-foreground/60" />
                            <p className="mb-3 text-sm text-muted-foreground">No items on this order yet.</p>
                            <Button type="button" variant="outline" size="sm" onClick={addItem}>
                                <Plus className="h-3.5 w-3.5 mr-1" /> Add first item
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-md border">
                            <table className="w-full text-xs">
                                <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                                    <tr>
                                        <th className="px-2 py-2 text-left font-medium" style={{ minWidth: 220 }}>Product</th>
                                        <th className="px-2 py-2 text-right font-medium" style={{ width: 90 }}>Qty</th>
                                        <th className="px-2 py-2 text-left font-medium" style={{ width: 60 }}>Unit</th>
                                        <th className="px-2 py-2 text-right font-medium" style={{ width: 110 }}>Unit price</th>
                                        <th className="px-2 py-2 text-right font-medium" style={{ width: 80 }}>GST %</th>
                                        <th className="px-2 py-2 text-right font-medium" style={{ width: 120 }}>Line total</th>
                                        <th className="px-2 py-2" style={{ width: 40 }} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {form.data.items.map((it, i) => {
                                        const productOptions: ComboOption[] = products.map((p) => ({
                                            value: String(p.id),
                                            label: p.name,
                                            sublabel: p.sku ?? (p.brand ?? undefined),
                                        }));
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
                                                </td>
                                                <td className="px-2 py-2">
                                                    <Input
                                                        type="number" step="0.001" min="0"
                                                        value={it.qty_ordered as number}
                                                        onChange={(e) => updateItem(i, { qty_ordered: e.target.value as unknown as number })}
                                                        className="h-8 text-right"
                                                    />
                                                </td>
                                                <td className="px-2 py-2 text-xs text-muted-foreground">{it.unit ?? '—'}</td>
                                                <td className="px-2 py-2">
                                                    <Input
                                                        type="number" step="0.01" min="0"
                                                        value={(it.unit_price ?? 0) as number}
                                                        onChange={(e) => updateItem(i, { unit_price: e.target.value as unknown as number })}
                                                        className="h-8 text-right tabular-nums"
                                                    />
                                                </td>
                                                <td className="px-2 py-2">
                                                    <Input
                                                        type="number" step="0.01" min="0" max="100"
                                                        value={(it.tax_rate ?? 0) as number}
                                                        onChange={(e) => updateItem(i, { tax_rate: e.target.value as unknown as number })}
                                                        className="h-8 text-right tabular-nums"
                                                    />
                                                </td>
                                                <td className="px-2 py-2 text-right font-medium tabular-nums">{formatCurrency(it.line_total ?? 0)}</td>
                                                <td className="px-2 py-2 text-right">
                                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeItem(i)}>
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-muted/30">
                                    <tr>
                                        <td colSpan={5} className="px-2 py-2 text-right text-xs font-medium">Order total</td>
                                        <td className="px-2 py-2 text-right text-sm font-bold tabular-nums">{formatCurrency(itemsTotal)}</td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ─── Notes card ─── */}
            <Card>
                <CardHeader className="p-4 pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <FileText className="h-4 w-4 text-muted-foreground" /> Internal notes
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                    <Textarea
                        id="internal_notes"
                        rows={3}
                        value={form.data.internal_notes}
                        onChange={(e) => form.setData('internal_notes', e.target.value)}
                        placeholder="Anything the team should know about this order — special instructions, customer preferences, things to follow up on…"
                    />
                    <p className="mt-2 text-[10px] text-muted-foreground">
                        Visible to all staff. Not printed on slips or invoices.
                    </p>
                </CardContent>
            </Card>

            {/* Footer save (mirrors header save for long forms) */}
            <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" asChild>
                    <Link href={route('orders.index')}>Cancel</Link>
                </Button>
                <Button type="submit" disabled={form.processing}>
                    <Save className="h-4 w-4 mr-1" />
                    {form.processing ? 'Saving…' : isEdit ? 'Update order' : 'Create order'}
                </Button>
            </div>
        </form>
    );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function Field({ label, id, error, help, children }: { label: string; id: string; error?: string; help?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id} className="text-xs">{label}</Label>
            {children}
            {help && !error && <p className="text-[10px] text-muted-foreground">{help}</p>}
            {error && <p className="text-[10px] text-destructive">{error}</p>}
        </div>
    );
}
