import { Head, router, useForm } from '@inertiajs/react';
import { FormEvent, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Upload, Trash2, Tag } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { SettingsShell } from './SettingsShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Brand = {
    id: number;
    name: string;
    sort_order: number;
    logo_url: string;
};

/**
 * Manage the brand logos this workspace deals in. They auto-render on
 * quotation + invoice PDFs as an "Authorised dealer for" strip. Upload
 * once; no per-document fiddling.
 */
export default function BrandingSettings({ brands }: { brands: Brand[] }) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const form = useForm<{ name: string; logo: File | null; sort_order: number }>({
        name: '',
        logo: null,
        sort_order: 0,
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/settings/branding', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setPreview(null);
                if (fileRef.current) fileRef.current.value = '';
                toast.success('Brand logo added');
            },
            onError: () => toast.error('Could not add brand logo'),
        });
    };

    const remove = (b: Brand) => {
        if (!confirm(`Remove ${b.name}?`)) return;
        router.delete(`/settings/branding/${b.id}`, {
            preserveScroll: true,
            onSuccess: () => toast.success('Removed'),
        });
    };

    return (
        <AdminLayout breadcrumbs={[{ label: 'Settings' }, { label: 'Branding' }]}>
            <Head title="Branding" />

            <SettingsShell active="branding">
                <div className="space-y-5">
                    {/* ─── Add a brand ──────────────────────────────── */}
                    <Card>
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                <Tag className="h-4 w-4 text-muted-foreground" />
                                Brand logos
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">
                                The brands you deal in. These appear automatically on every
                                quotation and invoice PDF — no need to attach them per document.
                            </p>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                            <form onSubmit={submit} className="flex flex-col sm:flex-row sm:items-end gap-4">
                                    <div className="flex-1">
                                        <Label htmlFor="name">Brand name</Label>
                                        <Input
                                            id="name"
                                            value={form.data.name}
                                            onChange={(e) => form.setData('name', e.target.value)}
                                            placeholder="e.g. Schneider Electric"
                                            maxLength={80}
                                            required
                                        />
                                        {form.errors.name && (
                                            <p className="text-xs text-red-600 mt-1">{form.errors.name}</p>
                                        )}
                                    </div>
                                    <div className="w-28">
                                        <Label htmlFor="sort_order">Order</Label>
                                        <Input
                                            id="sort_order"
                                            type="number"
                                            min={0}
                                            max={999}
                                            value={form.data.sort_order}
                                            onChange={(e) => form.setData('sort_order', Number(e.target.value))}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="logo">Logo (PNG/JPG, max 2 MB)</Label>
                                        <input
                                            ref={fileRef}
                                            id="logo"
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            onChange={(e) => {
                                                const f = e.target.files?.[0] ?? null;
                                                form.setData('logo', f);
                                                setPreview(f ? URL.createObjectURL(f) : null);
                                            }}
                                            className="block text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm"
                                            required
                                        />
                                        {form.errors.logo && (
                                            <p className="text-xs text-red-600 mt-1">{form.errors.logo}</p>
                                        )}
                                    </div>
                                    {preview && (
                                        <img src={preview} alt="" className="h-10 w-auto rounded border bg-white object-contain" />
                                    )}
                                <Button type="submit" disabled={form.processing}>
                                    <Upload className="h-4 w-4 mr-1" /> Add
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* ─── Your brands ──────────────────────────────── */}
                    <Card>
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                <Tag className="h-4 w-4 text-muted-foreground" />
                                Your brands
                                {brands.length > 0 && (
                                    <span className="text-muted-foreground font-normal">· {brands.length}</span>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                            {brands.length === 0 ? (
                                <div className="text-center py-10 text-sm text-muted-foreground">
                                    <Tag className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                    No brands yet. Add the 7–10 brands you deal in above —
                                    they'll show on every quotation.
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {brands.map((b) => (
                                        <div key={b.id} className="group relative rounded-lg border bg-white p-4 flex flex-col items-center gap-2">
                                            <img src={b.logo_url} alt={b.name} className="h-12 w-auto object-contain" />
                                            <span className="text-xs text-center text-muted-foreground truncate w-full">{b.name}</span>
                                            <button
                                                onClick={() => remove(b)}
                                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-1 bg-red-50 text-red-600 hover:bg-red-100"
                                                aria-label={`Remove ${b.name}`}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </SettingsShell>
        </AdminLayout>
    );
}
