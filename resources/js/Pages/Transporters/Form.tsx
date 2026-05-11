import { Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { toast } from 'sonner';
import { Save, Truck, Phone, MapPin, Gauge, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Transporter } from '@/types/entities';

const PAYMENT_TERMS = ['advance', 'weekly', 'fortnightly', 'monthly'];
const STATUSES = ['active', 'inactive'];

type FormShape = {
    name: string; contact_person: string;
    primary_phone: string; secondary_phone: string; whatsapp: string; email: string;
    office_address: string; city: string; gstin: string;
    avg_transit_days: number | string; cost_per_kg: number | string; triplicate_reliability: number | string;
    payment_terms: string; status: string;
    notes: string;
};

function emptyForm(t?: Transporter | null): FormShape {
    return {
        name: t?.name ?? '', contact_person: t?.contact_person ?? '',
        primary_phone: t?.primary_phone ?? '', secondary_phone: t?.secondary_phone ?? '',
        whatsapp: t?.whatsapp ?? '', email: t?.email ?? '',
        office_address: t?.office_address ?? '', city: t?.city ?? '', gstin: t?.gstin ?? '',
        avg_transit_days: t?.avg_transit_days ?? '', cost_per_kg: t?.cost_per_kg ?? '',
        triplicate_reliability: t?.triplicate_reliability ?? '',
        payment_terms: t?.payment_terms ?? '', status: t?.status ?? 'active',
        notes: t?.notes ?? '',
    };
}

export default function TransporterForm({ transporter }: { transporter?: Transporter | null }) {
    const isEdit = !!transporter?.id;
    const form = useForm<FormShape>(emptyForm(transporter));

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const onSuccess = () => toast.success(isEdit ? 'Transporter updated' : 'Transporter created');
        if (isEdit) form.patch(route('transporters.update', { transporter: transporter!.id }), { onSuccess });
        else form.post(route('transporters.store'), { onSuccess });
    };

    return (
        <form onSubmit={submit} noValidate className="space-y-5 pb-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                        {isEdit ? transporter!.name : 'New transporter'}
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        {isEdit ? `Editing ${transporter!.transporter_code ?? transporter!.name}` : 'Onboard a new logistics partner'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" asChild>
                        <Link href={route('transporters.index')}>Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={form.processing} size="sm">
                        <Save className="h-3.5 w-3.5 mr-1" />
                        {form.processing ? 'Saving…' : isEdit ? 'Update transporter' : 'Create transporter'}
                    </Button>
                </div>
            </div>

            <Section icon={Truck} title="Identity">
                <Grid cols={2}>
                    <Field label="Name *" id="name" error={form.errors.name}>
                        <Input id="name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} required />
                    </Field>
                    <Field label="Contact person" id="contact_person" error={form.errors.contact_person}>
                        <Input id="contact_person" value={form.data.contact_person} onChange={(e) => form.setData('contact_person', e.target.value)} />
                    </Field>
                </Grid>
            </Section>

            <Section icon={Phone} title="Reach">
                <Grid cols={2}>
                    <Field label="Primary phone" id="primary_phone" error={form.errors.primary_phone}>
                        <Input id="primary_phone" className="font-mono text-xs" value={form.data.primary_phone} onChange={(e) => form.setData('primary_phone', e.target.value)} />
                    </Field>
                    <Field label="Secondary phone" id="secondary_phone" error={form.errors.secondary_phone}>
                        <Input id="secondary_phone" className="font-mono text-xs" value={form.data.secondary_phone} onChange={(e) => form.setData('secondary_phone', e.target.value)} />
                    </Field>
                    <Field label="WhatsApp" id="whatsapp" error={form.errors.whatsapp} help="If different from primary phone">
                        <Input id="whatsapp" className="font-mono text-xs" value={form.data.whatsapp} onChange={(e) => form.setData('whatsapp', e.target.value)} />
                    </Field>
                    <Field label="Email" id="email" error={form.errors.email}>
                        <Input id="email" type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} />
                    </Field>
                </Grid>
            </Section>

            <Section icon={MapPin} title="Office & tax">
                <Field label="Office address" id="office_address" error={form.errors.office_address}>
                    <Textarea id="office_address" rows={2} value={form.data.office_address} onChange={(e) => form.setData('office_address', e.target.value)} />
                </Field>
                <Grid cols={2}>
                    <Field label="City" id="city" error={form.errors.city}>
                        <Input id="city" value={form.data.city} onChange={(e) => form.setData('city', e.target.value)} />
                    </Field>
                    <Field label="GSTIN" id="gstin" error={form.errors.gstin} help="Needed for ITC on transport bills">
                        <Input id="gstin" className="font-mono text-xs uppercase" value={form.data.gstin} onChange={(e) => form.setData('gstin', e.target.value.toUpperCase())} />
                    </Field>
                </Grid>
            </Section>

            <Section icon={Gauge} title="Logistics performance">
                <Grid cols={2}>
                    <Field label="Avg transit days" id="avg_transit_days" error={form.errors.avg_transit_days} help="Typical delivery time">
                        <Input id="avg_transit_days" type="number" value={form.data.avg_transit_days} onChange={(e) => form.setData('avg_transit_days', e.target.value)} className="tabular-nums" />
                    </Field>
                    <Field label="Cost per kg (₹)" id="cost_per_kg" error={form.errors.cost_per_kg}>
                        <Input id="cost_per_kg" type="number" step="0.01" value={form.data.cost_per_kg} onChange={(e) => form.setData('cost_per_kg', e.target.value)} className="tabular-nums" />
                    </Field>
                    <Field label="Triplicate reliability (1–5)" id="triplicate_reliability" error={form.errors.triplicate_reliability} help="1 = bad, 5 = always returns triplicate">
                        <Input id="triplicate_reliability" type="number" min={1} max={5} value={form.data.triplicate_reliability} onChange={(e) => form.setData('triplicate_reliability', e.target.value)} className="tabular-nums" />
                    </Field>
                </Grid>
                <Grid cols={2}>
                    <Field label="Payment terms" id="payment_terms" error={form.errors.payment_terms}>
                        <Select value={form.data.payment_terms || undefined} onValueChange={(v) => form.setData('payment_terms', v)}>
                            <SelectTrigger id="payment_terms"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent>
                                {PAYMENT_TERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label="Status" id="status" error={form.errors.status}>
                        <Select value={form.data.status} onValueChange={(v) => form.setData('status', v)}>
                            <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </Field>
                </Grid>
            </Section>

            <Section icon={FileText} title="Internal notes">
                <Field label="" id="notes" error={form.errors.notes}>
                    <Textarea
                        id="notes"
                        rows={3}
                        value={form.data.notes}
                        onChange={(e) => form.setData('notes', e.target.value)}
                        placeholder="Quirks of this transporter — bad weather behavior, preferred contacts, recurring issues…"
                    />
                </Field>
            </Section>

            <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" asChild>
                    <Link href={route('transporters.index')}>Cancel</Link>
                </Button>
                <Button type="submit" disabled={form.processing}>
                    <Save className="h-4 w-4 mr-1" />
                    {form.processing ? 'Saving…' : isEdit ? 'Update transporter' : 'Create transporter'}
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
