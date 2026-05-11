import { Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { DatePicker } from '@/components/ui/date-picker';
import { Combobox, ComboOption } from '@/components/ui/combobox';
import type { CustomerLite, Order, TransporterLite } from '@/types/entities';

const STATUSES = ['new_order', 'confirmed', 'stock_check', 'packing', 'packed', 'ready_for_dispatch', 'dispatched', 'delivered', 'closed', 'on_hold', 'cancelled'];
const PRIORITIES = ['urgent', 'high', 'normal', 'low'];
const ORDER_SOURCES = ['whatsapp', 'email', 'phone', 'in_person', 'po'];
const PAYMENT_TERMS = ['advance', 'cod', '7_days', '15_days', '30_days', '45_days', '60_days'];
const PAYMENT_STATUSES = ['not_due', 'pending', 'partial', 'paid', 'overdue'];
const PAYMENT_MODES = ['neft', 'rtgs', 'upi', 'cheque', 'cash'];

type FormShape = {
    order_code: string;
    customer_id: number | string;
    order_date: string;
    order_source: string;
    brands: string; // comma-separated input, parsed on submit
    order_value: number | string;
    status: string;
    priority: string;

    packing_slip_generated: boolean;
    packed_by: string;
    items_packed_count: number | string;
    parcel_weight_kg: number | string;
    number_of_boxes: number | string;

    pickup_scheduled_date: string;
    transporter_id: number | string;
    driver_name: string;
    driver_contact: string;
    vehicle_number: string;
    dispatch_date: string;
    lr_number: string;
    lr_shared_with_customer: boolean;
    expected_delivery: string;

    delivered_date: string;
    pod_received: boolean;
    triplicate_received: boolean;
    triplicate_received_date: string;

    invoice_number: string;
    invoice_date: string;
    payment_terms: string;
    payment_due_date: string;
    payment_status: string;
    amount_received: number | string;
    payment_received_date: string;
    payment_mode: string;

    internal_notes: string;
};

function init(order?: Order | null, defaults?: { order_code?: string }): FormShape {
    return {
        order_code: order?.order_code ?? defaults?.order_code ?? '',
        customer_id: order?.customer_id ?? '',
        order_date: order?.order_date ?? new Date().toISOString().split('T')[0],
        order_source: order?.order_source ?? '',
        brands: (order?.brands ?? []).join(', '),
        order_value: order?.order_value ?? '',
        status: order?.status ?? 'new_order',
        priority: order?.priority ?? 'normal',

        packing_slip_generated: order?.packing_slip_generated ?? false,
        packed_by: order?.packed_by ?? '',
        items_packed_count: order?.items_packed_count ?? '',
        parcel_weight_kg: order?.parcel_weight_kg ?? '',
        number_of_boxes: order?.number_of_boxes ?? '',

        pickup_scheduled_date: order?.pickup_scheduled_date ?? '',
        transporter_id: order?.transporter_id ?? '',
        driver_name: order?.driver_name ?? '',
        driver_contact: order?.driver_contact ?? '',
        vehicle_number: order?.vehicle_number ?? '',
        dispatch_date: order?.dispatch_date ?? '',
        lr_number: order?.lr_number ?? '',
        lr_shared_with_customer: order?.lr_shared_with_customer ?? false,
        expected_delivery: order?.expected_delivery ?? '',

        delivered_date: order?.delivered_date ?? '',
        pod_received: order?.pod_received ?? false,
        triplicate_received: order?.triplicate_received ?? false,
        triplicate_received_date: order?.triplicate_received_date ?? '',

        invoice_number: order?.invoice_number ?? '',
        invoice_date: order?.invoice_date ?? '',
        payment_terms: order?.payment_terms ?? '',
        payment_due_date: order?.payment_due_date ?? '',
        payment_status: order?.payment_status ?? 'not_due',
        amount_received: order?.amount_received ?? '',
        payment_received_date: order?.payment_received_date ?? '',
        payment_mode: order?.payment_mode ?? '',

        internal_notes: order?.internal_notes ?? '',
    };
}

export default function OrderForm({
    order,
    customers,
    transporters,
    nextOrderCode,
}: {
    order?: Order | null;
    customers: CustomerLite[];
    transporters: TransporterLite[];
    nextOrderCode?: string;
}) {
    const isEdit = !!order?.id;
    const form = useForm<FormShape>(init(order, { order_code: nextOrderCode }));

    const setDate = (key: keyof FormShape) => (d: Date | undefined) => {
        if (!d) return;
        form.setData(key, d.toISOString().split('T')[0] as never);
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
        <>
            <div className="mb-6">
                <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2">
                    <Link href={route('orders.index')}>
                        <ArrowLeft className="h-4 w-4" /> Back to Orders
                    </Link>
                </Button>
            </div>

            <form onSubmit={submit} className="space-y-6">
                {/* Basic */}
                <Section title="Order">
                    <Grid cols={3}>
                        <Field label="Order code" id="order_code">
                            <Input id="order_code" value={form.data.order_code} readOnly className="font-mono text-xs bg-muted" />
                        </Field>
                        <Field label="Order date *" id="order_date" error={form.errors.order_date}>
                            <DatePicker id="order_date" value={form.data.order_date} onChange={setDate('order_date')} />
                        </Field>
                        <Field label="Source" id="order_source" error={form.errors.order_source}>
                            <Select value={form.data.order_source || undefined} onValueChange={(v: string) => form.setData('order_source', v)}>
                                <SelectTrigger id="order_source"><SelectValue placeholder="—" /></SelectTrigger>
                                <SelectContent>
                                    {ORDER_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </Field>
                    </Grid>
                    <Grid cols={3}>
                        <Field label="Customer *" id="customer_id" error={form.errors.customer_id}>
                            <Combobox
                                id="customer_id"
                                value={form.data.customer_id ? String(form.data.customer_id) : ''}
                                onChange={(v) => form.setData('customer_id', Number(v))}
                                options={customers.map((c): ComboOption => ({ value: String(c.id), label: c.name, sublabel: c.company ?? undefined }))}
                                placeholder="Select customer"
                                searchPlaceholder="Search by name or company…"
                            />
                        </Field>
                        <Field label="Status *" id="status" error={form.errors.status}>
                            <Select value={form.data.status} onValueChange={(v: string) => form.setData('status', v)}>
                                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label="Priority *" id="priority" error={form.errors.priority}>
                            <Select value={form.data.priority} onValueChange={(v: string) => form.setData('priority', v)}>
                                <SelectTrigger id="priority"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </Field>
                    </Grid>
                    <Grid cols={2}>
                        <Field label="Brands (comma-separated)" id="brands" error={form.errors.brands}>
                            <Input id="brands" placeholder="C&S Electric, BCH Electric" value={form.data.brands} onChange={(e) => form.setData('brands', e.target.value)} />
                        </Field>
                        <Field label="Order value (₹)" id="order_value" error={form.errors.order_value}>
                            <Input id="order_value" type="number" step="0.01" value={form.data.order_value} onChange={(e) => form.setData('order_value', e.target.value)} />
                        </Field>
                    </Grid>
                </Section>

                <Separator />

                {/* Packing */}
                <Section title="Packing">
                    <div className="flex items-center gap-3 pb-1">
                        <Switch id="packing_slip_generated" checked={form.data.packing_slip_generated} onCheckedChange={(v: boolean) => form.setData('packing_slip_generated', v)} />
                        <Label htmlFor="packing_slip_generated" className="font-normal cursor-pointer">Packing slip generated</Label>
                    </div>
                    <Grid cols={4}>
                        <Field label="Packed by" id="packed_by" error={form.errors.packed_by}>
                            <Input id="packed_by" value={form.data.packed_by} onChange={(e) => form.setData('packed_by', e.target.value)} />
                        </Field>
                        <Field label="Items packed" id="items_packed_count" error={form.errors.items_packed_count}>
                            <Input id="items_packed_count" type="number" value={form.data.items_packed_count} onChange={(e) => form.setData('items_packed_count', e.target.value)} />
                        </Field>
                        <Field label="Parcel weight (kg)" id="parcel_weight_kg" error={form.errors.parcel_weight_kg}>
                            <Input id="parcel_weight_kg" type="number" step="0.01" value={form.data.parcel_weight_kg} onChange={(e) => form.setData('parcel_weight_kg', e.target.value)} />
                        </Field>
                        <Field label="Number of boxes" id="number_of_boxes" error={form.errors.number_of_boxes}>
                            <Input id="number_of_boxes" type="number" value={form.data.number_of_boxes} onChange={(e) => form.setData('number_of_boxes', e.target.value)} />
                        </Field>
                    </Grid>
                </Section>

                <Separator />

                {/* Dispatch */}
                <Section title="Dispatch">
                    <Grid cols={3}>
                        <Field label="Pickup scheduled" id="pickup_scheduled_date" error={form.errors.pickup_scheduled_date}>
                            <DatePicker id="pickup_scheduled_date" value={form.data.pickup_scheduled_date} onChange={setDate('pickup_scheduled_date')} />
                        </Field>
                        <Field label="Dispatch date" id="dispatch_date" error={form.errors.dispatch_date}>
                            <DatePicker id="dispatch_date" value={form.data.dispatch_date} onChange={setDate('dispatch_date')} />
                        </Field>
                        <Field label="Expected delivery" id="expected_delivery" error={form.errors.expected_delivery}>
                            <DatePicker id="expected_delivery" value={form.data.expected_delivery} onChange={setDate('expected_delivery')} />
                        </Field>
                    </Grid>
                    <Grid cols={3}>
                        <Field label="Transporter" id="transporter_id" error={form.errors.transporter_id}>
                            <Combobox
                                id="transporter_id"
                                value={form.data.transporter_id ? String(form.data.transporter_id) : ''}
                                onChange={(v) => form.setData('transporter_id', Number(v))}
                                options={transporters.map((t): ComboOption => ({ value: String(t.id), label: t.name }))}
                                placeholder="Select transporter"
                                searchPlaceholder="Search transporters…"
                            />
                        </Field>
                        <Field label="Driver name" id="driver_name" error={form.errors.driver_name}>
                            <Input id="driver_name" value={form.data.driver_name} onChange={(e) => form.setData('driver_name', e.target.value)} />
                        </Field>
                        <Field label="Driver contact" id="driver_contact" error={form.errors.driver_contact}>
                            <Input id="driver_contact" value={form.data.driver_contact} onChange={(e) => form.setData('driver_contact', e.target.value)} />
                        </Field>
                    </Grid>
                    <Grid cols={3}>
                        <Field label="Vehicle number" id="vehicle_number" error={form.errors.vehicle_number}>
                            <Input id="vehicle_number" className="font-mono text-xs" value={form.data.vehicle_number} onChange={(e) => form.setData('vehicle_number', e.target.value)} />
                        </Field>
                        <Field label="LR number" id="lr_number" error={form.errors.lr_number}>
                            <Input id="lr_number" className="font-mono text-xs" value={form.data.lr_number} onChange={(e) => form.setData('lr_number', e.target.value)} />
                        </Field>
                        <div className="flex items-center gap-3 pt-6">
                            <Switch id="lr_shared_with_customer" checked={form.data.lr_shared_with_customer} onCheckedChange={(v: boolean) => form.setData('lr_shared_with_customer', v)} />
                            <Label htmlFor="lr_shared_with_customer" className="font-normal cursor-pointer">LR shared with customer</Label>
                        </div>
                    </Grid>
                </Section>

                <Separator />

                {/* Delivery */}
                <Section title="Delivery">
                    <Grid cols={3}>
                        <Field label="Delivered date" id="delivered_date" error={form.errors.delivered_date}>
                            <DatePicker id="delivered_date" value={form.data.delivered_date} onChange={setDate('delivered_date')} />
                        </Field>
                        <Field label="Triplicate received date" id="triplicate_received_date" error={form.errors.triplicate_received_date}>
                            <DatePicker id="triplicate_received_date" value={form.data.triplicate_received_date} onChange={setDate('triplicate_received_date')} />
                        </Field>
                    </Grid>
                    <Grid cols={2}>
                        <div className="flex items-center gap-3">
                            <Switch id="pod_received" checked={form.data.pod_received} onCheckedChange={(v: boolean) => form.setData('pod_received', v)} />
                            <Label htmlFor="pod_received" className="font-normal cursor-pointer">Proof of delivery received</Label>
                        </div>
                        <div className="flex items-center gap-3">
                            <Switch id="triplicate_received" checked={form.data.triplicate_received} onCheckedChange={(v: boolean) => form.setData('triplicate_received', v)} />
                            <Label htmlFor="triplicate_received" className="font-normal cursor-pointer">Triplicate received</Label>
                        </div>
                    </Grid>
                </Section>

                <Separator />

                {/* Invoice & payment */}
                <Section title="Invoice & payment">
                    <Grid cols={3}>
                        <Field label="Invoice number" id="invoice_number" error={form.errors.invoice_number}>
                            <Input id="invoice_number" className="font-mono text-xs" value={form.data.invoice_number} onChange={(e) => form.setData('invoice_number', e.target.value)} />
                        </Field>
                        <Field label="Invoice date" id="invoice_date" error={form.errors.invoice_date}>
                            <DatePicker id="invoice_date" value={form.data.invoice_date} onChange={setDate('invoice_date')} />
                        </Field>
                        <Field label="Payment terms" id="payment_terms" error={form.errors.payment_terms}>
                            <Select value={form.data.payment_terms || undefined} onValueChange={(v: string) => form.setData('payment_terms', v)}>
                                <SelectTrigger id="payment_terms"><SelectValue placeholder="—" /></SelectTrigger>
                                <SelectContent>
                                    {PAYMENT_TERMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </Field>
                    </Grid>
                    <Grid cols={4}>
                        <Field label="Payment due" id="payment_due_date" error={form.errors.payment_due_date}>
                            <DatePicker id="payment_due_date" value={form.data.payment_due_date} onChange={setDate('payment_due_date')} />
                        </Field>
                        <Field label="Payment status *" id="payment_status" error={form.errors.payment_status}>
                            <Select value={form.data.payment_status} onValueChange={(v: string) => form.setData('payment_status', v)}>
                                <SelectTrigger id="payment_status"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {PAYMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label="Amount received (₹)" id="amount_received" error={form.errors.amount_received}>
                            <Input id="amount_received" type="number" step="0.01" value={form.data.amount_received} onChange={(e) => form.setData('amount_received', e.target.value)} />
                        </Field>
                        <Field label="Payment mode" id="payment_mode" error={form.errors.payment_mode}>
                            <Select value={form.data.payment_mode || undefined} onValueChange={(v: string) => form.setData('payment_mode', v)}>
                                <SelectTrigger id="payment_mode"><SelectValue placeholder="—" /></SelectTrigger>
                                <SelectContent>
                                    {PAYMENT_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </Field>
                    </Grid>
                    <Grid cols={1}>
                        <Field label="Payment received date" id="payment_received_date" error={form.errors.payment_received_date}>
                            <DatePicker id="payment_received_date" value={form.data.payment_received_date} onChange={setDate('payment_received_date')} />
                        </Field>
                    </Grid>
                </Section>

                <Separator />

                <Field label="Internal notes" id="internal_notes" error={form.errors.internal_notes}>
                    <Textarea id="internal_notes" rows={3} value={form.data.internal_notes} onChange={(e) => form.setData('internal_notes', e.target.value)} />
                </Field>

                <Separator />

                <div className="flex gap-3">
                    <Button type="submit" disabled={form.processing}>
                        {form.processing ? 'Saving…' : isEdit ? 'Update order' : 'Create order'}
                    </Button>
                    <Button type="button" variant="outline" asChild>
                        <Link href={route('orders.index')}>Cancel</Link>
                    </Button>
                </div>
            </form>
        </>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-4">
            <Label className="text-base font-semibold">{title}</Label>
            {children}
        </div>
    );
}

function Grid({ cols, children }: { cols: 1 | 2 | 3 | 4; children: React.ReactNode }) {
    const classes: Record<number, string> = {
        1: 'grid gap-4',
        2: 'grid sm:grid-cols-2 gap-4',
        3: 'grid sm:grid-cols-3 gap-4',
        4: 'grid sm:grid-cols-2 lg:grid-cols-4 gap-4',
    };
    return <div className={classes[cols]}>{children}</div>;
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
