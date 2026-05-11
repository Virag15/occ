import { Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import type { Product } from '@/types/entities';

type FormShape = {
    sku: string;
    name: string;
    brand: string;
    category: string;
    description: string;
    hsn_code: string;
    unit: string;
    gst_rate: number | string;
    mrp: number | string;
    default_sale_price: number | string;
    default_purchase_price: number | string;
    is_active: boolean;
};

function emptyForm(p?: Product | null): FormShape {
    return {
        sku: p?.sku ?? '',
        name: p?.name ?? '',
        brand: p?.brand ?? '',
        category: p?.category ?? '',
        description: p?.description ?? '',
        hsn_code: p?.hsn_code ?? '',
        unit: p?.unit ?? '',
        gst_rate: p?.gst_rate ?? '',
        mrp: p?.mrp ?? '',
        default_sale_price: p?.default_sale_price ?? '',
        default_purchase_price: p?.default_purchase_price ?? '',
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
        <>
            <div className="mb-6">
                <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2">
                    <Link href={route('products.index')}>
                        <ArrowLeft className="h-4 w-4" /> Back to Products
                    </Link>
                </Button>
            </div>

            <form onSubmit={submit} className="space-y-6">
                <div className="space-y-4">
                    <Label className="text-base font-semibold">Identity</Label>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="Name *" id="name" error={form.errors.name}>
                            <Input id="name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} required />
                        </Field>
                        <Field label="SKU" id="sku" error={form.errors.sku}>
                            <Input id="sku" className="font-mono text-xs" value={form.data.sku} onChange={(e) => form.setData('sku', e.target.value)} />
                        </Field>
                        <Field label="Brand" id="brand" error={form.errors.brand}>
                            <Input id="brand" value={form.data.brand} onChange={(e) => form.setData('brand', e.target.value)} />
                        </Field>
                        <Field label="Category" id="category" error={form.errors.category}>
                            <Input id="category" value={form.data.category} onChange={(e) => form.setData('category', e.target.value)} />
                        </Field>
                    </div>
                    <Field label="Description" id="description" error={form.errors.description}>
                        <Textarea id="description" rows={2} value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} />
                    </Field>
                </div>

                <Separator />

                <div className="space-y-4">
                    <Label className="text-base font-semibold">Tax & unit</Label>
                    <div className="grid sm:grid-cols-3 gap-4">
                        <Field label="HSN code" id="hsn_code" error={form.errors.hsn_code}>
                            <Input id="hsn_code" className="font-mono text-xs" value={form.data.hsn_code} onChange={(e) => form.setData('hsn_code', e.target.value)} />
                        </Field>
                        <Field label="Unit (NOS, MTR, KG…)" id="unit" error={form.errors.unit}>
                            <Input id="unit" value={form.data.unit} onChange={(e) => form.setData('unit', e.target.value)} />
                        </Field>
                        <Field label="GST rate (%)" id="gst_rate" error={form.errors.gst_rate}>
                            <Input id="gst_rate" type="number" step="0.01" value={form.data.gst_rate} onChange={(e) => form.setData('gst_rate', e.target.value)} />
                        </Field>
                    </div>
                </div>

                <Separator />

                <div className="space-y-4">
                    <Label className="text-base font-semibold">Pricing (₹)</Label>
                    <div className="grid sm:grid-cols-3 gap-4">
                        <Field label="MRP" id="mrp" error={form.errors.mrp}>
                            <Input id="mrp" type="number" step="0.01" value={form.data.mrp} onChange={(e) => form.setData('mrp', e.target.value)} />
                        </Field>
                        <Field label="Default sale price" id="default_sale_price" error={form.errors.default_sale_price}>
                            <Input id="default_sale_price" type="number" step="0.01" value={form.data.default_sale_price} onChange={(e) => form.setData('default_sale_price', e.target.value)} />
                        </Field>
                        <Field label="Default purchase price" id="default_purchase_price" error={form.errors.default_purchase_price}>
                            <Input id="default_purchase_price" type="number" step="0.01" value={form.data.default_purchase_price} onChange={(e) => form.setData('default_purchase_price', e.target.value)} />
                        </Field>
                    </div>
                </div>

                <Separator />

                <div className="flex items-center gap-3">
                    <Switch id="is_active" checked={form.data.is_active} onCheckedChange={(checked: boolean) => form.setData('is_active', checked)} />
                    <Label htmlFor="is_active" className="font-normal cursor-pointer">Active (sells in the catalog)</Label>
                </div>

                <Separator />

                <div className="flex gap-3">
                    <Button type="submit" disabled={form.processing}>
                        {form.processing ? 'Saving…' : isEdit ? 'Update product' : 'Create product'}
                    </Button>
                    <Button type="button" variant="outline" asChild>
                        <Link href={route('products.index')}>Cancel</Link>
                    </Button>
                </div>
            </form>
        </>
    );
}

function Field({ label, id, error, children }: { label: string; id: string; error?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            {children}
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
}
