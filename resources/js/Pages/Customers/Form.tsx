import { Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { toast } from 'sonner';
import { Save, User, Phone, MapPin, IndianRupee, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Customer } from '@/types/entities';

const PAYMENT_TERMS = ['advance', 'cod', '7_days', '15_days', '30_days', '45_days', '60_days'];
const CUSTOMER_TYPES = ['dealer', 'contractor', 'oem', 'end_user', 'government'];
const STATUSES = ['active', 'inactive', 'credit_hold', 'new'];

type FormShape = {
    name: string; company: string; gstin: string;
    contact_person: string; phone: string; whatsapp: string; email: string;
    billing_address: string; delivery_address: string; city: string; state: string;
    payment_terms: string; credit_limit: number | string;
    customer_type: string; status: string;
    notes: string;
};

function emptyForm(c?: Customer | null): FormShape {
    return {
        name: c?.name ?? '', company: c?.company ?? '', gstin: c?.gstin ?? '',
        contact_person: c?.contact_person ?? '', phone: c?.phone ?? '',
        whatsapp: c?.whatsapp ?? '', email: c?.email ?? '',
        billing_address: c?.billing_address ?? '', delivery_address: c?.delivery_address ?? '',
        city: c?.city ?? '', state: c?.state ?? '',
        payment_terms: c?.payment_terms ?? '', credit_limit: c?.credit_limit ?? '',
        customer_type: c?.customer_type ?? '', status: c?.status ?? 'active',
        notes: c?.notes ?? '',
    };
}

export default function CustomerForm({ customer }: { customer?: Customer | null }) {
    const isEdit = !!customer?.id;
    const form = useForm<FormShape>(emptyForm(customer));

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const onSuccess = () => toast.success(isEdit ? 'Customer updated (queued for Tally sync)' : 'Customer created (queued for Tally sync)');
        if (isEdit) form.patch(route('customers.update', { customer: customer!.id }), { onSuccess });
        else form.post(route('customers.store'), { onSuccess });
    };

    return (
        <form onSubmit={submit} noValidate className="space-y-5 pb-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                    {isEdit ? `Editing ${customer!.customer_code ?? customer!.name}` : 'Add a new customer to the directory'}
                </p>
                <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" asChild>
                        <Link href={route('customers.index')}>Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={form.processing} size="sm">
                        <Save className="h-3.5 w-3.5 mr-1" />
                        {form.processing ? 'Saving…' : isEdit ? 'Update customer' : 'Create customer'}
                    </Button>
                </div>
            </div>

            <Section icon={User} title="Identity">
                <Grid cols={2}>
                    <Field label="Name *" id="name" error={form.errors.name}>
                        <Input id="name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} required />
                    </Field>
                    <Field label="Company" id="company" error={form.errors.company} help="Legal entity, if different from Name">
                        <Input id="company" value={form.data.company} onChange={(e) => form.setData('company', e.target.value)} />
                    </Field>
                    <Field label="GSTIN" id="gstin" error={form.errors.gstin} help="15-character GST identification">
                        <Input id="gstin" className="font-mono text-xs uppercase" value={form.data.gstin} onChange={(e) => form.setData('gstin', e.target.value.toUpperCase())} />
                    </Field>
                    <Field label="Customer type" id="customer_type" error={form.errors.customer_type}>
                        <Select value={form.data.customer_type || undefined} onValueChange={(v) => form.setData('customer_type', v)}>
                            <SelectTrigger id="customer_type"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent>
                                {CUSTOMER_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </Field>
                </Grid>
            </Section>

            <Section icon={Phone} title="Contact">
                <Grid cols={2}>
                    <Field label="Contact person" id="contact_person" error={form.errors.contact_person}>
                        <Input id="contact_person" value={form.data.contact_person} onChange={(e) => form.setData('contact_person', e.target.value)} />
                    </Field>
                    <Field label="Phone" id="phone" error={form.errors.phone}>
                        <Input id="phone" className="font-mono text-xs" value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} />
                    </Field>
                    <Field label="WhatsApp" id="whatsapp" error={form.errors.whatsapp} help="If different from primary phone">
                        <Input id="whatsapp" className="font-mono text-xs" value={form.data.whatsapp} onChange={(e) => form.setData('whatsapp', e.target.value)} />
                    </Field>
                    <Field label="Email" id="email" error={form.errors.email}>
                        <Input id="email" type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} />
                    </Field>
                </Grid>
            </Section>

            <Section icon={MapPin} title="Addresses">
                <div className="space-y-3">
                    <Field label="Billing address" id="billing_address" error={form.errors.billing_address}>
                        <Textarea id="billing_address" rows={2} value={form.data.billing_address} onChange={(e) => form.setData('billing_address', e.target.value)} />
                    </Field>
                    <Field label="Delivery address" id="delivery_address" error={form.errors.delivery_address} help="Leave blank to use billing address">
                        <Textarea id="delivery_address" rows={2} value={form.data.delivery_address} onChange={(e) => form.setData('delivery_address', e.target.value)} />
                    </Field>
                    <Grid cols={2}>
                        <Field label="City" id="city" error={form.errors.city}>
                            <Input id="city" value={form.data.city} onChange={(e) => form.setData('city', e.target.value)} />
                        </Field>
                        <Field label="State" id="state" error={form.errors.state}>
                            <Input id="state" value={form.data.state} onChange={(e) => form.setData('state', e.target.value)} />
                        </Field>
                    </Grid>
                </div>
            </Section>

            <Section icon={IndianRupee} title="Commercial terms">
                <Grid cols={2}>
                    <Field label="Payment terms" id="payment_terms" error={form.errors.payment_terms}>
                        <Select value={form.data.payment_terms || undefined} onValueChange={(v) => form.setData('payment_terms', v)}>
                            <SelectTrigger id="payment_terms"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent>
                                {PAYMENT_TERMS.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label="Credit limit (₹)" id="credit_limit" error={form.errors.credit_limit} help="Max outstanding before alerts">
                        <Input id="credit_limit" type="number" step="0.01" value={form.data.credit_limit} onChange={(e) => form.setData('credit_limit', e.target.value)} className="tabular-nums" />
                    </Field>
                    <Field label="Status" id="status" error={form.errors.status}>
                        <Select value={form.data.status} onValueChange={(v) => form.setData('status', v)}>
                            <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
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
                        placeholder="Anything the team should know about this customer…"
                    />
                </Field>
            </Section>

            <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" asChild>
                    <Link href={route('customers.index')}>Cancel</Link>
                </Button>
                <Button type="submit" disabled={form.processing}>
                    <Save className="h-4 w-4 mr-1" />
                    {form.processing ? 'Saving…' : isEdit ? 'Update customer' : 'Create customer'}
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
            <CardContent className="p-4 pt-2">{children}</CardContent>
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
