import { Head, Link } from '@inertiajs/react';
import { useEffect, useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
    ShoppingCart, Truck, FileWarning, IndianRupee, ChevronRight, TrendingUp,
    Activity, AlertCircle, Inbox, RotateCcw, Wallet,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDateIN } from '@/lib/format';
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

type RecentOrder = {
    id: number;
    order_code: string;
    order_date: string;
    order_value: string | null;
    status: string;
    payment_status: string;
    customer?: { id: number; name: string; company?: string | null };
};

type RecentActivity = {
    id: number;
    action: string;
    entity_type: string;
    entity_id: number;
    created_at: string;
    user?: { id: number; name: string } | null;
};

type Props = {
    kpis: KPIs;
    status_distribution: Record<string, number>;
    revenue_by_day: { day: string; value: string }[];
    action_queue: ActionQueue;
    recent_activity: RecentActivity[];
    recent_orders: RecentOrder[];
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

function actionLabel(a: string): string {
    return a.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

function entityLabel(e: string): string {
    const map: Record<string, string> = {
        order: 'Order',
        order_item: 'Order item',
        customer: 'Customer',
        product: 'Product',
        transporter: 'Transporter',
        user: 'User',
        shipment: 'Shipment',
        return_case: 'Return',
        payment: 'Payment',
    };
    return map[e] ?? e;
}

export default function Dashboard({ kpis, status_distribution, action_queue, recent_orders, recent_activity }: Props) {
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

                {/* ─── Recent orders + activity ────────────────────── */}
                <div className="grid gap-5 lg:grid-cols-2">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                            <CardTitle className="text-sm font-medium">Recent orders</CardTitle>
                            <Button asChild variant="ghost" size="sm" className="-mr-2 h-7">
                                <Link href="/orders">View all <ChevronRight className="ml-0.5 h-3 w-3" /></Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            {recent_orders.length === 0 ? (
                                <p className="px-4 py-6 text-center text-sm text-muted-foreground">No orders yet.</p>
                            ) : (
                                <table className="w-full text-xs">
                                    <tbody>
                                        {recent_orders.map((o) => (
                                            <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30">
                                                <td className="px-3 py-2">
                                                    <Link href={`/orders/${o.id}`} className="block">
                                                        <p className="font-mono font-medium hover:underline">{o.order_code}</p>
                                                        <p className="text-[10px] text-muted-foreground">{formatDateIN(o.order_date)}</p>
                                                    </Link>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <p className="truncate">{o.customer?.name ?? '—'}</p>
                                                </td>
                                                <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(o.order_value)}</td>
                                                <td className="px-3 py-2">
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px]"
                                                        style={{ color: STATUS_COLORS[o.status], borderColor: STATUS_COLORS[o.status] }}
                                                    >
                                                        {STATUS_LABEL[o.status] ?? o.status}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                            <CardTitle className="text-sm font-medium">Recent activity</CardTitle>
                            <Button asChild variant="ghost" size="sm" className="-mr-2 h-7">
                                <Link href="/audit-logs">View all <ChevronRight className="ml-0.5 h-3 w-3" /></Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                            {recent_activity.length === 0 ? (
                                <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>
                            ) : (
                                <ol className="space-y-2.5 text-xs">
                                    {recent_activity.map((a) => (
                                        <li key={a.id} className="flex gap-2.5">
                                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                                            <div className="min-w-0 flex-1">
                                                <p>
                                                    <span className="font-medium">{actionLabel(a.action)}</span>
                                                    {' '}
                                                    <span className="text-muted-foreground">on {entityLabel(a.entity_type)} #{a.entity_id}</span>
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {new Date(a.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    {a.user?.name && ` · ${a.user.name}`}
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
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
