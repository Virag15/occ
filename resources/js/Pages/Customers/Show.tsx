import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Pencil, Phone, Mail, Building2, MapPin, ShoppingCart, IndianRupee, Clock, AlertTriangle, TrendingUp, Hourglass } from '@/lib/icons';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatDateIN } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Customer, Order } from '@/types/entities';

type MonthPoint = { month: string; label: string; orders: number; value: number };
type AgingBucket = { label: string; count: number; value: number };

const AGING_TONES = [
    'border-amber-200 bg-amber-50/60 text-amber-700',
    'border-orange-200 bg-orange-50/60 text-orange-700',
    'border-red-200 bg-red-50/60 text-red-700',
    'border-red-300 bg-red-100/60 text-red-800',
];

type Stats = {
    total_orders: number;
    lifetime_value: number;
    amount_received: number;
    outstanding: number;
    last_order_date: string | null;
    orders_by_status: Record<string, number>;
};

function statusBadgeClasses(s: string): string {
    const m: Record<string, string> = {
        new_order: 'bg-muted', confirmed: 'bg-blue-500/10 text-blue-600 border-blue-200',
        stock_check: 'bg-yellow-500/10 text-yellow-700 border-yellow-200', packing: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
        packed: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
        ready_for_dispatch: 'bg-orange-500/10 text-orange-600 border-orange-200', dispatched: 'bg-orange-500/10 text-orange-600 border-orange-200',
        delivered: 'bg-emerald-500/10 text-emerald-600 border-emerald-200', closed: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
        on_hold: 'bg-muted', cancelled: 'bg-red-500/10 text-red-600 border-red-200',
    };
    return cn('border', m[s] ?? 'bg-muted');
}

function paymentBadgeClasses(s: string): string {
    const m: Record<string, string> = {
        not_due: 'bg-muted text-muted-foreground border-border',
        pending: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
        partial: 'bg-orange-500/10 text-orange-600 border-orange-200',
        paid: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
        overdue: 'bg-red-500/10 text-red-600 border-red-200',
    };
    return cn('border', m[s] ?? 'bg-muted');
}

