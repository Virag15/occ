import { Head, router, useForm } from '@inertiajs/react';
import { FormEvent, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Upload, Trash2, Tags, Images, Image as ImageIcon } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { SettingsShell } from './SettingsShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

type Brand = {
    id: number;
    name: string;
    sort_order: number;
    logo_url: string;
};

/**
 * Brand logos this workspace deals in — auto-rendered on quotation +
 * invoice PDFs as an "Authorised dealer for" strip. Uses the exact
 * Settings layout (AdminLayout + SettingsShell) and the same logo-
 * upload pattern as Settings → Company for visual consistency.
 */
export default function BrandingSettings({ brands }: { brands: Brand[] }) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const form = useForm<{ name: string; logo: File | null; sort_order: number }>({
        name: '',
        logo: null,
        sort_order: 0,
    });

    const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] ?? null;
        form.setData('logo', f);
        setPreview(f ? URL.createObjectURL(f) : null);
    };

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
                <div className="space-y-6">
                    {/* ─── Add a brand ──────────────────────────────── */}
                    <Card>
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                <Tags className="h-4 w-4 text-muted-foreground" /> Add a brand
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                            <form onSubmit={submit} className="space-y-4">
                                {/* Logo upload — mirrors Settings → Company */}
                                <div className="flex items-center gap-4">
                                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded border bg-muted/30">
                                        {preview
                                            ? <img src={preview} alt="" className="max-h-full max-w-full object-contain" />
                                            : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <Label htmlFor="logo" className="text-xs">Logo image</Label>
                                        <Input
                                            ref={fileRef}
                                            id="logo"
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            onChange={onFile}
                                        />
                                        <p className="text-[10px] text-muted-foreground">
                                            PNG / JPG / WEBP, max 2&nbsp;MB. Compressed to 400px. Auto-renders on
                                            quotation &amp; invoice PDFs as an &ldquo;Authorised dealer for&rdquo; strip.
                                        </p>
                                        {form.errors.logo && (
                                            <p className="text-[10px] text-destructive">{form.errors.logo}</p>
                                        )}
                                    </div>
                                </div>

                                <Separator />

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <div className="space-y-1.5 sm:col-span-2">
                                        <Label htmlFor="name" className="text-xs">Brand name</Label>
                                        <Input
                                            id="name"
                                            value={form.data.name}
                                            onChange={(e) => form.setData('name', e.target.value)}
                                            placeholder="e.g. Schneider Electric"
                                            maxLength={80}
                                            required
                                        />
                                        {form.errors.name && (
                                            <p className="text-[10px] text-destructive">{form.errors.name}</p>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="sort_order" className="text-xs">Display order</Label>
                                        <Input
                                            id="sort_order"
                                            type="number"
                                            min={0}
                                            max={999}
                                            value={form.data.sort_order}
                                            onChange={(e) => form.setData('sort_order', Number(e.target.value))}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <Button type="submit" disabled={form.processing}>
                                        <Upload className="h-4 w-4 mr-1" /> Add brand
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* ─── Your brands ──────────────────────────────── */}
                    <Card>
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                <Images className="h-4 w-4 text-muted-foreground" />
                                Your brands
                                {brands.length > 0 && (
                                    <span className="font-normal text-muted-foreground">· {brands.length}</span>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                            {brands.length === 0 ? (
                                <div className="py-10 text-center text-sm text-muted-foreground">
                                    <Images className="mx-auto mb-2 h-8 w-8 opacity-40" />
                                    No brands yet. Add the 7–10 brands you deal in above —
                                    they&rsquo;ll show on every quotation.
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                                    {brands.map((b) => (
                                        <div
                                            key={b.id}
                                            className="group relative flex flex-col items-center gap-2 rounded-lg border bg-card p-4"
                                        >
                                            <div className="flex h-12 w-full items-center justify-center overflow-hidden">
                                                <img src={b.logo_url} alt={b.name} className="max-h-12 max-w-full object-contain" />
                                            </div>
                                            <span className="w-full truncate text-center text-xs text-muted-foreground">
                                                {b.name}
                                            </span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => remove(b)}
                                                aria-label={`Remove ${b.name}`}
                                                className="absolute right-1 top-1 h-7 w-7 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
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
