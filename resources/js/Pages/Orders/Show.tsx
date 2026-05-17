import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import {
    ArrowLeft, Pencil, Truck, Package, FileCheck, IndianRupee, History, Phone, Mail, MapPin, Link2,
    Zap, MessageSquare, CheckCircle2, ChevronRight, Upload, Image as ImageIcon, Printer, ClipboardList,
    RotateCcw, AlertTriangle, ExternalLink, Plus, Download, Trash2,
} from '@/lib/icons';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AdminLayout from '@/components/admin/AdminLayout';
import { useConfirm } from '@/components/confirm-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { CreateShipmentDialog } from '@/components/CreateShipmentDialog';
import { ReportReturnDialog } from '@/components/ReportReturnDialog';
import { RecordPaymentDialog } from '@/components/RecordPaymentDialog';
import { formatCurrency, formatDateIN, nullable } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Customer, Order, OrderItem, Payment, ReturnCase, Shipment as ShipmentT, TransporterLite } from '@/types/entities';
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
    returns?: ReturnCase[];
    payments?: Payment[];
};

const LINEAR_STATUSES = [
    'new_order', 'confirmed', 'stock_check', 'packing', 'packed',
    'ready_for_dispatch', 'dispatched', 'delivered', 'closed',
] as const;

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

