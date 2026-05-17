import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft, Pencil, Truck, Phone, Mail, MapPin, Gauge, Package, IndianRupee,
    Clock, CheckCircle2, AlertCircle, Star, Calendar, ListChecks,
} from '@/lib/icons';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatDateIN } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Transporter } from '@/types/entities';

type Stats = {
    total_shipments: number;
    delivered: number;
    in_transit: number;
    cancelled: number;
    avg_transit_days: number | null;
    on_time_pct: number | null;
    triplicate_return_pct: number | null;
    last_used_date: string | null;
    value_handled: number;
};

type ShipmentRow = {
    id: number;
    shipment_code: string;
    status: string;
    lr_number: string | null;
    dispatch_date: string | null;
    delivered_date: string | null;
    expected_delivery: string | null;
    order: { id: number; order_code: string; order_value: string | null; status: string; customer?: { id: number; name: string; company?: string | null } | null } | null;
};

const SHIPMENT_STATUS_COLORS: Record<string, string> = {
    planning: 'bg-muted text-muted-foreground border-border',
    packing: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
    packed: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
    dispatched: 'bg-orange-500/10 text-orange-600 border-orange-200',
    in_transit: 'bg-orange-500/10 text-orange-600 border-orange-200',
    delivered: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
    closed: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
    cancelled: 'bg-red-500/10 text-red-600 border-red-200',
};