export default function CustomerShow({
    customer,
    orders,
    stats,
    brand_frequency,
    monthly_trend = [],
    payment_aging = [],
}: {
    customer: Customer;
    orders: Order[];
    stats: Stats;
    brand_frequency: Record<string, number>;
    monthly_trend?: MonthPoint[];
    payment_aging?: AgingBucket[];
}) {
    const topBrands = Object.entries(brand_frequency).slice(0, 5);
    const collected = stats.amount_received;
    const collectionRate = stats.lifetime_value > 0 ? (collected / stats.lifetime_value) * 100 : 0;
    const hasTrendData = monthly_trend.some((m) => m.value > 0 || m.orders > 0);
    const hasOverdue = payment_aging.some((b) => b.count > 0);

    return (
        <AdminLayout breadcrumbs={[{ label: 'Customers', href: '/customers' }, { label: customer.name }]}>
            <Head title={customer.name} />

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2">
                        <Link href={route('customers.index')}><ArrowLeft className="h-4 w-4" /> Back</Link>
                    </Button>
                    {customer.company && (
                        <>
                            <Separator orientation="vertical" className="h-5" />
                            <p className="text-xs text-muted-foreground">{customer.company}</p>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>{customer.status}</Badge>
                    {customer.customer_type && <Badge variant="secondary">{customer.customer_type}</Badge>}
                    <Button asChild>
                        <Link href={route('customers.edit', { customer: customer.id })}><Pencil className="h-4 w-4 mr-1" /> Edit</Link>
                    </Button>
                </div>
            </div>

            {/* KPI cards */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard icon={ShoppingCart} label="Total orders" value={String(stats.total_orders)} sub={stats.last_order_date ? `Last: ${formatDateIN(stats.last_order_date)}` : 'No orders yet'} />
                <KpiCard icon={IndianRupee} label="Lifetime value" value={formatCurrency(stats.lifetime_value)} sub={`${collectionRate.toFixed(0)}% collected`} />
                <KpiCard icon={IndianRupee} label="Collected" value={formatCurrency(collected)} sub="Across all paid + partial" />
                <KpiCard icon={AlertTriangle} label="Outstanding" value={formatCurrency(stats.outstanding)} sub="Pending + partial + overdue" tone={stats.outstanding > 0 ? 'red' : 'normal'} />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Customer file (left) */}
                <Card className="lg:col-span-1">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium"><Building2 className="h-4 w-4 text-muted-foreground" /> Customer file</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-3 text-xs">
                        <KV label="Code" value={customer.customer_code} mono />
                        <KV label="Type" value={customer.customer_type} />
                        <KV label="Status" value={customer.status} />
                        <KV label="Contact" value={customer.contact_person} />
                        <KV label="Phone" value={customer.phone ? <a href={`tel:${customer.phone}`} className="flex items-center gap-1 hover:underline"><Phone className="h-3 w-3 text-muted-foreground" />{customer.phone}</a> : null} />
                        <KV label="WhatsApp" value={customer.whatsapp} />
                        <KV label="Email" value={customer.email ? <a href={`mailto:${customer.email}`} className="flex items-center gap-1 hover:underline"><Mail className="h-3 w-3 text-muted-foreground" />{customer.email}</a> : null} />
                        <KV label="GSTIN" value={customer.gstin} mono />
                        <KV label="Payment terms" value={customer.payment_terms} />
                        <KV label="Credit limit" value={formatCurrency(customer.credit_limit)} />
                        <Separator />
                        <KV label="Billing" value={customer.billing_address} />
                        <KV label="Delivery" value={customer.delivery_address} />
                        <KV label="City / State" value={customer.city ? `${customer.city}${customer.state ? ', ' + customer.state : ''}` : null} icon={MapPin} />
                        {customer.notes && (<><Separator /><div><p className="text-muted-foreground mb-1">Notes</p><p>{customer.notes}</p></div></>)}
                    </CardContent>
                </Card>

                {/* Right column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Monthly order trend (last 12 months) */}
                    <Card>
                        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                Monthly value (last 12 months)
                            </CardTitle>
                            <span className="text-[10px] text-muted-foreground">
                                {hasTrendData ? `${monthly_trend.reduce((a, m) => a + m.orders, 0)} orders · ${formatCurrency(monthly_trend.reduce((a, m) => a + m.value, 0))}` : 'No order activity in this window'}
                            </span>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                            <div className="h-[160px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={monthly_trend} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="custTrend" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                                                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                        <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} width={32} />
                                        <RTooltip
                                            contentStyle={{ fontSize: 11, padding: 6 }}
                                            formatter={(value, name) => name === 'value' ? [formatCurrency(value as number), 'Value'] : [value, 'Orders']}
                                            labelClassName="text-xs"
                                        />
                                        <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} fill="url(#custTrend)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Payment aging — only render when there's actually overdue.
                        Outstanding == 0 customers stay clean (no clutter). */}
                    {hasOverdue && (
                        <Card>
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
                                    <Hourglass className="h-4 w-4 text-red-500" />
                                    Payment aging
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-2">
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    {payment_aging.map((b, i) => (
                                        <div
                                            key={b.label}
                                            className={cn(
                                                'rounded-md border px-3 py-2',
                                                b.count === 0 ? 'border-border bg-muted/20 text-muted-foreground' : AGING_TONES[i],
                                            )}
                                        >
                                            <p className="text-[10px] font-medium uppercase tracking-wider">{b.label}</p>
                                            <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">{formatCurrency(b.value)}</p>
                                            <p className="text-[10px] tabular-nums opacity-80">
                                                {b.count} {b.count === 1 ? 'invoice' : 'invoices'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Status mix + top brands */}
                    <div className="grid gap-6 sm:grid-cols-2">
                        <Card>
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-sm font-medium">Orders by status</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-2">
                                {Object.keys(stats.orders_by_status).length === 0
                                    ? <p className="text-sm text-muted-foreground">No orders yet.</p>
                                    : (
                                        <div className="space-y-1.5">
                                            {Object.entries(stats.orders_by_status).map(([s, c]) => (
                                                <div key={s} className="flex items-center justify-between">
                                                    <Badge className={statusBadgeClasses(s)}>{s.replace(/_/g, ' ')}</Badge>
                                                    <span className="tabular-nums text-sm">{c}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-sm font-medium">Top brands ordered</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-2">
                                {topBrands.length === 0
                                    ? <p className="text-sm text-muted-foreground">No brand data yet.</p>
                                    : (
                                        <div className="space-y-1.5">
                                            {topBrands.map(([b, c]) => (
                                                <div key={b} className="flex items-center justify-between text-xs">
                                                    <Badge variant="secondary">{b}</Badge>
                                                    <span className="tabular-nums text-muted-foreground">{c} {c === 1 ? 'order' : 'orders'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Recent orders */}
                    <Card>
                        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="flex items-center gap-2 text-sm font-medium"><Clock className="h-4 w-4 text-muted-foreground" /> Recent orders</CardTitle>
                            <span className="text-xs text-muted-foreground">{orders.length} of {stats.total_orders}</span>
                        </CardHeader>
                        <CardContent className="p-0">
                            {orders.length === 0
                                ? <p className="px-4 pb-4 text-sm text-muted-foreground">No orders yet for this customer.</p>
                                : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead className="bg-muted/40 text-muted-foreground">
                                                <tr>
                                                    <th className="px-3 py-2 text-left font-medium">Code</th>
                                                    <th className="px-3 py-2 text-left font-medium">Date</th>
                                                    <th className="px-3 py-2 text-right font-medium">Value</th>
                                                    <th className="px-3 py-2 text-left font-medium">Status</th>
                                                    <th className="px-3 py-2 text-left font-medium">Payment</th>
                                                    <th className="px-3 py-2 text-left font-medium">Transporter</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {orders.map((o) => (
                                                    <tr key={o.id} className="border-t border-border/40 hover:bg-accent/40">
                                                        <td className="px-3 py-2">
                                                            <Link href={route('orders.show', { order: o.id })} className="font-mono text-xs font-medium hover:underline">{o.order_code}</Link>
                                                        </td>
                                                        <td className="px-3 py-2 tabular-nums text-muted-foreground">{formatDateIN(o.order_date)}</td>
                                                        <td className="px-3 py-2 tabular-nums text-right">{formatCurrency(o.order_value)}</td>
                                                        <td className="px-3 py-2"><Badge className={statusBadgeClasses(o.status)}>{o.status.replace(/_/g, ' ')}</Badge></td>
                                                        <td className="px-3 py-2"><Badge className={paymentBadgeClasses(o.payment_status)}>{o.payment_status}</Badge></td>
                                                        <td className="px-3 py-2 text-muted-foreground">{o.transporter?.name ?? '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
}

function KpiCard({ icon: Icon, label, value, sub, tone = 'normal' }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub: string; tone?: 'normal' | 'red' }) {
    return (
        <Card>
            <CardContent className="p-3">
                <div className="flex items-start justify-between gap-1">
                    <div className="space-y-0.5 min-w-0">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground truncate">{label}</p>
                        <span className={cn('block text-xl font-bold tabular-nums tracking-tight', tone === 'red' && 'text-red-600')}>{value}</span>
                        <p className="text-[10px] text-muted-foreground">{sub}</p>
                    </div>
                    <div className="flex size-7 items-center justify-center rounded-md bg-muted shrink-0">
                        <Icon className="size-3.5 text-muted-foreground" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function KV({ label, value, mono = false, icon: Icon }: { label: string; value: React.ReactNode; mono?: boolean; icon?: React.ComponentType<{ className?: string }> }) {
    return (
        <div className="grid grid-cols-[120px_1fr] items-start gap-3 py-0.5">
            <dt className="flex items-center gap-1 text-muted-foreground">{Icon && <Icon className="h-3 w-3" />}{label}</dt>
            <dd className={cn(mono && 'font-mono')}>{value || <span className="text-muted-foreground/60">—</span>}</dd>
        </div>
    );
}
