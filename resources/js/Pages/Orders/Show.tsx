import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import {
    ArrowLeft, Pencil, Truck, Package, FileCheck, IndianRupee, History, Phone, Mail, Building2, MapPin,
    Zap, MessageSquare, CheckCircle2, ChevronRight, Upload, Image as ImageIcon, Printer, ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CreateShipmentDialog } from '@/components/CreateShipmentDialog';
import { formatCurrency, formatDateIN, nullable } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Customer, Order, Shipment as ShipmentT, TransporterLite } from '@/types/entities';
type Shipment = ShipmentT;

type AuditEntry = {
    id: number;
    action: string;
    changes: Record<string, { from: unknown; to: unknown }> | null;
    created_at: string;
    user?: { id: number; name: string } | null;
};

type OrderFull = Order & {
    customer?: Customer;
    transporter?: TransporterLite | null;
    creator?: { id: number; name: string } | null;
    shipments?: Shipment[];
};

function statusBadgeClasses(status: string): string {
    const map: Record<string, string> = {
        new_order: 'bg-muted text-foreground border-border',
        confirmed: 'bg-blue-500/10 text-blue-600 border-blue-200',
        stock_check: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
        packing: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
        packed: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
        ready_for_dispatch: 'bg-orange-500/10 text-orange-600 border-orange-200',
        dispatched: 'bg-orange-500/10 text-orange-600 border-orange-200',
        delivered: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
        closed: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
        on_hold: 'bg-muted text-muted-foreground border-border',
        cancelled: 'bg-red-500/10 text-red-600 border-red-200',
    };
    return cn('border', map[status] ?? 'bg-muted');
}

function paymentBadgeClasses(status: string): string {
    const map: Record<string, string> = {
        not_due: 'bg-muted text-muted-foreground border-border',
        pending: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
        partial: 'bg-orange-500/10 text-orange-600 border-orange-200',
        paid: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
        overdue: 'bg-red-500/10 text-red-600 border-red-200',
    };
    return cn('border', map[status] ?? 'bg-muted');
}

function KV({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
    return (
        <div className="grid grid-cols-[140px_1fr] items-start gap-3 py-1.5 border-b border-border/40 last:border-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className={cn('text-sm', mono && 'font-mono text-xs')}>{value || <span className="text-muted-foreground/60">—</span>}</dd>
        </div>
    );
}

const EVIDENCE_META: Record<string, { title: string; description: string; flag: string }> = {
    pod: {
        title: 'Mark POD received',
        description: 'Upload the proof-of-delivery photo. This marks pod_received as true and appends the image URL to the order.',
        flag: 'pod_received',
    },
    triplicate: {
        title: 'Mark triplicate received',
        description: 'Upload the triplicate copy. This marks triplicate_received as true and timestamps the date.',
        flag: 'triplicate_received',
    },
};

function EvidenceDialog({
    kind,
    orderId,
    onClose,
}: {
    kind: 'pod' | 'triplicate' | null;
    orderId: number;
    onClose: () => void;
}) {
    const open = !!kind;
    const meta = kind ? EVIDENCE_META[kind] : null;
    const [preview, setPreview] = useState<string | null>(null);
    const form = useForm<{ photo: File | null; notes: string }>({ photo: null, notes: '' });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (!kind || !form.data.photo) {
            toast.error('Please attach the evidence photo first.');
            return;
        }
        form.post(route('orders.upload-evidence', { order: orderId, kind }), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                toast.success(`${kind === 'pod' ? 'POD' : 'Triplicate'} recorded.`);
                form.reset();
                setPreview(null);
                onClose();
            },
            onError: (errors) => toast.error(Object.values(errors).join(', ')),
        });
    };

    const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] ?? null;
        form.setData('photo', f);
        if (f) {
            const reader = new FileReader();
            reader.onload = () => setPreview(reader.result as string);
            reader.readAsDataURL(f);
        } else {
            setPreview(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) { form.reset(); setPreview(null); onClose(); } }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{meta?.title ?? ''}</DialogTitle>
                    <DialogDescription>{meta?.description ?? ''}</DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="space-y-4" noValidate>
                    <div className="space-y-2">
                        <Label htmlFor="photo">Photo *</Label>
                        <Input id="photo" type="file" accept="image/*" capture="environment" onChange={onFile} />
                        {form.errors.photo && <p className="text-xs text-destructive">{form.errors.photo}</p>}
                    </div>

                    {preview && (
                        <div className="rounded-md border bg-muted/30 p-2">
                            <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                                <ImageIcon className="h-3 w-3" /> Preview
                            </div>
                            <img src={preview} alt="preview" className="max-h-64 mx-auto rounded" />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes (optional)</Label>
                        <Textarea id="notes" rows={2} value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} />
                    </div>

                    <DialogFooter>
                        <button type="button" className="inline-flex h-8 items-center px-3 text-xs hover:underline" onClick={onClose}>Cancel</button>
                        <button
                            type="submit"
                            disabled={form.processing || !form.data.photo}
                            className="inline-flex h-8 items-center rounded-md bg-primary text-primary-foreground px-3 text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
                        >
                            <Upload className="h-3.5 w-3.5 mr-1" /> {form.processing ? 'Uploading…' : 'Upload and mark received'}
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function SectionCard({ icon: Icon, title, action, children }: { icon: React.ComponentType<{ className?: string }>; title: string; action?: React.ReactNode; children: React.ReactNode }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {title}
                </CardTitle>
                {action}
            </CardHeader>
            <CardContent className="p-4 pt-2">{children}</CardContent>
        </Card>
    );
}