export default function TransporterShow({
    transporter,
    shipments,
    stats,
}: {
    transporter: Transporter;
    shipments: ShipmentRow[];
    stats: Stats;
}) {
    const reliabilityStars = transporter.triplicate_reliability ?? null;

    return (
        <AdminLayout breadcrumbs={[{ label: 'Transporters', href: '/transporters' }, { label: transporter.name }]}>
            <Head title={transporter.name} />

            {/* Header */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2 shrink-0">
                        <Link href={route('transporters.index')}><ArrowLeft className="h-4 w-4" /> Back</Link>
                    </Button>
                    <Separator orientation="vertical" className="h-5" />
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground min-w-0">
                        {transporter.transporter_code && <span className="font-mono">{transporter.transporter_code}</span>}
                        {transporter.city && <span>· {transporter.city}</span>}
                        {transporter.gstin && <span className="font-mono">· GSTIN {transporter.gstin}</span>}
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={transporter.status === 'active' ? 'default' : 'secondary'}>
                        {transporter.status}
                    </Badge>
                    <Button asChild>
                        <Link href={route('transporters.edit', { transporter: transporter.id })}>
                            <Pencil className="h-4 w-4 mr-1" /> Edit
                        </Link>
                    </Button>
                </div>
            </div>

            {/* ─── KPI strip ─────────────────────────────────────── */}
            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <KPI
                    icon={Truck}
                    label="Total shipments"
                    value={stats.total_shipments}
                    sub={`${stats.delivered} delivered · ${stats.in_transit} in transit`}
                />
                <KPI
                    icon={Clock}
                    label="Avg transit time"
                    value={stats.avg_transit_days !== null ? `${stats.avg_transit_days}d` : '—'}
                    sub={transporter.avg_transit_days ? `Quoted: ${transporter.avg_transit_days}d` : 'No quote on file'}
                    tone={stats.avg_transit_days !== null && transporter.avg_transit_days && stats.avg_transit_days > transporter.avg_transit_days ? 'red' : 'default'}
                />
                <KPI
                    icon={CheckCircle2}
                    label="On-time delivery"
                    value={stats.on_time_pct !== null ? `${stats.on_time_pct}%` : '—'}
                    sub="Delivered before expected"
                    tone={stats.on_time_pct !== null ? (stats.on_time_pct >= 85 ? 'emerald' : stats.on_time_pct >= 60 ? 'default' : 'red') : 'default'}
                />
                <KPI
                    icon={IndianRupee}
                    label="Value handled"
                    value={formatCurrency(stats.value_handled)}
                    sub="Lifetime, all orders shipped"
                />
            </div>

            {/* ─── Two-column: details + shipments ─────────────── */}
            <div className="grid gap-5 lg:grid-cols-3">
                {/* LEFT — details */}
                <div className="space-y-5 lg:col-span-1">
                    <SectionCard icon={Phone} title="Contact">
                        <dl className="space-y-1.5 text-sm">
                            {transporter.contact_person && <KV label="Contact" value={transporter.contact_person} />}
                            {transporter.primary_phone && (
                                <KV
                                    label="Phone"
                                    value={<a href={`tel:${transporter.primary_phone}`} className="font-mono hover:underline">{transporter.primary_phone}</a>}
                                />
                            )}
                            {transporter.secondary_phone && (
                                <KV
                                    label="Alt phone"
                                    value={<a href={`tel:${transporter.secondary_phone}`} className="font-mono hover:underline">{transporter.secondary_phone}</a>}
                                />
                            )}
                            {transporter.whatsapp && (
                                <KV
                                    label="WhatsApp"
                                    value={<a href={`https://wa.me/${transporter.whatsapp.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer" className="font-mono hover:underline">{transporter.whatsapp}</a>}
                                />
                            )}
                            {transporter.email && (
                                <KV
                                    label="Email"
                                    value={<a href={`mailto:${transporter.email}`} className="hover:underline">{transporter.email}</a>}
                                />
                            )}
                            {transporter.office_address && (
                                <KV
                                    label="Office"
                                    value={
                                        <span className="flex items-start gap-1.5">
                                            <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                                            <span>{transporter.office_address}</span>
                                        </span>
                                    }
                                />
                            )}
                        </dl>
                    </SectionCard>

                    <SectionCard icon={Gauge} title="Logistics performance">
                        <dl className="space-y-1.5 text-sm">
                            <KV
                                label="Reliability"
                                value={
                                    reliabilityStars !== null
                                        ? <div className="flex items-center gap-0.5">
                                            {Array.from({ length: 5 }, (_, i) => (
                                                <Star
                                                    key={i}
                                                    className={cn(
                                                        'h-3.5 w-3.5',
                                                        i < Number(reliabilityStars)
                                                            ? 'fill-yellow-400 text-yellow-400'
                                                            : 'text-muted-foreground/30',
                                                    )}
                                                />
                                            ))}
                                            <span className="ml-1 text-xs text-muted-foreground">({reliabilityStars}/5)</span>
                                        </div>
                                        : <span className="text-muted-foreground">Not rated</span>
                                }
                            />
                            {transporter.cost_per_kg && (
                                <KV label="Cost / kg" value={`₹${Number(transporter.cost_per_kg).toFixed(2)}`} />
                            )}
                            {stats.triplicate_return_pct !== null && (
                                <KV
                                    label="Triplicate returns"
                                    value={
                                        <span className={cn(
                                            'font-semibold',
                                            stats.triplicate_return_pct >= 85 ? 'text-emerald-600'
                                            : stats.triplicate_return_pct >= 60 ? 'text-orange-600'
                                            : 'text-red-600',
                                        )}>
                                            {stats.triplicate_return_pct}%
                                        </span>
                                    }
                                />
                            )}
                            {transporter.areas_served && transporter.areas_served.length > 0 && (
                                <KV
                                    label="Areas served"
                                    value={
                                        <div className="flex flex-wrap gap-1">
                                            {transporter.areas_served.map((a) => (
                                                <Badge key={a} variant="secondary" className="text-[10px]">{a}</Badge>
                                            ))}
                                        </div>
                                    }
                                />
                            )}
                            {transporter.vehicle_types && transporter.vehicle_types.length > 0 && (
                                <KV
                                    label="Vehicle types"
                                    value={
                                        <div className="flex flex-wrap gap-1">
                                            {transporter.vehicle_types.map((v) => (
                                                <Badge key={v} variant="outline" className="text-[10px]">{v}</Badge>
                                            ))}
                                        </div>
                                    }
                                />
                            )}
                            {transporter.payment_terms && <KV label="Payment terms" value={transporter.payment_terms} />}
                        </dl>
                    </SectionCard>

                    {stats.last_used_date && (
                        <SectionCard icon={Calendar} title="Activity">
                            <dl className="space-y-1.5 text-sm">
                                <KV label="Last used" value={formatDateIN(stats.last_used_date)} />
                                {transporter.onboarded_at && <KV label="Onboarded" value={formatDateIN(transporter.onboarded_at)} />}
                                {stats.cancelled > 0 && (
                                    <KV
                                        label="Cancelled"
                                        value={
                                            <span className="text-red-600">
                                                {stats.cancelled} shipment{stats.cancelled === 1 ? '' : 's'}
                                            </span>
                                        }
                                    />
                                )}
                            </dl>
                        </SectionCard>
                    )}

                    {transporter.notes && (
                        <SectionCard icon={ListChecks} title="Internal notes">
                            <p className="whitespace-pre-line text-sm text-muted-foreground">{transporter.notes}</p>
                        </SectionCard>
                    )}
                </div>

                {/* RIGHT — recent shipments table */}
                <div className="space-y-5 lg:col-span-2">
                    <SectionCard
                        icon={Package}
                        title="Recent shipments"
                        action={shipments.length > 0 ? <span className="text-xs text-muted-foreground">Last {shipments.length}</span> : null}
                    >
                        {shipments.length === 0 ? (
                            <p className="rounded-md border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                                No shipments routed through this transporter yet.
                            </p>
                        ) : (
                            <div className="overflow-x-auto rounded-md border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-semibold">Shipment</th>
                                            <th className="px-3 py-2 text-left font-semibold">Order / Customer</th>
                                            <th className="px-3 py-2 text-left font-semibold">LR</th>
                                            <th className="px-3 py-2 text-left font-semibold">Status</th>
                                            <th className="px-3 py-2 text-left font-semibold">Dispatched</th>
                                            <th className="px-3 py-2 text-left font-semibold">Delivered</th>
                                            <th className="px-3 py-2 text-right font-semibold">Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {shipments.map((s) => {
                                            const lateBy = s.expected_delivery && s.delivered_date
                                                ? Math.max(0, Math.ceil((new Date(s.delivered_date).getTime() - new Date(s.expected_delivery).getTime()) / 86400000))
                                                : 0;
                                            return (
                                                <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                                                    <td className="px-3 py-2">
                                                        <span className="font-mono text-xs font-medium">{s.shipment_code}</span>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {s.order ? (
                                                            <Link href={`/orders/${s.order.id}`} className="flex flex-col hover:underline">
                                                                <span className="font-mono text-xs font-medium">{s.order.order_code}</span>
                                                                <span className="text-[10px] text-muted-foreground">{s.order.customer?.name ?? '—'}</span>
                                                            </Link>
                                                        ) : <span className="text-muted-foreground">—</span>}
                                                    </td>
                                                    <td className="px-3 py-2 font-mono text-xs">{s.lr_number ?? '—'}</td>
                                                    <td className="px-3 py-2">
                                                        <Badge className={cn('border text-[10px] uppercase', SHIPMENT_STATUS_COLORS[s.status] ?? 'bg-muted')}>
                                                            {s.status.replace(/_/g, ' ')}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-3 py-2 text-xs tabular-nums">{s.dispatch_date ? formatDateIN(s.dispatch_date) : '—'}</td>
                                                    <td className="px-3 py-2 text-xs tabular-nums">
                                                        {s.delivered_date ? (
                                                            <>
                                                                {formatDateIN(s.delivered_date)}
                                                                {lateBy > 0 && <span className="ml-1 text-[10px] text-orange-600">+{lateBy}d</span>}
                                                            </>
                                                        ) : '—'}
                                                    </td>
                                                    <td className="px-3 py-2 text-right text-xs tabular-nums">{formatCurrency(s.order?.order_value)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </SectionCard>

                    {stats.total_shipments === 0 && (
                        <Card className="border-dashed">
                            <CardContent className="p-6 text-center text-sm text-muted-foreground">
                                <AlertCircle className="mx-auto mb-2 h-5 w-5" />
                                Performance metrics will populate once shipments are routed through this transporter.
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function SectionCard({ icon: Icon, title, action, children }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="h-4 w-4 text-muted-foreground" /> {title}
                </CardTitle>
                {action}
            </CardHeader>
            <CardContent className="p-4 pt-2">{children}</CardContent>
        </Card>
    );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="grid grid-cols-[110px_1fr] items-start gap-3 border-b border-border/40 py-1.5 last:border-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm">{value}</dd>
        </div>
    );
}

function KPI({
    icon: Icon, label, value, sub, tone = 'default',
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string; value: React.ReactNode; sub?: string;
    tone?: 'default' | 'emerald' | 'red';
}) {
    const toneClass: Record<string, string> = {
        default: 'text-foreground',
        emerald: 'text-emerald-600',
        red: 'text-red-600',
    };
    return (
        <Card>
            <CardContent className="p-3">
                <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0 space-y-0.5">
                        <p className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
                        <p className={cn('block text-xl font-bold tabular-nums tracking-tight', toneClass[tone])}>{value}</p>
                        {sub && <p className="truncate text-[10px] text-muted-foreground">{sub}</p>}
                    </div>
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                        <Icon className="size-3.5 text-muted-foreground" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
