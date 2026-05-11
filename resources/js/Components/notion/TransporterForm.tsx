import { useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import type { Transporter } from '@/types/entities';

type Props = {
    transporter?: Transporter | null;
    onDone?: () => void;
};

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

const PAYMENT_TERMS = ['advance', 'weekly', 'fortnightly', 'monthly'];
const STATUSES = ['active', 'inactive'];

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

export function TransporterForm({ transporter, onDone }: Props) {
    const isEdit = !!transporter?.id;
    const form = useForm(emptyForm(transporter));

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const opts = { preserveScroll: true, onSuccess: () => onDone?.() };

        if (isEdit) {
            form.patch(route('transporters.update', { transporter: transporter!.id }), opts);
        } else {
            form.post(route('transporters.store'), opts);
        }
    };

    const handleDelete = () => {
        if (!isEdit) return;
        if (!confirm(`Delete transporter "${transporter!.name}"? This cannot be undone.`)) return;
        form.delete(route('transporters.destroy', { transporter: transporter!.id }), {
            onSuccess: () => onDone?.(),
        });
    };

    const field = (label: string, key: keyof FormShape, type: string = 'text', extra: Record<string, unknown> = {}) => (
        <div className="grid grid-cols-[160px_1fr] items-center gap-3">
            <label className="text-xs text-[var(--color-muted-foreground)]" htmlFor={key}>
                {label}
            </label>
            <Input
                id={key}
                type={type}
                value={form.data[key] as string | number}
                onChange={(e) => form.setData(key, e.target.value)}
                {...extra}
            />
            {form.errors[key] && (
                <p className="col-start-2 text-xs text-[var(--color-destructive)]">
                    {form.errors[key]}
                </p>
            )}
        </div>
    );

    const selectField = (label: string, key: keyof FormShape, options: string[]) => (
        <div className="grid grid-cols-[160px_1fr] items-center gap-3">
            <label className="text-xs text-[var(--color-muted-foreground)]" htmlFor={key}>
                {label}
            </label>
            <select
                id={key}
                value={form.data[key] as string}
                onChange={(e) => form.setData(key, e.target.value)}
                className="h-8 rounded-md border bg-[var(--color-background)] px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-1"
            >
                <option value="">—</option>
                {options.map((o) => (
                    <option key={o} value={o}>
                        {o}
                    </option>
                ))}
            </select>
        </div>
    );

    return (
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
                {field('Name *', 'name')}
                {field('Contact person', 'contact_person')}
                {field('Primary phone', 'primary_phone')}
                {field('Secondary phone', 'secondary_phone')}
                {field('WhatsApp', 'whatsapp')}
                {field('Email', 'email', 'email')}
                {field('Office address', 'office_address')}
                {field('City', 'city')}
                {field('GSTIN', 'gstin')}
                {field('Avg transit days', 'avg_transit_days', 'number')}
                {field('Cost per kg (₹)', 'cost_per_kg', 'number', { step: '0.01' })}
                {field('Triplicate reliability (1-5)', 'triplicate_reliability', 'number', { min: 1, max: 5 })}
                {selectField('Payment terms', 'payment_terms', PAYMENT_TERMS)}
                {selectField('Status', 'status', STATUSES)}

                <div className="grid grid-cols-[160px_1fr] items-start gap-3">
                    <label className="pt-2 text-xs text-[var(--color-muted-foreground)]" htmlFor="notes">
                        Notes
                    </label>
                    <textarea
                        id="notes"
                        value={form.data.notes}
                        onChange={(e) => form.setData('notes', e.target.value)}
                        rows={3}
                        className="rounded-md border bg-[var(--color-background)] p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-1"
                    />
                </div>
            </div>

            <div className="flex items-center justify-between border-t px-6 py-3">
                {isEdit ? (
                    <Button type="button" variant="ghost" onClick={handleDelete}>
                        Delete
                    </Button>
                ) : (
                    <span />
                )}
                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={onDone}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={form.processing}>
                        {form.processing ? 'Saving…' : isEdit ? 'Save changes' : 'Create transporter'}
                    </Button>
                </div>
            </div>
        </form>
    );
}