const NEXT_STATUS: Record<string, string> = {
    new_order: 'confirmed',
    confirmed: 'packing',
    stock_check: 'packing',
    packing: 'packed',
    packed: 'ready_for_dispatch',
    ready_for_dispatch: 'dispatched',
    dispatched: 'delivered',
    delivered: 'closed',
};

export default function OrderShow({ order, auditLog, transporters }: { order: OrderFull; auditLog: AuditEntry[]; transporters: TransporterLite[] }) {
    const c = order.customer;
    const [createShipmentOpen, setCreateShipmentOpen] = useState(false);

    const quickPatch = (url: string, body: Record<string, string | number> | undefined, successMsg: string) => {
        router.patch(url, body ?? {}, {
            preserveScroll: true,
            onSuccess: () => toast.success(successMsg),
            onError: (errors) => toast.error((Object.values(errors)[0] as string) ?? 'Could not update'),
        });
    };

    const [evidenceKind, setEvidenceKind] = useState<null | 'pod' | 'triplicate'>(null);

    const nextStatus = NEXT_STATUS[order.status];

    return (
        <AdminLayout breadcrumbs={[{ label: 'Orders', href: '/orders' }, { label: order.order_code }]}>
            <Head title={order.order_code} />

            {/* Toolbar */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2">
                        <Link href={route('orders.index')}>
                            <ArrowLeft className="h-4 w-4" /> Back
                        </Link>
                    </Button>
                    <Separator orientation="vertical" className="h-5" />
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-mono">{order.order_code}</h1>
                        <p className="text-xs text-muted-foreground">Created {formatDateIN(order.created_at)}{order.creator?.name ? ` by ${order.creator.name}` : ''}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge className={statusBadgeClasses(order.status)}>{order.status.replace(/_/g, ' ')}</Badge>
                    <Badge className={paymentBadgeClasses(order.payment_status)}>payment: {order.payment_status}</Badge>
                    {order.priority !== 'normal' && <Badge variant="outline">{order.priority}</Badge>}
                    <Button asChild>
                        <Link href={route('orders.edit', { order: order.id })}>
                            <Pencil className="h-4 w-4 mr-1" /> Edit
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Quick actions — one-click toggles, no form required */}
            <Card className="mb-6 border-primary/20 bg-primary/5">
                <CardHeader className="p-4 pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <Zap className="h-4 w-4 text-primary" /> Quick actions
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                    <div className="flex flex-wrap gap-2">
                        {nextStatus && (
                            <Button
                                size="sm"
                                onClick={() => quickPatch(route('orders.update-status', { order: order.id }), { status: nextStatus }, `Status → ${nextStatus.replace(/_/g, ' ')}`)}
                            >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                Mark {nextStatus.replace(/_/g, ' ')}
                                <ChevronRight className="h-3 w-3 ml-1 opacity-60" />
                            </Button>
                        )}
                        <Button
                            size="sm"
                            variant={order.lr_shared_with_customer ? 'outline' : 'default'}
                            onClick={() => quickPatch(route('orders.toggle-lr-shared', { order: order.id }), undefined, order.lr_shared_with_customer ? 'LR unmarked' : 'LR marked as shared')}
                            disabled={!order.lr_number}
                            title={!order.lr_number ? 'Add an LR number first' : undefined}
                        >
                            <MessageSquare className="h-3.5 w-3.5 mr-1" />
                            {order.lr_shared_with_customer ? '✓ LR shared' : 'Mark LR shared'}
                        </Button>
                        <Button
                            size="sm"
                            variant={order.pod_received ? 'outline' : 'default'}
                            onClick={() => setEvidenceKind('pod')}
                            disabled={order.pod_received}
                            title={order.pod_received ? 'Already received' : 'Upload POD image to mark received'}
                        >
                            <FileCheck className="h-3.5 w-3.5 mr-1" />
                            {order.pod_received ? '✓ POD received' : 'Mark POD received'}
                        </Button>
                        <Button
                            size="sm"
                            variant={order.triplicate_received ? 'outline' : 'default'}
                            onClick={() => setEvidenceKind('triplicate')}
                            disabled={order.triplicate_received}
                            title={order.triplicate_received ? 'Already received' : 'Upload triplicate copy to mark received'}
                        >
                            <Truck className="h-3.5 w-3.5 mr-1" />
                            {order.triplicate_received ? '✓ Triplicate received' : 'Mark triplicate received'}
                        </Button>
                    </div>
                    <p className="mt-3 text-[10px] text-muted-foreground">
                        Status changes and LR-shared toggle are one-click. POD and triplicate require uploading the photo evidence — every action writes an audit-log entry.
                    </p>
                </CardContent>
            </Card>

            <EvidenceDialog
                kind={evidenceKind}
                orderId={order.id}
                onClose={() => setEvidenceKind(null)}
            />

            <CreateShipmentDialog
                open={createShipmentOpen}
                onClose={() => setCreateShipmentOpen(false)}
                orderId={order.id}
                orderItems={order.items ?? []}
                transporters={transporters}
            />

            {/* Headline KPIs */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Card>
                    <CardContent className="p-3">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Value</p>
                        <p className="mt-1 text-xl font-bold tabular-nums">{formatCurrency(order.order_value)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-3">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Order date</p>
                        <p className="mt-1 text-xl font-bold tabular-nums">{formatDateIN(order.order_date)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-3">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Expected delivery</p>
                        <p className="mt-1 text-xl font-bold tabular-nums">{order.expected_delivery ? formatDateIN(order.expected_delivery) : '—'}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-3">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Amount received</p>
                        <p className="mt-1 text-xl font-bold tabular-nums">{formatCurrency(order.amount_received)}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Customer card spans 1 col, takes left */}
                <SectionCard icon={Building2} title="Customer">
                    {c ? (
                        <>
                            <p className="text-base font-semibold">{c.name}</p>
                            {c.company && <p className="text-sm text-muted-foreground">{c.company}</p>}
                            <div className="mt-3 space-y-1 text-xs">
                                {c.contact_person && <div className="flex items-center gap-1.5"><span className="text-muted-foreground">Contact:</span> {c.contact_person}</div>}
                                {c.phone && <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 hover:underline"><Phone className="h-3 w-3 text-muted-foreground" /><span className="font-mono">{c.phone}</span></a>}
                                {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 hover:underline"><Mail className="h-3 w-3 text-muted-foreground" />{c.email}</a>}
                                {c.gstin && <div className="flex items-center gap-1.5 text-muted-foreground"><span>GSTIN:</span> <span className="font-mono">{c.gstin}</span></div>}
                                {(c.billing_address || c.delivery_address || c.city) && (
                                    <div className="flex items-start gap-1.5 pt-1 text-muted-foreground">
                                        <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                                        <span>{c.delivery_address || c.billing_address || `${c.city ?? ''}${c.state ? ', ' + c.state : ''}`}</span>
                                    </div>
                                )}
                            </div>
                            <Separator className="my-3" />
                            <Button asChild variant="outline" size="sm" className="w-full">
                                <Link href={route('customers.edit', { customer: c.id })}>View customer file</Link>
                            </Button>
                        </>
                    ) : <p className="text-sm text-muted-foreground">Customer not linked.</p>}
                </SectionCard>

                {/* Order summary spans 2 cols */}
                <div className="lg:col-span-2 space-y-6">
                    <SectionCard icon={Package} title="Order details">
                        <dl>
                            <KV label="Code" value={order.order_code} mono />
                            <KV label="Source" value={order.order_source} />
                            <KV label="Brands" value={
                                order.brands && order.brands.length > 0
                                    ? <div className="flex flex-wrap gap-1">{order.brands.map((b) => <Badge key={b} variant="secondary" className="text-[10px]">{b}</Badge>)}</div>
                                    : null
                            } />
                            <KV label="Priority" value={<Badge variant="outline">{order.priority}</Badge>} />
                            <KV label="Internal notes" value={order.internal_notes} />
                        </dl>
                    </SectionCard>

                    <SectionCard icon={Package} title="Packing">
                        <dl>
                            <KV label="Slip generated" value={order.packing_slip_generated ? '✓ Yes' : '—'} />
                            <KV label="Packed by" value={order.packed_by} />
                            <KV label="Items packed" value={order.items_packed_count} />
                            <KV label="Boxes" value={order.number_of_boxes} />
                            <KV label="Parcel weight" value={order.parcel_weight_kg ? `${order.parcel_weight_kg} kg` : null} />
                        </dl>
                    </SectionCard>

                    <SectionCard icon={Truck} title="Dispatch">
                        <dl>
                            <KV label="Transporter" value={order.transporter?.name} />
                            <KV label="Pickup scheduled" value={order.pickup_scheduled_date ? formatDateIN(order.pickup_scheduled_date) : null} />
                            <KV label="Dispatched" value={order.dispatch_date ? formatDateIN(order.dispatch_date) : null} />
                            <KV label="LR number" value={order.lr_number} mono />
                            <KV label="LR shared with customer" value={order.lr_shared_with_customer ? '✓ Yes' : 'No'} />
                            <KV label="Vehicle" value={order.vehicle_number} mono />
                            <KV label="Driver" value={order.driver_name ? `${order.driver_name}${order.driver_contact ? ' · ' + order.driver_contact : ''}` : null} />
                            <KV label="Expected delivery" value={order.expected_delivery ? formatDateIN(order.expected_delivery) : null} />
                        </dl>
                    </SectionCard>

                    <SectionCard icon={FileCheck} title="Delivery">
                        <dl>
                            <KV label="Delivered" value={order.delivered_date ? formatDateIN(order.delivered_date) : null} />
                            <KV label="POD received" value={order.pod_received ? '✓ Yes' : 'No'} />
                            <KV label="Triplicate received" value={order.triplicate_received ? '✓ Yes' : 'No'} />
                            <KV label="Triplicate date" value={order.triplicate_received_date ? formatDateIN(order.triplicate_received_date) : null} />
                        </dl>
                    </SectionCard>

                    <SectionCard icon={IndianRupee} title="Invoice & payment">
                        <dl>
                            <KV label="Invoice #" value={order.invoice_number} mono />
                            <KV label="Invoice date" value={order.invoice_date ? formatDateIN(order.invoice_date) : null} />
                            <KV label="Payment terms" value={order.payment_terms} />
                            <KV label="Payment due" value={order.payment_due_date ? formatDateIN(order.payment_due_date) : null} />
                            <KV label="Payment status" value={<Badge className={paymentBadgeClasses(order.payment_status)}>{order.payment_status}</Badge>} />
                            <KV label="Amount received" value={formatCurrency(order.amount_received)} />
                            <KV label="Payment date" value={order.payment_received_date ? formatDateIN(order.payment_received_date) : null} />
                            <KV label="Payment mode" value={order.payment_mode} />
                        </dl>
                    </SectionCard>

                    <SectionCard
                        icon={Truck}
                        title={`Shipments (${order.shipments?.length ?? 0})`}
                        action={
                            (order.items?.length ?? 0) > 0 ? (
                                <Button size="sm" onClick={() => setCreateShipmentOpen(true)}>
                                    <Truck className="h-3.5 w-3.5 mr-1" /> Create shipment
                                </Button>
                            ) : null
                        }
                    >
                        {(!order.shipments || order.shipments.length === 0) ? (
                            <p className="text-sm text-muted-foreground">
                                {(order.items?.length ?? 0) > 0
                                    ? 'No shipments yet. Click "Create shipment" to pack a partial fulfillment.'
                                    : 'Add line items first.'}
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {order.shipments.map((s: Shipment) => {
                                    const lineSummary = (s.items ?? [])
                                        .map((si) => `${Number(si.qty)} × ${si.order_item?.product_name ?? 'line'}`)
                                        .join('; ');
                                    const statusCls: Record<string, string> = {
                                        planning: 'bg-muted text-muted-foreground border-border',
                                        packing: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
                                        packed: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
                                        dispatched: 'bg-orange-500/10 text-orange-600 border-orange-200',
                                        in_transit: 'bg-orange-500/10 text-orange-600 border-orange-200',
                                        delivered: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
                                        closed: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
                                        cancelled: 'bg-red-500/10 text-red-600 border-red-200',
                                    };
                                    const next = s.status === 'packed' ? 'dispatched' : s.status === 'dispatched' ? 'delivered' : null;
                                    return (
                                        <div key={s.id} className="rounded-md border p-3">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-xs font-medium">{s.shipment_code}</span>
                                                        <Badge className={cn('border', statusCls[s.status] ?? 'bg-muted')}>{s.status.replace(/_/g, ' ')}</Badge>
                                                    </div>
                                                    <p className="mt-1 text-xs text-muted-foreground">{lineSummary || 'no items'}</p>
                                                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                                                        {s.transporter?.name && <span>🚚 {s.transporter.name}</span>}
                                                        {s.lr_number && <span className="font-mono">LR: {s.lr_number}</span>}
                                                        {s.dispatch_date && <span>Dispatched {formatDateIN(s.dispatch_date)}</span>}
                                                        {s.delivered_date && <span>Delivered {formatDateIN(s.delivered_date)}</span>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        title="Picking slip"
                                                        onClick={() => window.open(route('shipments.picking-slip', { shipment: s.id }), '_blank')}
                                                    >
                                                        <ClipboardList className="h-3.5 w-3.5 mr-1" /> Picking
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        title="Packing slip"
                                                        onClick={() => window.open(route('shipments.packing-slip', { shipment: s.id }), '_blank')}
                                                    >
                                                        <Printer className="h-3.5 w-3.5 mr-1" /> Packing
                                                    </Button>
                                                    {next && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => router.patch(route('shipments.advance', { shipment: s.id, target: next }), {}, {
                                                                preserveScroll: true,
                                                                onSuccess: () => toast.success(`Shipment → ${next}`),
                                                                onError: (errs) => toast.error(Object.values(errs).join(', ')),
                                                            })}
                                                        >
                                                            Mark {next}
                                                        </Button>
                                                    )}
                                                    {!['delivered', 'closed', 'cancelled'].includes(s.status) && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-destructive hover:text-red-700"
                                                            onClick={() => {
                                                                if (!confirm(`Cancel shipment ${s.shipment_code}? Quantities will refund to the open balance.`)) return;
                                                                router.delete(route('shipments.destroy', { shipment: s.id }), {
                                                                    preserveScroll: true,
                                                                    onSuccess: () => toast.success('Shipment cancelled'),
                                                                });
                                                            }}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </SectionCard>

                    <SectionCard icon={History} title="Activity">
                        {auditLog.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
                        ) : (
                            <ol className="space-y-3 text-xs">
                                {auditLog.map((e) => (
                                    <li key={e.id} className="flex gap-3">
                                        <div className="flex shrink-0 flex-col items-center">
                                            <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                                            <span className="h-full w-px bg-border" />
                                        </div>
                                        <div className="flex-1 pb-3">
                                            <div className="flex flex-wrap items-baseline gap-2">
                                                <span className="font-medium capitalize">{e.action.replace(/_/g, ' ')}</span>
                                                <span className="text-muted-foreground tabular-nums">{formatDateIN(e.created_at)}</span>
                                                {e.user && <span className="text-muted-foreground">by {e.user.name}</span>}
                                            </div>
                                            {e.changes && Object.entries(e.changes).map(([key, change]) => (
                                                <p key={key} className="mt-0.5 text-muted-foreground">
                                                    {key}: <span className="line-through">{String(nullable(change.from as string))}</span>{' → '}<span className="text-foreground">{String(nullable(change.to as string))}</span>
                                                </p>
                                            ))}
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </SectionCard>
                </div>
            </div>
        </AdminLayout>
    );
}
