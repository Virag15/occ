import { Head, Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip } from 'recharts';
import {
    Crown, Hourglass, Tags, Truck, ShoppingCart, IndianRupee, Wallet, FileWarning, AlertOctagon,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { format } from 'date-fns';

type BrandSlice = { brand: string; value: number };
type SlaRow = {
    transporter_id: number;
    transporter_name: string;
    shipments: number;
    avg_dispatch_days: number | null;
    avg_transit_days: number | null;
};
type TopCustomer = {
    id: number;
    name: string;
    company: string | null;
    orders: number;
    revenue: string | number;
};
type AgingOrder = {
    id: number;
    order_code: string;
    customer_name: string | null;
    customer_company: string | null;
    outstanding: number;
    days_overdue: number;
};
type AgingBucket = {
    label: string;
    count: number;
    value: number;
    orders: AgingOrder[];
};
type Kpis = {
    orders_count: number;
    orders_value: number;
    dispatched_count: number;
    dispatched_value: number;
    payments_received: number;
};
type Range = { from: string; to: string; is_single_day: boolean };
type ActionItems = {
    lr_pending: number;
    triplicate_pending: number;
    pod_pending: number;
    returns_open: number;
};

const BRAND_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

const AGING_TONES = [
    'border-amber-200 bg-amber-50/60 text-amber-700',
    'border-orange-200 bg-orange-50/60 text-orange-700',
    'border-red-200 bg-red-50/60 text-red-700',
    'border-red-300 bg-red-100/60 text-red-800',
];

function toDateStr(d: Date | undefined): string | null {
    if (!d) return null;
    return format(d, 'yyyy-MM-dd');
}

export default function ReportsIndex({
    range,
    kpis,
    brand_mix,
    dispatch_sla,
    top_customers,
    aging,
    action_items,
}: {
    range: Range;
    kpis: Kpis;
    brand_mix: BrandSlice[];
    dispatch_sla: SlaRow[];
    top_customers: TopCustomer[];
    aging: AgingBucket[];
    action_items: ActionItems;
}) {
    const totalBrandValue = useMemo(() => brand_mix.reduce((acc, b) => acc + b.value, 0), [brand_mix]);
    const [openBucket, setOpenBucket] = useState<string | null>(null);

    const navigateRange = (from: string | null, to: string | null) => {
        if (!from || !to) return;
        router.get(route('reports.index'), { from, to }, { preserveScroll: true, preserveState: false });
    };

    /** One-click preset ranges for common operational windows. */
    const presets: { label: string; build: () => { from: string; to: string } }[] = [
        {
            label: 'Today',
            build: () => {
                const t = format(new Date(), 'yyyy-MM-dd');
                return { from: t, to: t };
            },
        },
        {
            label: 'Yesterday',
            build: () => {
                const d = new Date();
                d.setDate(d.getDate() - 1);
                const y = format(d, 'yyyy-MM-dd');
                return { from: y, to: y };
            },
        },
        {
            label: 'Last 7 days',
            build: () => {
                const t = new Date();
                const s = new Date();
                s.setDate(s.getDate() - 6);
                return { from: format(s, 'yyyy-MM-dd'), to: format(t, 'yyyy-MM-dd') };
            },
        },
        {
            label: 'This month',
            build: () => {
                const t = new Date();
                const s = new Date(t.getFullYear(), t.getMonth(), 1);
                return { from: format(s, 'yyyy-MM-dd'), to: format(t, 'yyyy-MM-dd') };
            },
        },
        {
            label: 'Last month',
            build: () => {
                const now = new Date();
                const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const e = new Date(now.getFullYear(), now.getMonth(), 0);
                return { from: format(s, 'yyyy-MM-dd'), to: format(e, 'yyyy-MM-dd') };
            },
        },
    ];

    const isActivePreset = (p: { from: string; to: string }) =>
        p.from === range.from && p.to === range.to;

    return (
        <AdminLayout breadcrumbs={[{ label: 'Reports' }]}>
            <Head title="Reports" />

            {/* Date range bar — date pickers + preset buttons, no in-page title */}
            <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3">
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">From</label>
                    <DatePicker
                        value={range.from}
                        onChange={(d) => navigateRange(toDateStr(d), range.to)}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">To</label>
                    <DatePicker
                        value={range.to}
                        onChange={(d) => navigateRange(range.from, toDateStr(d))}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-1 sm:ml-auto">
                    {presets.map((p) => {
                        const built = p.build();
                        const active = isActivePreset(built);
                        return (
                            <Button
                                key={p.label}
                                variant={active ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => navigateRange(built.from, built.to)}
                            >
                                {p.label}
                            </Button>
                        );
                    })}
                </div>
            </div>

            {/* KPI strip — range-scoped */}
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <Kpi icon={ShoppingCart} label="Orders booked" value={String(kpis.orders_count)} sub={formatCurrency(kpis.orders_value)} />
                <Kpi icon={Truck} label="Dispatches" value={String(kpis.dispatched_count)} sub={formatCurrency(kpis.dispatched_value)} />
                <Kpi icon={Wallet} label="Payments in" value={formatCurrency(kpis.payments_received)} />
                <Kpi icon={IndianRupee} label="Booked − dispatched" value={formatCurrency(Math.max(0, kpis.orders_value - kpis.dispatched_value))} sub="Outstanding to ship" />
                <Kpi icon={IndianRupee} label="Payments vs booked" value={kpis.orders_value > 0 ? `${((kpis.payments_received / kpis.orders_value) * 100).toFixed(0)}%` : '—'} sub="Collection rate" />
            </div>

            {/* Action items strip — current state, range-independent */}
            {(action_items.lr_pending + action_items.triplicate_pending + action_items.pod_pending + action_items.returns_open) > 0 && (
                <div className="mb-5 grid grid-cols-2 gap-3 rounded-lg border bg-card p-3 sm:grid-cols-4">
                    <ActionTile icon={AlertOctagon} label="LR not shared" value={action_items.lr_pending} href="/tasks" tone="amber" />
                    <ActionTile icon={FileWarning} label="POD pending" value={action_items.pod_pending} href="/tasks" tone="blue" />
                    <ActionTile icon={FileWarning} label="Triplicate pending" value={action_items.triplicate_pending} href="/tasks" tone="emerald" />
                    <ActionTile icon={AlertOctagon} label="Open returns" value={action_items.returns_open} href="/returns" tone="red" />
                </div>
            )}

            {/* Top row — brand mix + dispatch SLA */}
            <div className="mb-5 grid gap-5 lg:grid-cols-2">
                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
                            <Tags className="h-4 w-4 text-indigo-500" />
                            Brand sales mix
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                        {brand_mix.length === 0 ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">No tagged brand sales in this range.</p>
                        ) : (
                            <div className="flex items-center gap-4">
                                <div className="h-[160px] w-[160px] shrink-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={brand_mix} dataKey="value" nameKey="brand" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                                                {brand_mix.map((_, i) => (
                                                    <Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <RTooltip
                                                contentStyle={{ fontSize: 11, padding: 6 }}
                                                formatter={(value) => [formatCurrency(value as number), 'Revenue']}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <ul className="min-w-0 flex-1 space-y-1.5">
                                    {brand_mix.map((b, i) => {
                                        const pct = totalBrandValue > 0 ? (b.value / totalBrandValue) * 100 : 0;
                                        return (
                                            <li key={b.brand} className="flex items-center gap-2 text-xs">
                                                <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: BRAND_COLORS[i % BRAND_COLORS.length] }} />
                                                <span className="flex-1 truncate font-medium">{b.brand}</span>
                                                <span className="font-mono tabular-nums">{formatCurrency(b.value)}</span>
                                                <span className="w-10 text-right tabular-nums text-muted-foreground">{pct.toFixed(0)}%</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
                            <Truck className="h-4 w-4 text-orange-500" />
                            Dispatch SLA per transporter
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {dispatch_sla.length === 0 ? (
                            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No dispatches in this range.</p>
                        ) : (
                            <table className="w-full text-xs">
                                <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-medium">Transporter</th>
                                        <th className="px-3 py-2 text-right font-medium">Shipments</th>
                                        <th className="px-3 py-2 text-right font-medium">Avg dispatch</th>
                                        <th className="px-3 py-2 text-right font-medium">Avg transit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dispatch_sla.map((r) => (
                                        <tr key={`${r.transporter_id}-${r.transporter_name}`} className="border-t border-border/40 hover:bg-muted/30">
                                            <td className="px-3 py-2">
                                                {r.transporter_id > 0 ? (
                                                    <Link href={route('transporters.show', { transporter: r.transporter_id })} className="font-medium hover:underline">
                                                        {r.transporter_name}
                                                    </Link>
                                                ) : (
                                                    <span className="italic text-muted-foreground">{r.transporter_name}</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-right tabular-nums">{r.shipments}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">
                                                {r.avg_dispatch_days !== null ? `${Number(r.avg_dispatch_days).toFixed(1)} d` : '—'}
                                            </td>
                                            <td className="px-3 py-2 text-right tabular-nums">
                                                {r.avg_transit_days !== null ? `${Number(r.avg_transit_days).toFixed(1)} d` : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Bottom row — top customers + aging */}
            <div className="grid gap-5 lg:grid-cols-2">
                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
                            <Crown className="h-4 w-4 text-amber-500" />
                            Top customers
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {top_customers.length === 0 ? (
                            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No bookings in this range.</p>
                        ) : (
                            <ol className="divide-y">
                                {top_customers.map((c, i) => (
                                    <li key={c.id}>
                                        <Link
                                            href={route('customers.show', { customer: c.id })}
                                            className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30"
                                        >
                                            <span className={cn(
                                                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums',
                                                i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground',
                                            )}>
                                                {i + 1}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-xs font-medium">{c.name}</p>
                                                {c.company && <p className="truncate text-[10px] text-muted-foreground">{c.company}</p>}
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className="font-mono text-xs tabular-nums">{formatCurrency(c.revenue)}</p>
                                                <p className="text-[10px] text-muted-foreground">{c.orders} order{c.orders === 1 ? '' : 's'}</p>
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
                            <Hourglass className="h-4 w-4 text-red-500" />
                            Payment aging
                        </CardTitle>
                        <p className="text-[10px] text-muted-foreground">As of today — independent of the range</p>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                        {aging.every((b) => b.count === 0) ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">No overdue invoices.</p>
                        ) : (
                            <div className="space-y-2">
                                {aging.map((b, i) => {
                                    const isOpen = openBucket === b.label;
                                    const empty = b.count === 0;
                                    return (
                                        <div
                                            key={b.label}
                                            className={cn(
                                                'overflow-hidden rounded-md border',
                                                empty ? 'border-border bg-muted/20 text-muted-foreground' : AGING_TONES[i],
                                            )}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => setOpenBucket(isOpen ? null : b.label)}
                                                disabled={empty}
                                                className={cn(
                                                    'flex w-full items-center justify-between gap-3 px-3 py-2',
                                                    !empty && 'cursor-pointer hover:brightness-95',
                                                )}
                                            >
                                                <span className="text-[10px] font-medium uppercase tracking-wider">{b.label}</span>
                                                <span className="flex items-center gap-3">
                                                    <span className="font-mono text-sm tabular-nums">{formatCurrency(b.value)}</span>
                                                    <span className="text-[10px] tabular-nums opacity-80">
                                                        {b.count} {b.count === 1 ? 'invoice' : 'invoices'}
                                                    </span>
                                                </span>
                                            </button>
                                            {isOpen && b.orders.length > 0 && (
                                                <ul className="divide-y bg-white/40">
                                                    {b.orders.map((o) => (
                                                        <li key={o.id}>
                                                            <Link
                                                                href={route('orders.show', { order: o.id })}
                                                                className="flex items-center justify-between px-3 py-1.5 text-[11px] hover:bg-white/60"
                                                            >
                                                                <span>
                                                                    <span className="font-mono font-medium">{o.order_code}</span>
                                                                    <span className="ml-2 text-foreground/80">{o.customer_name ?? '—'}</span>
                                                                </span>
                                                                <span className="flex items-center gap-2">
                                                                    <span className="font-mono tabular-nums">{formatCurrency(o.outstanding)}</span>
                                                                    <span className="text-[9px] tabular-nums opacity-70">{o.days_overdue}d</span>
                                                                </span>
                                                            </Link>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}

function Kpi({ icon: Icon, label, value, sub }: { icon: typeof Crown; label: string; value: string; sub?: string }) {
    return (
        <div className="rounded-md border bg-card p-3">
            <div className="flex items-start justify-between">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="mt-1 font-mono text-base font-semibold tabular-nums">{value}</p>
            {sub && <p className="mt-0.5 text-[10px] text-muted-foreground tabular-nums">{sub}</p>}
        </div>
    );
}

function ActionTile({ icon: Icon, label, value, href, tone }: { icon: typeof Crown; label: string; value: number; href: string; tone: 'amber' | 'blue' | 'emerald' | 'red' }) {
    const toneClass: Record<string, string> = {
        amber: 'text-amber-600',
        blue: 'text-blue-600',
        emerald: 'text-emerald-600',
        red: 'text-red-600',
    };
    return (
        <Link href={href} className="flex items-center gap-2 rounded border bg-muted/20 px-2.5 py-2 hover:bg-muted/40">
            <Icon className={cn('h-4 w-4 shrink-0', toneClass[tone])} />
            <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="font-mono text-sm font-semibold tabular-nums">{value}</p>
            </div>
        </Link>
    );
}