function orderStatusClasses(status: string): string {
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

function paymentStatusClasses(status: string): string {
    const map: Record<string, string> = {
        not_due: 'bg-muted text-muted-foreground border-border',
        pending: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
        partial: 'bg-orange-500/10 text-orange-600 border-orange-200',
        paid: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
        overdue: 'bg-red-500/10 text-red-600 border-red-200',
    };
    return cn('border', map[status] ?? 'bg-muted');
}

function shipmentStatusClasses(s: string): string {
    const map: Record<string, string> = {
        planning: 'bg-muted text-muted-foreground border-border',
        picking: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
        packing: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
        packed: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
        dispatched: 'bg-orange-500/10 text-orange-600 border-orange-200',
        in_transit: 'bg-orange-500/10 text-orange-600 border-orange-200',
        delivered: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
        closed: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
        cancelled: 'bg-red-500/10 text-red-600 border-red-200',
    };
    return cn('border', map[s] ?? 'bg-muted');
}

function returnStatusClasses(s: string): string {
    const map: Record<string, string> = {
        reported: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
        under_inspection: 'bg-blue-500/10 text-blue-600 border-blue-200',
        resolved: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
        rejected: 'bg-red-500/10 text-red-600 border-red-200',
    };
    return cn('border', map[s] ?? 'bg-muted');
}

// ─── Evidence upload dialog (LR / POD / Triplicate) ──────────────────
type EvidenceKind = 'pod' | 'triplicate' | 'lr';

const EVIDENCE_META: Record<EvidenceKind, { title: string; description: string; success: string; submitLabel: string }> = {
    lr: {
        title: 'Share LR with customer',
        description: 'Enter the LR number and upload the LR slip photo. This stamps the order with the LR, marks it as shared with the customer, and auto-advances the status to dispatched if it isn\'t already.',
        success: 'LR captured & shared.',
        submitLabel: 'Save LR & mark shared',
    },
    pod: {
        title: 'Mark POD received',
        description: 'Upload the proof-of-delivery photo. Marks POD received and auto-advances the order to delivered.',
        success: 'POD recorded.',
        submitLabel: 'Upload & mark delivered',
    },
    triplicate: {
        title: 'Mark triplicate received',
        description: 'Upload the triplicate copy. Marks triplicate received and stamps the date. If payment is already paid, the order auto-closes.',
        success: 'Triplicate recorded.',
        submitLabel: 'Upload & mark received',
    },
};

function EvidenceDialog({ kind, orderId, currentLr, onClose }: { kind: EvidenceKind | null; orderId: number; currentLr: string | null; onClose: () => void; }) {
    const open = !!kind;
    const meta = kind ? EVIDENCE_META[kind] : null;
    const [preview, setPreview] = useState<string | null>(null);
    const form = useForm<{ photo: File | null; notes: string; lr_number: string }>({
        photo: null,
        notes: '',
        lr_number: currentLr ?? '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (!kind || !form.data.photo) {
            toast.error('Please attach the evidence photo first.');
            return;
        }
        if (kind === 'lr' && !form.data.lr_number.trim()) {
            toast.error('Enter the LR number.');
            return;
        }
        form.post(route('orders.upload-evidence', { order: orderId, kind }), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                toast.success(meta!.success);
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
                    {kind === 'lr' && (
                        <div className="space-y-2">
                            <Label htmlFor="lr_number">LR number *</Label>
                            <Input
                                id="lr_number"
                                placeholder="e.g. LR-2026-00451"
                                value={form.data.lr_number}
                                onChange={(e) => form.setData('lr_number', e.target.value)}
                                className="font-mono"
                            />
                            {form.errors.lr_number && <p className="text-xs text-destructive">{form.errors.lr_number}</p>}
                        </div>
                    )}
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
                        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={form.processing || !form.data.photo || (kind === 'lr' && !form.data.lr_number.trim())}>
                            <Upload className="h-3.5 w-3.5 mr-1" /> {form.processing ? 'Uploading…' : (meta?.submitLabel ?? 'Upload')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ─── Small helpers ───────────────────────────────────────────────────
function KV({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
    return (
        <div className="grid grid-cols-[120px_1fr] items-start gap-3 py-1.5 border-b border-border/40 last:border-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className={cn('text-sm', mono && 'font-mono text-xs')}>
                {value !== null && value !== undefined && value !== '' ? value : <span className="text-muted-foreground/60">—</span>}
            </dd>
        </div>
    );
}

function SectionCard({ icon: Icon, title, action, children, dense = false }: {
    icon?: React.ComponentType<{ className?: string }>;
    title: string;
    action?: React.ReactNode;
    children: React.ReactNode;
    dense?: boolean;
}) {
    return (
        <Card>
            <CardHeader className={cn('flex flex-row items-center justify-between space-y-0 p-4 pb-2', dense && 'pb-1')}>
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                    {title}
                </CardTitle>
                {action}
            </CardHeader>
            <CardContent className={cn('p-4 pt-2', dense && 'pt-1')}>{children}</CardContent>
        </Card>
    );
}

// ─── Status timeline (horizontal pill chain) ─────────────────────────
function StatusTimeline({ status }: { status: string }) {
    const idx = LINEAR_STATUSES.indexOf(status as typeof LINEAR_STATUSES[number]);
    const isAside = status === 'on_hold' || status === 'cancelled';

    if (isAside) {
        return (
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
                <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                Order is <span className="font-semibold">{status.replace(/_/g, ' ')}</span> — outside the normal flow.
            </div>
        );
    }

    return (
        <div className="flex flex-wrap items-center gap-1 overflow-x-auto rounded-md border bg-muted/20 px-3 py-2">
            {LINEAR_STATUSES.map((s, i) => {
                const past = i < idx;
                const current = i === idx;
                return (
                    <div key={s} className="flex items-center">
                        <span className={cn(
                            'whitespace-nowrap rounded px-2 py-1 text-[10px] uppercase tracking-wide',
                            current && 'bg-primary text-primary-foreground font-semibold',
                            past && 'text-emerald-600',
                            !past && !current && 'text-muted-foreground/60',
                        )}>
                            {past && '✓ '}{s.replace(/_/g, ' ')}
                        </span>
                        {i < LINEAR_STATUSES.length - 1 && (
                            <ChevronRight className={cn('h-3 w-3', past ? 'text-emerald-600' : 'text-muted-foreground/40')} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─── Line items with fulfillment matrix ──────────────────────────────
function LineItemsBlock({ items }: { items: OrderItem[] }) {
    if (!items || items.length === 0) {
        return (
            <div className="rounded-md border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                No line items on this order yet. Use <span className="font-medium text-foreground">Edit</span> to add products.
            </div>
        );
    }

    const totalOrdered = items.reduce((s, i) => s + Number(i.qty_ordered || 0), 0);
    const totalDelivered = items.reduce((s, i) => s + Number(i.qty_delivered || 0), 0);

    return (
        <div className="space-y-3">
            {/* Aggregate header */}
            <div className="flex items-baseline justify-between text-xs">
                <span className="text-muted-foreground">{items.length} line{items.length === 1 ? '' : 's'} · {totalOrdered} units ordered</span>
                <span className="text-muted-foreground">{totalDelivered}/{totalOrdered} delivered</span>
            </div>

            {/* Per-line cards */}
            <div className="space-y-3">
                {items.map((it) => {
                    const ordered = Number(it.qty_ordered || 0);
                    const packed = Number(it.qty_packed || 0);
                    const dispatched = Number(it.qty_dispatched || 0);
                    const delivered = Number(it.qty_delivered || 0);
                    const cancelled = Number(it.qty_cancelled || 0);
                    const returned = Number(it.qty_returned || 0);
                    const open = Math.max(0, ordered - packed - cancelled);
                    const fulfillPct = ordered > 0 ? Math.round((delivered / ordered) * 100) : 0;

                    return (
                        <div key={it.id ?? `${it.product_id}-${it.product_name}`} className="rounded-md border bg-card p-3">
                            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="font-medium leading-tight">{it.product_name}</p>
                                    {it.product?.sku && <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{it.product.sku}</p>}
                                </div>
                                <div className="text-right text-xs text-muted-foreground">
                                    <span className="font-mono">{ordered} {it.unit ?? ''}</span>
                                    {it.unit_price && <> × {formatCurrency(it.unit_price)}</>}
                                    {it.line_total && <span className="ml-2 font-semibold text-foreground">{formatCurrency(it.line_total)}</span>}
                                </div>
                            </div>

                            {/* Fulfillment matrix */}
                            <div className="grid grid-cols-3 gap-x-2 gap-y-1 rounded bg-muted/30 px-2 py-2 text-[11px] sm:grid-cols-6">
                                <Cell label="Ordered" value={ordered} />
                                <Cell label="Packed" value={packed} accent={packed > 0} />
                                <Cell label="Shipped" value={dispatched} accent={dispatched > 0} />
                                <Cell label="Delivered" value={delivered} accent={delivered > 0} positive />
                                <Cell label="Returned" value={returned} accent={returned > 0} negative />
                                <Cell label="Open" value={open} highlight={open > 0} />
                            </div>

                            {/* Progress bar */}
                            <div className="mt-2 flex items-center gap-2">
                                <Progress value={fulfillPct} className="h-1.5 flex-1" />
                                <span className="w-12 text-right font-mono text-[10px] tabular-nums text-muted-foreground">{fulfillPct}%</span>
                            </div>

                            {open > 0 && delivered < ordered && (
                                <p className="mt-2 text-[10px] text-orange-600">
                                    {open} {it.unit ?? 'units'} still open — eligible for a new shipment.
                                </p>
                            )}
                            {cancelled > 0 && (
                                <p className="mt-1 text-[10px] text-red-600">{cancelled} cancelled.</p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function Cell({ label, value, accent, highlight, positive, negative }: { label: string; value: number; accent?: boolean; highlight?: boolean; positive?: boolean; negative?: boolean }) {
    return (
        <div className={cn(
            'flex flex-col rounded px-1.5 py-1',
            highlight && 'bg-orange-500/10 text-orange-700',
        )}>
            <span className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</span>
            <span className={cn(
                'font-mono font-semibold tabular-nums',
                !accent && !highlight && 'text-muted-foreground/70',
                positive && accent && 'text-emerald-600',
                negative && accent && 'text-red-600',
            )}>{value}</span>
        </div>
    );
}

// ─── Main component ──────────────────────────────────────────────────
export default function OrderShow({ order, auditLog, transporters }: { order: OrderFull; auditLog: AuditEntry[]; transporters: TransporterLite[] }) {
    const c = order.customer;
    const items = order.items ?? [];
    const shipments = order.shipments ?? [];
    const returns = order.returns ?? [];

    const [createShipmentOpen, setCreateShipmentOpen] = useState(false);
    const [reportReturnOpen, setReportReturnOpen] = useState(false);
    const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
    const [evidenceKind, setEvidenceKind] = useState<null | EvidenceKind>(null);

    const quickPatch = (url: string, body: Record<string, string | number> | undefined, successMsg: string) => {
        router.patch(url, body ?? {}, {
            preserveScroll: true,
            onSuccess: () => toast.success(successMsg),
            onError: (errors) => toast.error((Object.values(errors)[0] as string) ?? 'Could not update'),
        });
    };

    const nextStatus = NEXT_STATUS[order.status];
    const hasOpenItems = items.some((it) => Math.max(0, Number(it.qty_ordered || 0) - Number(it.qty_packed || 0) - Number(it.qty_cancelled || 0)) > 0);
    const hasDeliveredItems = items.some((it) => (Number(it.qty_delivered || 0) - Number(it.qty_returned || 0)) > 0);
    const hasAnyLr = !!order.lr_number || shipments.some((s) => !!s.lr_number);

    return (
        <AdminLayout breadcrumbs={[{ label: 'Orders', href: '/orders' }, { label: order.order_code }]}>
            <Head title={order.order_code} />

            {/* ── Top bar ──────────────────────────────────────── */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" asChild className="-ml-2 gap-1.5">
                        <Link href={route('orders.index')}>
                            <ArrowLeft className="h-4 w-4" /> Back
                        </Link>
                    </Button>
                    <Separator orientation="vertical" className="h-5" />
                    <p className="text-xs text-muted-foreground">
                        Created {formatDateIN(order.created_at)}{order.creator?.name ? ` by ${order.creator.name}` : ''}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge className={orderStatusClasses(order.status)}>{order.status.replace(/_/g, ' ')}</Badge>
                    <Badge className={paymentStatusClasses(order.payment_status)}>payment: {order.payment_status}</Badge>
                    {order.priority !== 'normal' && <Badge variant="outline">{order.priority}</Badge>}
                    {order.tracking_uuid && (
                        <Button
                            variant="outline"
                            type="button"
                            onClick={() => {
                                const url = `${window.location.origin}/track/${order.tracking_uuid}`;
                                navigator.clipboard.writeText(url).then(
                                    () => toast.success('Tracking link copied'),
                                    () => toast.error('Couldn\'t copy — copy from the address bar'),
                                );
                            }}
                            title="Copy public tracking link"
                        >
                            <Link2 className="h-4 w-4 mr-1" /> Tracking link
                        </Button>
                    )}
                    <Button variant="outline" asChild>
                        <a href={route('orders.quotation-pdf', { order: order.id })} target="_blank" rel="noreferrer">
                            <Download className="h-4 w-4 mr-1" /> Quotation
                        </a>
                    </Button>
                    <Button variant="outline" asChild>
                        <a href={route('orders.invoice-pdf', { order: order.id })} target="_blank" rel="noreferrer">
                            <Download className="h-4 w-4 mr-1" /> Invoice
                        </a>
                    </Button>
                    <Button asChild>
                        <Link href={route('orders.edit', { order: order.id })}>
                            <Pencil className="h-4 w-4 mr-1" /> Edit
                        </Link>
                    </Button>
                </div>
            </div>

            {/* ── Status timeline ─────────────────────────────────── */}
            <div className="mb-4">
                <StatusTimeline status={order.status} />
            </div>

            {/* ── Quick action ribbon ─────────────────────────────── */}
            <Card className="mb-4 border-primary/20 bg-primary/5">
                <CardContent className="p-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        <span className="mr-2 text-xs font-medium uppercase tracking-wide text-primary">Quick actions</span>
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
                            onClick={() => setEvidenceKind('lr')}
                            title="Capture LR number + photo, then mark as shared with the customer"
                        >
                            <MessageSquare className="h-3.5 w-3.5 mr-1" />
                            {order.lr_shared_with_customer ? '✓ LR shared' : 'LR'}
                        </Button>
                        <Button
                            size="sm"
                            variant={order.pod_received ? 'outline' : 'default'}
                            onClick={() => setEvidenceKind('pod')}
                            disabled={order.pod_received}
                        >
                            <FileCheck className="h-3.5 w-3.5 mr-1" />
                            {order.pod_received ? '✓ POD' : 'POD'}
                        </Button>
                        <Button
                            size="sm"
                            variant={order.triplicate_received ? 'outline' : 'default'}
                            onClick={() => setEvidenceKind('triplicate')}
                            disabled={order.triplicate_received}
                        >
                            <Truck className="h-3.5 w-3.5 mr-1" />
                            {order.triplicate_received ? '✓ Triplicate' : 'Triplicate'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* ── KPI strip ───────────────────────────────────────── */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KPI label="Value" value={formatCurrency(order.order_value)} />
                <KPI label="Order date" value={formatDateIN(order.order_date)} />
                <KPI label="Expected delivery" value={order.expected_delivery ? formatDateIN(order.expected_delivery) : '—'} />
                <KPI label="Amount received" value={formatCurrency(order.amount_received)} />
            </div>

            {/* ── 50/50 main grid ─────────────────────────────────── */}
            <div className="grid gap-5 md:grid-cols-2">

                {/* ─── LEFT: context ───────────────────────────── */}
                <div className="space-y-5">
                    <SectionCard icon={Package} title="Line items">
                        <LineItemsBlock items={items} />
                    </SectionCard>

                    <SectionCard icon={Package} title="Customer">
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
                                    <Link href={route('customers.show', { customer: c.id })}>
                                        View customer file <ExternalLink className="h-3 w-3 ml-1.5" />
                                    </Link>
                                </Button>
                            </>
                        ) : <p className="text-sm text-muted-foreground">Customer not linked.</p>}
                    </SectionCard>

                    <PaymentsCard
                        order={order}
                        payments={order.payments ?? []}
                        onRecordPayment={() => setRecordPaymentOpen(true)}
                    />

                    <SectionCard icon={IndianRupee} title="Invoice & terms" dense>
                        <dl>
                            <KV label="Invoice #" value={order.invoice_number} mono />
                            <KV label="Invoice date" value={order.invoice_date ? formatDateIN(order.invoice_date) : null} />
                            <KV label="Terms" value={order.payment_terms} />
                            <KV label="Due date" value={order.payment_due_date ? formatDateIN(order.payment_due_date) : null} />
                        </dl>
                    </SectionCard>

                    <SectionCard icon={Package} title="Order details" dense>
                        <dl>
                            <KV label="Code" value={order.order_code} mono />
                            <KV label="Source" value={order.order_source} />
                            <KV label="Customer ref #" value={order.customer_reference_number} mono />
                            <KV label="Customer PO #" value={order.customer_po_number} mono />
                            <KV label="Brands" value={
                                order.brands && order.brands.length > 0
                                    ? <div className="flex flex-wrap gap-1">{order.brands.map((b) => <Badge key={b} variant="secondary" className="text-[10px]">{b}</Badge>)}</div>
                                    : null
                            } />
                            <KV label="Priority" value={<Badge variant="outline">{order.priority}</Badge>} />
                            <KV label="Internal notes" value={order.internal_notes} />
                        </dl>
                    </SectionCard>
                </div>

                {/* ─── RIGHT: actions ──────────────────────────── */}
                <div className="space-y-5">

                    {/* Shipments */}
                    <SectionCard
                        icon={Truck}
                        title={`Shipments (${shipments.length})`}
                        action={items.length > 0 ? (
                            <Button size="sm" disabled={!hasOpenItems} onClick={() => setCreateShipmentOpen(true)}>
                                <Plus className="h-3.5 w-3.5 mr-1" /> Create shipment
                            </Button>
                        ) : null}
                    >
                        {items.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Add line items first to enable shipping.</p>
                        ) : shipments.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No shipments yet. Click <span className="font-medium text-foreground">Create shipment</span> to pack a partial fulfillment — pre-fills with the open quantity per line.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {shipments.map((s) => <ShipmentCard key={s.id} shipment={s} />)}
                                {!hasOpenItems && (
                                    <p className="rounded border border-dashed p-2 text-center text-[10px] text-muted-foreground">
                                        All line items are fully packed — no open quantity remaining.
                                    </p>
                                )}
                            </div>
                        )}
                    </SectionCard>

                    {/* Returns */}
                    <SectionCard
                        icon={RotateCcw}
                        title={`Returns (${returns.length})`}
                        action={hasDeliveredItems ? (
                            <Button size="sm" variant="outline" onClick={() => setReportReturnOpen(true)}>
                                <Plus className="h-3.5 w-3.5 mr-1" /> Report return
                            </Button>
                        ) : null}
                    >
                        {returns.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                {hasDeliveredItems
                                    ? 'No returns reported. Click Report return if any delivered units came back damaged or wrong.'
                                    : 'Returns can be reported once items are marked delivered.'}
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {returns.map((r) => (
                                    <Link
                                        key={r.id}
                                        href={route('returns.show', { return: r.id })}
                                        className="block rounded-md border p-3 transition hover:bg-muted/30"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="font-mono text-xs font-medium">{r.case_code}</span>
                                                <Badge className={returnStatusClasses(r.case_status)}>{r.case_status.replace(/_/g, ' ')}</Badge>
                                                {r.severity && r.severity !== 'medium' && <Badge variant="outline" className="text-[10px]">{r.severity}</Badge>}
                                            </div>
                                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                        </div>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {r.items?.length ?? 0} line{(r.items?.length ?? 0) === 1 ? '' : 's'} ·
                                            {' '}reported {formatDateIN(r.date_reported)}
                                            {r.creator?.name && <> by {r.creator.name}</>}
                                            {r.resolution_type && <> · resolved as <span className="font-medium text-foreground">{r.resolution_type.replace(/_/g, ' ')}</span></>}
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </SectionCard>

                    {/* Evidence */}
                    <SectionCard icon={FileCheck} title="Delivery evidence" dense>
                        <dl>
                            <KV label="Delivered" value={order.delivered_date ? formatDateIN(order.delivered_date) : null} />
                            <KV label="POD" value={order.pod_received ? '✓ Received' : <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setEvidenceKind('pod')}>Upload POD</Button>} />
                            <KV label="Triplicate" value={order.triplicate_received ? '✓ Received' : <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setEvidenceKind('triplicate')}>Upload triplicate</Button>} />
                        </dl>
                    </SectionCard>

                    {/* Activity */}
                    <SectionCard icon={History} title="Activity">
                        {auditLog.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
                        ) : (
                            <ol className="space-y-3 text-xs">
                                {auditLog.slice(0, 8).map((e) => (
                                    <li key={e.id} className="flex gap-3">
                                        <div className="flex shrink-0 flex-col items-center">
                                            <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                                            <span className="h-full w-px bg-border" />
                                        </div>
                                        <div className="flex-1 pb-2">
                                            <div className="flex flex-wrap items-baseline gap-2">
                                                <span className="font-medium capitalize">{e.action.replace(/_/g, ' ')}</span>
                                                <span className="text-muted-foreground tabular-nums">{formatDateIN(e.created_at)}</span>
                                                {e.user && <span className="text-muted-foreground">by {e.user.name}</span>}
                                            </div>
                                            {e.changes && Object.entries(e.changes).slice(0, 3).map(([key, change]) => (
                                                <p key={key} className="mt-0.5 text-muted-foreground">
                                                    {key}: <span className="line-through">{String(nullable(change.from as string))}</span>{' → '}<span className="text-foreground">{String(nullable(change.to as string))}</span>
                                                </p>
                                            ))}
                                        </div>
                                    </li>
                                ))}
                                {auditLog.length > 8 && (
                                    <li className="text-center text-[10px] text-muted-foreground">+ {auditLog.length - 8} earlier event{auditLog.length - 8 === 1 ? '' : 's'}</li>
                                )}
                            </ol>
                        )}
                    </SectionCard>
                </div>
            </div>

            {/* ── Dialogs ─────────────────────────────────────────── */}
            <EvidenceDialog kind={evidenceKind} orderId={order.id} currentLr={order.lr_number} onClose={() => setEvidenceKind(null)} />

            <CreateShipmentDialog
                open={createShipmentOpen}
                onClose={() => setCreateShipmentOpen(false)}
                orderId={order.id}
                orderItems={items}
                transporters={transporters}
            />

            {c && (
                <ReportReturnDialog
                    open={reportReturnOpen}
                    onClose={() => setReportReturnOpen(false)}
                    orderId={order.id}
                    customerId={c.id}
                    orderItems={items}
                />
            )}

            <RecordPaymentDialog
                open={recordPaymentOpen}
                onClose={() => setRecordPaymentOpen(false)}
                orderId={order.id}
                suggestedAmount={Math.max(0, Number(order.order_value ?? 0) - Number(order.amount_received ?? 0))}
            />
        </AdminLayout>
    );
}

// ─── Payments card ───────────────────────────────────────────────────
function PaymentsCard({ order, payments, onRecordPayment }: { order: OrderFull; payments: Payment[]; onRecordPayment: () => void }) {
    const confirm = useConfirm();
    const orderValue = Number(order.order_value ?? 0);
    const received = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const balance = Math.max(0, orderValue - received);
    const fullyPaid = orderValue > 0 && received >= orderValue - 0.01;

    return (
        <SectionCard
            icon={IndianRupee}
            title="Payments"
            action={
                <Button size="sm" variant={fullyPaid ? 'outline' : 'default'} onClick={onRecordPayment}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Record payment
                </Button>
            }
        >
            {/* Running totals */}
            <div className="mb-3 grid grid-cols-3 gap-2 rounded-md bg-muted/30 p-2 text-xs">
                <div>
                    <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Payable</p>
                    <p className="mt-0.5 font-mono font-semibold tabular-nums">{formatCurrency(orderValue)}</p>
                </div>
                <div>
                    <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Received</p>
                    <p className="mt-0.5 font-mono font-semibold tabular-nums text-emerald-600">{formatCurrency(received)}</p>
                </div>
                <div>
                    <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Balance due</p>
                    <p className={cn('mt-0.5 font-mono font-semibold tabular-nums', fullyPaid ? 'text-muted-foreground' : 'text-orange-600')}>
                        {formatCurrency(balance)}
                    </p>
                </div>
            </div>

            {/* Ledger */}
            {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    No payments recorded yet. Click <span className="font-medium text-foreground">Record payment</span> to start the ledger.
                </p>
            ) : (
                <div className="space-y-2">
                    {payments.map((p) => (
                        <div key={p.id} className="flex items-start justify-between gap-3 rounded-md border p-2.5">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-baseline gap-2">
                                    <p className="font-mono font-semibold tabular-nums">{formatCurrency(p.amount)}</p>
                                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">{p.mode}</Badge>
                                </div>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {formatDateIN(p.paid_on)}
                                    {p.reference && <> · ref <span className="font-mono">{p.reference}</span></>}
                                    {p.creator?.name && <> · by {p.creator.name}</>}
                                </p>
                                {p.notes && <p className="mt-1 text-[10px] text-muted-foreground">{p.notes}</p>}
                            </div>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={async () => {
                                    const ok = await confirm({
                                        title: 'Delete this payment?',
                                        description: `The ${formatCurrency(p.amount)} payment will be removed and the order balance will recompute.`,
                                        confirmText: 'Delete payment',
                                        destructive: true,
                                    });
                                    if (!ok) return;
                                    router.delete(route('payments.destroy', { payment: p.id }), {
                                        preserveScroll: true,
                                        onSuccess: () => toast.success('Payment removed'),
                                    });
                                }}
                                title="Delete this payment"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </SectionCard>
    );
}

function KPI({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <Card>
            <CardContent className="p-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
            </CardContent>
        </Card>
    );
}

// ─── Shipment card ───────────────────────────────────────────────────
function ShipmentCard({ shipment: s }: { shipment: Shipment }) {
    const confirm = useConfirm();
    const next = s.status === 'packed' ? 'dispatched' : s.status === 'dispatched' ? 'delivered' : null;
    const lineSummary = (s.items ?? [])
        .map((si) => `${Number(si.qty)}× ${si.order_item?.product_name ?? 'line'}`)
        .join(', ');

    const canCancel = !['delivered', 'closed', 'cancelled'].includes(s.status);

    return (
        <div className="rounded-md border p-3">
            {/* Header line */}
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs font-medium">{s.shipment_code}</span>
                    <Badge className={shipmentStatusClasses(s.status)}>{s.status.replace(/_/g, ' ')}</Badge>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        title="Print picking slip"
                        onClick={() => window.open(route('shipments.picking-slip', { shipment: s.id }), '_blank')}
                    >
                        <ClipboardList className="h-3.5 w-3.5 mr-1" /> Picking
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        title="Print packing slip"
                        onClick={() => window.open(route('shipments.packing-slip', { shipment: s.id }), '_blank')}
                    >
                        <Printer className="h-3.5 w-3.5 mr-1" /> Packing
                    </Button>
                </div>
            </div>

            {/* Lines */}
            <p className="text-xs text-muted-foreground">{lineSummary || 'no items'}</p>

            {/* Meta */}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                {s.transporter?.name && <span>🚚 {s.transporter.name}</span>}
                {s.lr_number && <span className="font-mono">LR {s.lr_number}</span>}
                {s.vehicle_number && <span className="font-mono">Veh {s.vehicle_number}</span>}
                {s.number_of_boxes && <span>{s.number_of_boxes} box{s.number_of_boxes === 1 ? '' : 'es'}</span>}
                {s.parcel_weight_kg && <span>{s.parcel_weight_kg} kg</span>}
                {s.dispatch_date && <span>Dispatched {formatDateIN(s.dispatch_date)}</span>}
                {s.delivered_date && <span>Delivered {formatDateIN(s.delivered_date)}</span>}
            </div>

            {/* Advance/cancel actions */}
            {(next || canCancel) && (
                <div className="mt-2 flex flex-wrap gap-2 border-t pt-2">
                    {next && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7"
                            onClick={() => router.patch(route('shipments.advance', { shipment: s.id, target: next }), {}, {
                                preserveScroll: true,
                                onSuccess: () => toast.success(`Shipment → ${next}`),
                                onError: (errs) => toast.error(Object.values(errs).join(', ')),
                            })}
                        >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark {next}
                        </Button>
                    )}
                    {canCancel && (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-destructive hover:text-red-700"
                            onClick={async () => {
                                const ok = await confirm({
                                    title: `Cancel shipment ${s.shipment_code}?`,
                                    description: 'Quantities will refund to the open balance.',
                                    confirmText: 'Cancel shipment',
                                    destructive: true,
                                });
                                if (!ok) return;
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
            )}
        </div>
    );
}
