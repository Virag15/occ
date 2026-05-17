import { Head, Link } from '@inertiajs/react';
import { useEffect, useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
    ShoppingCart, Truck, FileWarning, IndianRupee, ChevronRight, TrendingUp,
    Activity, AlertCircle, Inbox, RotateCcw, Wallet, Crown, Hourglass,
} from '@/lib/icons';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

type KPIs = {
    orders_today: number;
    dispatched_today: number;
    pending_dispatch: number;
    triplicates_awaited: number;
    overdue_payments_value: number;
    revenue_this_month: number;
    open_orders: number;
};

type ActionQueue = {
    awaiting_lr: number;
    pod_pending: number;
    triplicate_pending: number;
    payment_overdue: number;
    returns_open: number;
};

type TopCustomer = {
    id: number;
    name: string;
    company: string | null;
    orders: number;
    revenue: string | number;
};

type AgingBucket = {
    label: string;
    count: number;
    value: number;
};

type Props = {
    kpis: KPIs;
    status_distribution: Record<string, number>;
    revenue_by_day: { day: string; value: string }[];
    action_queue: ActionQueue;
    top_customers: TopCustomer[];
    payment_aging: AgingBucket[];
};

// shadcn brand-aligned colours — distinct per status
const STATUS_COLORS: Record<string, string> = {
    new_order: '#9ca3af',
    confirmed: '#2563eb',
    stock_check: '#eab308',
    packing: '#eab308',
    packed: '#f59e0b',
    ready_for_dispatch: '#f97316',
    dispatched: '#f97316',
    delivered: '#10b981',
    on_hold: '#6b7280',
};

const STATUS_LABEL: Record<string, string> = {
    new_order: 'New',
    confirmed: 'Confirmed',
    stock_check: 'Stock check',
    packing: 'Packing',
    packed: 'Packed',
    ready_for_dispatch: 'Ready to dispatch',
    dispatched: 'Dispatched',
    delivered: 'Delivered',
    on_hold: 'On hold',
};

// Tone per aging bucket — escalates from amber to deep red as days-overdue grows.
const AGING_TONES = [
    'border-amber-200 bg-amber-50/60 text-amber-700',
    'border-orange-200 bg-orange-50/60 text-orange-700',
    'border-red-200 bg-red-50/60 text-red-700',
    'border-red-300 bg-red-100/60 text-red-800',
];

