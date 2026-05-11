import { Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { toast } from 'sonner';
import { Save, Package, Receipt, IndianRupee, AlertOctagon, ToggleLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Product } from '@/types/entities';

const UNITS = ['NOS', 'PCS', 'SET', 'PAIR', 'BOX', 'BAG', 'BUNDLE', 'MTR', 'FT', 'RFT', 'KG', 'GRAM', 'TON', 'LTR', 'COIL', 'ROLL'];

type FormShape = {
    sku: string; name: string; brand: string; category: string; description: string;
    hsn_code: string; unit: string; gst_rate: number | string;
    mrp: number | string; default_sale_price: number | string; default_purchase_price: number | string;
    min_order_level: number | string; reorder_level: number | string; negative_stock_reason: string;
    is_active: boolean;
};

function emptyForm(p?: Product | null): FormShape {
    return {
        sku: p?.sku ?? '', name: p?.name ?? '', brand: p?.brand ?? '',
        category: p?.category ?? '', description: p?.description ?? '',
        hsn_code: p?.hsn_code ?? '', unit: p?.unit ?? '', gst_rate: p?.gst_rate ?? '',
        mrp: p?.mrp ?? '', default_sale_price: p?.default_sale_price ?? '',
        default_purchase_price: p?.default_purchase_price ?? '',
        min_order_level: p?.min_order_level ?? '', reorder_level: p?.reorder_level ?? '',
        negative_stock_reason: p?.negative_stock_reason ?? '',
        is_active: p?.is_active ?? true,
    };
}

export default function ProductForm({ product }: { product?: Product | null }) {
    const isEdit = !!product?.id;
    const form = useForm<FormShape>(emptyForm(product));

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const onSuccess = () => toast.success(isEdit ? 'Product updated (queued for Tally sync)' : 'Product created (queued for Tally sync)');
        if (isEdit) form.patch(route('products.update', { product: product!.id }), { onSuccess });
        else form.post(route('products.store'), { onSuccess });
    };

    return (
        <form onSubmit={submit} noValidate className="space-y-5 pb-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                        {isEdit ? product!.name : 'New product'}
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        {isEdit ? `Editing ${product!.sku ?? product!.name}` : 'Add a new product to the catalog'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" asChild>
                        <Link href={route('products.index')}>Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={form.processing} size="sm">
                        <Save className="h-3.5 w-3.5 mr-1" />
                        {form.processing ? 'Saving…' : isEdit ? 'Update product' : 'Create product'}
                    </Button>
                </div>
            </div>

            <Section icon={Package} title="Identity">
                <Grid cols={2}>
                    <Field label="Name *" id="name" error={form.errors.name}>
                        <Input id="name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} required />
                    </Field>
                    <Field label="SKU" id="sku" error={form.errors.sku} help="Internal stock-keeping code">
                        <Input id="sku" className="font-mono text-xs" value={form.data.sku} onChange={(e) => form.setData('sku', e.target.value)} />
                    </Field>
                    <Field label="Brand" id="brand" error={form.errors.brand}>
                        <Input id="brand" value={form.data.brand} onChange={(e) => form.setData('brand', e.target.value)} />
                    </Field>
                    <Field label="Category" id="category" error={form.errors.category} help="e.g. MCB, RCCB, Contactor">
                        <Input id="category" value={form.data.category} onChange={(e) => form.setData('category', e.target.value)} />
                    </Field>
                </Grid>
                <Field label="Description" id="description" error={form.errors.description}>
                    <Textarea id="description" rows={2} value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} />
                </Field>
            </Section>

            <Section icon={Receipt} title="Tax & unit">
                <Grid cols={2}>
                    <Field label="HSN/SAC code" id="hsn_code" error={form.errors.hsn_code} help="GST classification code">
                        <Input id="hsn_code" className="font-mono text-xs" value={form.data.hsn_code} onChange={(e) => form.setData('hsn_code', e.target.value)} />
                    </Field>
                    <Field label="Unit" id="unit" error={form.errors.unit}>
                        <Select value={form.data.unit || undefined} onValueChange={(v) => form.setData('unit', v)}>
                            <SelectTrigger id="unit"><SelectValue placeholder="Select unit" /></SelectTrigger>
                            <SelectContent>
                                {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label="GST rate (%)" id="gst_rate" error={form.errors.gst_rate} help="Usually 5, 12, 18, or 28">
                        <Input id="gst_rate" type="number" step="0.01" value={form.data.gst_rate} onChange={(e) => form.setData('gst_rate', e.target.value)} className="tabular-nums" />
                    </Field>
                </Grid>
            </Section>

            <Section icon={IndianRupee} title="Pricing">
                <Grid cols={2}>
                    <Field label="MRP (₹)" id="mrp" error={form.errors.mrp} help="Maximum retail price (sticker)">
                        <Input id="mrp" type="number" step="0.01" value={form.data.mrp} onChange={(e) => form.setData('mrp', e.target.value)} className="tabular-nums" />
                    </Field>
                    <Field label="Default sale price (₹)" id="default_sale_price" error={form.errors.default_sale_price} help="Pre-filled on new orders">
                        <Input id="default_sale_price" type="number" step="0.01" value={form.data.default_sale_price} onChange={(e) => form.setData('default_sale_price', e.target.value)} className="tabular-nums" />
                    </Field>
                    <Field label="Default purchase price (₹)" id="default_purchase_price" error={form.errors.default_purchase_price} help="Used for margin calculations">
                        <Input id="default_purchase_price" type="number" step="0.01" value={form.data.default_purchase_price} onChange={(e) => form.setData('default_purchase_price', e.target.value)} className="tabular-nums" />
                    </Field>
                </Grid>
            </Section>

            <Section icon={AlertOctagon} title="Stock thresholds">
                <p className="-mt-1 mb-3 text-xs text-muted-foreground">
                    Stock-on-hand syncs from Tally. These thresholds drive the low/negative-stock badges on the Products list.
                </p>
                <Grid cols={2}>
                    <Field label="Minimum order level" id="min_order_level" error={form.errors.min_order_level} help="Critical alert below this">
                        <Input id="min_order_level" type="number" step="0.001" value={form.data.min_order_level} onChange={(e) => form.setData('min_order_level', e.target.value)} className="tabular-nums" />
                    </Field>
                    <Field label="Reorder level" id="reorder_level" error={form.errors.reorder_level} help="Trigger reorder below this">
                        <Input id="reorder_level" type="number" step="0.001" value={form.data.reorder_level} onChange={(e) => form.setData('reorder_level', e.target.value)} className="tabular-nums" />
                    </Field>
                </Grid>
                <Field
                    label="Reason if stock is negative"
                    id="negative_stock_reason"
                    error={form.errors.negative_stock_reason}
                    help="Shows in a tooltip when the stock badge turns red"
                >
                    <Textarea
                        id="negative_stock_reason"
                        rows={2}
                        placeholder="e.g. overbooked against a confirmed order; pending stock-in from C&S; manual adjustment"
                        value={form.data.negative_stock_reason}
                        onChange={(e) => form.setData('negative_stock_reason', e.target.value)}
                    />
                </Field>
            </Section>

            <Section icon={ToggleLeft} title="Catalog status">
                <div className="flex items-center gap-3">
                    <Switch id="is_active" checked={form.data.is_active} onCheckedChange={(checked) => form.setData('is_active', checked)} />
                    <Label htmlFor="is_active" className="cursor-pointer font-normal">Active — appears in product pickers on new orders</Label>
                </div>
            </Section>

            <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" asChild>
                    <Link href={route('products.index')}>Cancel</Link>
                </Button>
                <Button type="submit" disabled={form.processing}>
                    <Save className="h-4 w-4 mr-1" />
                    {form.processing ? 'Saving…' : isEdit ? 'Update product' : 'Create product'}
                </Button>
            </div>
        </form>
    );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
    return (
        <Card>
            <CardHeader className="p-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="h-4 w-4 text-muted-foreground" /> {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-2">{children}</CardContent>
        </Card>
    );
}

function Grid({ cols, children }: { cols: 1 | 2 | 3 | 4; children: React.ReactNode }) {
    const classes: Record<number, string> = {
        1: 'grid gap-3',
        2: 'grid gap-3 sm:grid-cols-2',
        3: 'grid gap-3 sm:grid-cols-3',
        4: 'grid gap-3 sm:grid-cols-2 lg:grid-cols-4',
    };
    return <div className={classes[cols]}>{children}</div>;
}

function Field({ label, id, error, help, children }: { label: string; id: string; error?: string; help?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            {label && <Label htmlFor={id} className="text-xs">{label}</Label>}
            {children}
            {help && !error && <p className="text-[10px] text-muted-foreground">{help}</p>}
            {error && <p className="text-[10px] text-destructive">{error}</p>}
        </div>
    );
}
