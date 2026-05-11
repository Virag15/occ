import { Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { Transporter } from '@/types/entities';

const PAYMENT_TERMS = ['advance', 'weekly', 'fortnightly', 'monthly'];
const STATUSES = ['active', 'inactive'];

type FormShape = {
    name: string;
    contact_person: string;
    primary_phone: string;
    secondary_phone: string;
    whatsapp: string;
    email: string;
    office_address: string;
    city: string;
    gstin: string;
    avg_transit_days: number | string;
    cost_per_kg: number | string;
    triplicate_reliability: number | string;
    payment_terms: string;
    status: string;
    notes: string;
};

function emptyForm(t?: Transporter | null): FormShape {
    return {
        name: t?.name ?? '',
        contact_person: t?.contact_person ?? '',
        primary_phone: t?.primary_phone ?? '',
        secondary_phone: t?.secondary_phone ?? '',
        whatsapp: t?.whatsapp ?? '',
        email: t?.email ?? '',
        office_address: t?.office_address ?? '',
        city: t?.city ?? '',
        gstin: t?.gstin ?? '',
        avg_transit_days: t?.avg_transit_days ?? '',
        cost_per_kg: t?.cost_per_kg ?? '',
        triplicate_reliability: t?.triplicate_reliability ?? '',
        payment_terms: t?.payment_terms ?? '',
        status: t?.status ?? 'active',
        notes: t?.notes ?? '',
    };
}

export default function TransporterForm({ transporter }: { transporter?: Transporter | null }) {
    const isEdit = !!transporter?.id;
    const form = useForm<FormShape>(emptyForm(transporter));

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const onSuccess = () => toast.success(isEdit ? 'Transporter updated' : 'Transporter created');
        if (isEdit) {
            form.patch(route('transporters.update', { transporter: transporter!.id }), { onSuccess });
        } else {
            form.post(route('transporters.store'), { onSuccess });
        }
    };

    return (
        <>
            <div className="mb-6">
                <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2">
                    <Link href={route('transporters.index')}>
                        <ArrowLeft className="h-4 w-4" /> Back to Transporters
                    </Link>
                </Button>
            </div>

            <form onSubmit={submit} className="space-y-6 max-w-3xl">
                {/* Basic */}
                <div className="space-y-4">
                    <Label className="text-base font-semibold">Basic info</Label>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <FieldRow label="Name *" id="name" error={form.errors.name}>
                            <Input id="name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} required />
                        </FieldRow>
                        <FieldRow label="Contact person" id="contact_person" error={form.errors.contact_person}>
                            <Input id="contact_person" value={form.data.contact_person} onChange={(e) => form.setData('contact_person', e.target.value)} />
                        </FieldRow>
                    </div>
                </div>

                <Separator />

                {/* Reach */}
                <div className="space-y-4">
                    <Label className="text-base font-semibold">Reach</Label>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <FieldRow label="Primary phone" id="primary_phone" error={form.errors.primary_phone}>
                            <Input id="primary_phone" value={form.data.primary_phone} onChange={(e) => form.setData('primary_phone', e.target.value)} />
                        </FieldRow>
                        <FieldRow label="Secondary phone" id="secondary_phone" error={form.errors.secondary_phone}>
                            <Input id="secondary_phone" value={form.data.secondary_phone} onChange={(e) => form.setData('secondary_phone', e.target.value)} />
                        </FieldRow>
                        <FieldRow label="WhatsApp" id="whatsapp" error={form.errors.whatsapp}>
                            <Input id="whatsapp" value={form.data.whatsapp} onChange={(e) => form.setData('whatsapp', e.target.value)} />
                        </FieldRow>
                        <FieldRow label="Email" id="email" error={form.errors.email}>
                            <Input id="email" type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} />
                        </FieldRow>
                    </div>
                    <FieldRow label="Office address" id="office_address" error={form.errors.office_address}>
                        <Textarea id="office_address" rows={2} value={form.data.office_address} onChange={(e) => form.setData('office_address', e.target.value)} />
                    </FieldRow>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <FieldRow label="City" id="city" error={form.errors.city}>
                            <Input id="city" value={form.data.city} onChange={(e) => form.setData('city', e.target.value)} />
                        </FieldRow>
                        <FieldRow label="GSTIN" id="gstin" error={form.errors.gstin}>
                            <Input id="gstin" className="font-mono text-xs" value={form.data.gstin} onChange={(e) => form.setData('gstin', e.target.value)} />
                        </FieldRow>
                    </div>
                </div>

                <Separator />

                {/* Logistics */}
                <div className="space-y-4">
                    <Label className="text-base font-semibold">Logistics</Label>
                    <div className="grid sm:grid-cols-3 gap-4">
                        <FieldRow label="Avg transit days" id="avg_transit_days" error={form.errors.avg_transit_days}>
                            <Input id="avg_transit_days" type="number" value={form.data.avg_transit_days} onChange={(e) => form.setData('avg_transit_days', e.target.value)} />
                        </FieldRow>
                        <FieldRow label="Cost per kg (₹)" id="cost_per_kg" error={form.errors.cost_per_kg}>
                            <Input id="cost_per_kg" type="number" step="0.01" value={form.data.cost_per_kg} onChange={(e) => form.setData('cost_per_kg', e.target.value)} />
                        </FieldRow>
                        <FieldRow label="Triplicate reliability (1–5)" id="triplicate_reliability" error={form.errors.triplicate_reliability}>
                            <Input id="triplicate_reliability" type="number" min={1} max={5} value={form.data.triplicate_reliability} onChange={(e) => form.setData('triplicate_reliability', e.target.value)} />
                        </FieldRow>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <FieldRow label="Payment terms" id="payment_terms" error={form.errors.payment_terms}>
                            <Select value={form.data.payment_terms || undefined} onValueChange={(v: string) => form.setData('payment_terms', v)}>
                                <SelectTrigger id="payment_terms"><SelectValue placeholder="—" /></SelectTrigger>
                                <SelectContent>
                                    {PAYMENT_TERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </FieldRow>
                        <FieldRow label="Status" id="status" error={form.errors.status}>
                            <Select value={form.data.status} onValueChange={(v: string) => form.setData('status', v)}>
                                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </FieldRow>
                    </div>
                </div>

                <Separator />

                <FieldRow label="Notes" id="notes" error={form.errors.notes}>
                    <Textarea id="notes" rows={3} value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} />
                </FieldRow>

                <Separator />

                <div className="flex gap-3">
                    <Button type="submit" disabled={form.processing}>
                        {form.processing ? 'Saving…' : isEdit ? 'Update transporter' : 'Create transporter'}
                    </Button>
                    <Button type="button" variant="outline" asChild>
                        <Link href={route('transporters.index')}>Cancel</Link>
                    </Button>
                </div>
            </form>
        </>
    );
}

function FieldRow({ label, id, error, children }: { label: string; id: string; error?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            {children}
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
}