export default function Dashboard({ kpis, status_distribution, action_queue, top_customers, payment_aging }: Props) {
    useEffect(() => { document.title = 'Dashboard - OCC'; }, []);

    const donutData = useMemo(() =>
        Object.entries(status_distribution).map(([status, count]) => ({
            status,
            label: STATUS_LABEL[status] ?? status,
            count: Number(count),
            color: STATUS_COLORS[status] ?? '#9ca3af',
        })),
    [status_distribution]);

    const totalInFlight = donutData.reduce((s, d) => s + d.count, 0);

    return (
        <AdminLayout breadcrumbs={[{ label: 'Dashboard' }]}>
            <Head title="Dashboard" />

            <div className="space-y-5">
                {/* ─── KPI cards strip ─────────────────────────────── */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <KPICard
                        icon={ShoppingCart}
                        label="Orders today"
                        value={kpis.orders_today}
                        sub={`${kpis.dispatched_today} dispatched today`}
                    />
                    <KPICard
                        icon={Truck}
                        label="Pending dispatch"
                        value={kpis.pending_dispatch}
                        sub="Packed / ready to ship"
                        tone={kpis.pending_dispatch > 0 ? 'orange' : 'default'}
                    />
                    <KPICard
                        icon={FileWarning}
                        label="Triplicates awaited"
                        value={kpis.triplicates_awaited}
                        sub="Delivered, no triplicate"
                        tone={kpis.triplicates_awaited > 5 ? 'orange' : 'default'}
                    />
                    <KPICard
                        icon={IndianRupee}
                        label="Overdue payments"
                        value={formatCurrency(kpis.overdue_payments_value)}
                        sub="Across all customers"
                        tone={kpis.overdue_payments_value > 0 ? 'red' : 'default'}
                    />
                </div>

                {/* Secondary KPIs */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                    <KPICard
                        icon={TrendingUp}
                        label="Revenue this month"
                        value={formatCurrency(kpis.revenue_this_month)}
                        sub="Booked, ex. cancellations"
                        tone="emerald"
                    />
                    <KPICard
                        icon={Inbox}
                        label="Open orders"
                        value={kpis.open_orders}
                        sub="Not closed / cancelled"
                    />
                    <KPICard
                        icon={Wallet}
                        label="Cash collected today"
                        value={formatCurrency(0)}
                        sub="Lands with daily report"
                    />
                </div>

                {/* ─── Donut + Action queue ────────────────────────── */}
                <div className="grid gap-5 lg:grid-cols-3">
                    {/* Status donut */}
                    <Card className="lg:col-span-2">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                <Activity className="h-4 w-4 text-muted-foreground" /> Orders in flight
                                <span className="ml-2 text-xs font-normal text-muted-foreground">{totalInFlight} total</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                            {donutData.length === 0 ? (
                                <p className="py-10 text-center text-sm text-muted-foreground">No orders in flight right now.</p>
                            ) : (
                                <div className="grid items-center gap-4 sm:grid-cols-[200px_1fr]">
                                    <div className="h-[180px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={donutData}
                                                    dataKey="count"
                                                    nameKey="label"
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={75}
                                                >
                                                    {donutData.map((d) => <Cell key={d.status} fill={d.color} />)}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ fontSize: '11px', padding: '6px 8px', border: '1px solid var(--border)', borderRadius: '6px' }}
                                                    formatter={(value) => [`${value} orders`, '']}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="space-y-1.5">
                                        {donutData.map((d) => (
                                            <Link
                                                key={d.status}
                                                href={`/orders?status=${d.status}`}
                                                className="flex items-center justify-between gap-2 rounded px-2 py-1 text-xs hover:bg-muted/50"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                                                    <span>{d.label}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <span className="font-medium tabular-nums text-foreground">{d.count}</span>
                                                    <ChevronRight className="h-3 w-3" />
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Action queue */}
                    <Card>
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                <AlertCircle className="h-4 w-4 text-muted-foreground" /> Action queue
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1 p-4 pt-2">
                            <ActionRow
                                label="Awaiting LR / dispatch"
                                count={action_queue.awaiting_lr}
                                icon={Truck}
                                href="/orders?status=packed"
                            />
                            <ActionRow
                                label="POD pending"
                                count={action_queue.pod_pending}
                                icon={FileWarning}
                                href="/orders?status=dispatched"
                            />
                            <ActionRow
                                label="Triplicate pending"
                                count={action_queue.triplicate_pending}
                                icon={FileWarning}
                                href="/orders?status=delivered"
                            />
                            <ActionRow
                                label="Payments overdue"
                                count={action_queue.payment_overdue}
                                icon={IndianRupee}
                                href="/orders?payment_status=overdue"
                                tone={action_queue.payment_overdue > 0 ? 'red' : 'default'}
                            />
                            <ActionRow
                                label="Open return cases"
                                count={action_queue.returns_open}
                                icon={RotateCcw}
                                href="/returns?status=under_inspection"
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* ─── Reports — top customers + payment aging ─────── */}
                <div className="grid gap-5 lg:grid-cols-2">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                            <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
                                <Crown className="h-4 w-4 text-amber-500" /> Top customers this month
                            </CardTitle>
                            <Button asChild variant="ghost" size="sm" className="-mr-2 h-7">
                                <Link href="/customers">All customers <ChevronRight className="ml-0.5 h-3 w-3" /></Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            {top_customers.length === 0 ? (
                                <p className="px-4 py-6 text-center text-sm text-muted-foreground">No orders booked this month yet.</p>
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
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                            <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
                                <Hourglass className="h-4 w-4 text-red-500" /> Payment aging
                            </CardTitle>
                            <Button asChild variant="ghost" size="sm" className="-mr-2 h-7">
                                <Link href="/tasks">Tasks <ChevronRight className="ml-0.5 h-3 w-3" /></Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                            {payment_aging.every((b) => b.count === 0) ? (
                                <p className="py-6 text-center text-sm text-muted-foreground">No overdue invoices — everyone's current.</p>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    {payment_aging.map((b, i) => (
                                        <div
                                            key={b.label}
                                            className={cn(
                                                'rounded-md border px-3 py-2',
                                                b.count === 0 ? 'border-border bg-muted/20 text-muted-foreground' : AGING_TONES[i],
                                            )}
                                        >
                                            <p className="text-[10px] font-medium uppercase tracking-wider">{b.label}</p>
                                            <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
                                                {formatCurrency(b.value)}
                                            </p>
                                            <p className="text-[10px] tabular-nums opacity-80">
                                                {b.count} {b.count === 1 ? 'invoice' : 'invoices'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
}

// ─── KPI card ────────────────────────────────────────────────────────
function KPICard({
    icon: Icon, label, value, sub, tone = 'default',
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string; value: React.ReactNode; sub?: string;
    tone?: 'default' | 'orange' | 'red' | 'emerald';
}) {
    const toneClass: Record<string, string> = {
        default: 'text-foreground',
        orange: 'text-orange-600',
        red: 'text-red-600',
        emerald: 'text-emerald-600',
    };
    return (
        <Card>
            <CardContent className="p-3">
                <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0 space-y-0.5">
                        <p className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
                        <p className={cn('block text-xl font-bold tabular-nums tracking-tight', toneClass[tone])}>{value}</p>
                        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
                    </div>
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                        <Icon className="size-3.5 text-muted-foreground" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Action queue row ────────────────────────────────────────────────
function ActionRow({
    label, count, icon: Icon, href, tone = 'default',
}: {
    label: string; count: number;
    icon: React.ComponentType<{ className?: string }>;
    href: string;
    tone?: 'default' | 'red';
}) {
    const muted = count === 0;
    return (
        <Link
            href={href}
            className={cn(
                'flex items-center justify-between gap-2 rounded px-2 py-1.5 text-xs transition-colors',
                muted ? 'text-muted-foreground hover:bg-muted/30' : 'hover:bg-muted/50',
            )}
        >
            <span className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {label}
            </span>
            <span className="flex items-center gap-1">
                <span className={cn(
                    'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums',
                    muted ? 'bg-muted text-muted-foreground' : tone === 'red' ? 'bg-red-500/10 text-red-700' : 'bg-primary/10 text-primary',
                )}>
                    {count}
                </span>
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
            </span>
        </Link>
    );
}
