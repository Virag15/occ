import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import {
    ChevronLeft, ChevronRight, Printer, AlertTriangle, AlertCircle,
    ShoppingCart, Truck, IndianRupee, Calendar, MessageSquare, FileCheck, Clock, RotateCcw, BarChart3,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { formatCurrency, formatDateIN } from '@/lib/format';
import { cn } from '@/lib/utils';

type Snapshot = {
    new_orders_count: number; new_orders_value: number;
    dispatched_count: number; dispatched_value: number;
    payments_today: number;
    tomorrow_dispatches_count: number;
};
type Pending = {
    lr_sharing_pending_count: number;
    triplicate_pending_count: number;
    payments_overdue_count: number; payments_overdue_amount: number;
    open_returns_count: number; open_returns_value: number;
};
type Alert = { severity: 'red' | 'amber'; title: string; detail: string };

type Props = {
    report_date: string;
    snapshot: Snapshot;
    pending: Pending;
    alerts: Alert[];
    dispatched_today: { order_code: string; order_id: number; customer_ref: string | null; lr_number: string | null; value: number; lr_shared: boolean }[];
    lr_pending: { order_code: string; order_id: number; customer_ref: string | null; lr_number: string | null; dispatch_date: string | null }[];
    triplicate_pending: { order_code: string; order_id: number; customer_ref: string | null; lr_number: string | null; dispatch_date: string | null; days_ago: number }[];
    payments_overdue: { order_code: string; order_id: number; customer_ref: string | null; invoice_number: string | null; due_date: string | null; outstanding: number; days_overdue: number }[];
    tomorrow_dispatches: { order_code: string; order_id: number; customer_ref: string | null; brands: string; value: number; status: string; priority: string }[];
    open_returns: { case_code: string; case_id: number; case_title: string | null; case_type: string | null; brand: string | null; severity: string | null; case_status: string; value_at_risk: number }[];
    brand_revenue: { brand: string; revenue: number }[];
    company: { name: string; tagline: string | null; city: string | null };
};

export default function DailyReport(props: Props) {
    const [date, setDate] = useState(props.report_date);

    const navigateDate = (newDate: string) => {
        setDate(newDate);
        router.get(route('reports.daily'), { date: newDate }, { preserveScroll: false });
    };
    const shiftDate = (delta: number) => {
        const d = new Date(date);
        d.setDate(d.getDate() + delta);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        navigateDate(`${yyyy}-${mm}-${dd}`);
    };
    const setDateFromPicker = (d: Date | undefined) => {
        if (!d) return;
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        navigateDate(`${yyyy}-${mm}-${dd}`);
    };

    return (
        <AdminLayout breadcrumbs={[{ label: 'Reports' }, { label: 'Daily' }]}>
            <Head title={`Daily report — ${formatDateIN(date)}`} />

            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    @page { margin: 12mm; size: A4; }
                    body { background: white !important; }
                }
            `}</style>

            <div className="space-y-5">
                {/* ─── Header + date toolbar ────────────────────────── */}
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Daily operations report</h1>
                        <p className="text-xs text-muted-foreground">
                            {new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                            {' · ' + props.company.name}
                            {props.company.city ? `, ${props.company.city}` : ''}
                        </p>
                    </div>
                    <div className="no-print flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => shiftDate(-1)} title="Previous day">
                            <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <div className="w-44">
                            <DatePicker value={date} onChange={setDateFromPicker} />
                        </div>
                        <Button variant="outline" size="sm" onClick={() => shiftDate(1)} title="Next day">
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => navigateDate(new Date().toISOString().slice(0, 10))}>Today</Button>
                        <Button variant="outline" size="sm" onClick={() => window.print()}>
                            <Printer className="h-3.5 w-3.5 mr-1" /> Print
                        </Button>
                    </div>
                </div>

                {/* ─── Today's snapshot ─────────────────────────────── */}
                <Section icon={Calendar} title="Today's snapshot">
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <KPI icon={ShoppingCart} tone="emerald" label="New orders" value={props.snapshot.new_orders_count} sub={formatCurrency(props.snapshot.new_orders_value)} />
                        <KPI icon={Truck} tone="emerald" label="Dispatched" value={props.snapshot.dispatched_count} sub={formatCurrency(props.snapshot.dispatched_value)} />
                        <KPI icon={IndianRupee} tone="emerald" label="Payments received" value={formatCurrency(props.snapshot.payments_today)} sub="Total received today" />
                        <KPI icon={Calendar} label="Tomorrow's dispatches" value={props.snapshot.tomorrow_dispatches_count} sub="Planned pickups" />
                    </div>
                </Section>

                {/* ─── Pending actions ──────────────────────────────── */}
                <Section icon={Clock} title="Pending actions">
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <KPI icon={MessageSquare} tone={props.pending.lr_sharing_pending_count > 0 ? 'red' : 'default'}
                             label="LR sharing pending" value={props.pending.lr_sharing_pending_count}
                             sub="Customer not informed" />
                        <KPI icon={FileCheck} tone={props.pending.triplicate_pending_count > 5 ? 'red' : 'default'}
                             label="Triplicate awaited" value={props.pending.triplicate_pending_count}
                             sub="Compliance copies pending" />
                        <KPI icon={IndianRupee} tone={props.pending.payments_overdue_amount > 0 ? 'red' : 'default'}
                             label="Payments overdue" value={props.pending.payments_overdue_count}
                             sub={`${formatCurrency(props.pending.payments_overdue_amount)} stuck`} />
                        <KPI icon={RotateCcw} tone={props.pending.open_returns_count > 0 ? 'red' : 'default'}
                             label="Open cases" value={props.pending.open_returns_count}
                             sub={`${formatCurrency(props.pending.open_returns_value)} at risk`} />
                    </div>
                </Section>

                {/* ─── Top alerts ──────────────────────────────────── */}
                {props.alerts.length > 0 && (
                    <Section icon={AlertTriangle} title="Top alerts">
                        <div className="space-y-2">
                            {props.alerts.map((a, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        'rounded-md border-l-4 bg-card p-3 shadow-sm',
                                        a.severity === 'red' ? 'border-l-red-600' : 'border-l-yellow-500',
                                    )}
                                >
                                    <div className={cn('mb-1 flex items-center gap-1.5 text-sm font-semibold',
                                        a.severity === 'red' ? 'text-red-600' : 'text-yellow-700')}>
                                        {a.severity === 'red' ? <AlertCircle className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                                        {a.title}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{a.detail}</p>
                                </div>
                            ))}
                        </div>
                    </Section>
                )}

                {/* ─── Detail tables — 2-col grid on lg ─────────────── */}
                <div className="grid gap-5 lg:grid-cols-2">
                    {/* Dispatched today */}
                    {props.dispatched_today.length > 0 && (
                        <Section icon={Truck} title="Dispatched today" count={props.dispatched_today.length}>
                            <Table headers={['Order', 'Customer ref', 'LR', 'Value', 'Shared']}>
                                {props.dispatched_today.map((r, i) => (
                                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                                        <Cell><Link href={`/orders/${r.order_id}`} className="font-mono text-xs font-medium hover:underline">{r.order_code}</Link></Cell>
                                        <Cell><span className="text-xs">{r.customer_ref ?? '—'}</span></Cell>
                                        <Cell mono>{r.lr_number ?? '—'}</Cell>
                                        <Cell num>{formatCurrency(r.value)}</Cell>
                                        <Cell>{r.lr_shared
                                            ? <span className="text-[10px] font-semibold text-emerald-700">SHARED</span>
                                            : <span className="text-[10px] font-semibold text-red-600">PENDING</span>}</Cell>
                                    </tr>
                                ))}
                            </Table>
                        </Section>
                    )}

                    {/* LR sharing pending */}
                    {props.lr_pending.length > 0 && (
                        <Section
                            icon={MessageSquare}
                            title="LR sharing pending"
                            count={props.lr_pending.length}
                            description="Share LR photo + number on WhatsApp before close of day."
                        >
                            <Table headers={['Order', 'Customer ref', 'LR', 'Dispatched']}>
                                {props.lr_pending.map((r, i) => (
                                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                                        <Cell><Link href={`/orders/${r.order_id}`} className="font-mono text-xs font-medium hover:underline">{r.order_code}</Link></Cell>
                                        <Cell><span className="text-xs">{r.customer_ref ?? '—'}</span></Cell>
                                        <Cell mono>{r.lr_number ?? '—'}</Cell>
                                        <Cell>{r.dispatch_date ? formatDateIN(r.dispatch_date) : '—'}</Cell>
                                    </tr>
                                ))}
                            </Table>
                        </Section>
                    )}

                    {/* Triplicate awaited */}
                    {props.triplicate_pending.length > 0 && (
                        <Section
                            icon={FileCheck}
                            title="Triplicate copies awaited"
                            count={props.triplicate_pending.length}
                            description="Follow up with the transporter. Older than 15 days → escalate."
                        >
                            <Table headers={['Order', 'Customer ref', 'LR', 'Dispatched', 'Age']}>
                                {props.triplicate_pending.map((r, i) => (
                                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                                        <Cell><Link href={`/orders/${r.order_id}`} className="font-mono text-xs font-medium hover:underline">{r.order_code}</Link></Cell>
                                        <Cell><span className="text-xs">{r.customer_ref ?? '—'}</span></Cell>
                                        <Cell mono>{r.lr_number ?? '—'}</Cell>
                                        <Cell>{r.dispatch_date ? formatDateIN(r.dispatch_date) : '—'}</Cell>
                                        <Cell>
                                            <span className={cn('text-xs font-semibold tabular-nums', r.days_ago >= 15 ? 'text-red-600' : r.days_ago >= 7 ? 'text-orange-600' : 'text-muted-foreground')}>
                                                {r.days_ago}d
                                            </span>
                                        </Cell>
                                    </tr>
                                ))}
                            </Table>
                        </Section>
                    )}

                    {/* Payments overdue */}
                    {props.payments_overdue.length > 0 && (
                        <Section
                            icon={IndianRupee}
                            title="Payments overdue"
                            count={props.payments_overdue.length}
                            description="Collection call from accounts. Older than 7 days needs owner intervention."
                            tone="red"
                        >
                            <Table headers={['Order', 'Customer ref', 'Invoice', 'Due', 'Outstanding', 'Overdue']}>
                                {props.payments_overdue.map((r, i) => (
                                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                                        <Cell><Link href={`/orders/${r.order_id}`} className="font-mono text-xs font-medium hover:underline">{r.order_code}</Link></Cell>
                                        <Cell><span className="text-xs">{r.customer_ref ?? '—'}</span></Cell>
                                        <Cell mono>{r.invoice_number ?? '—'}</Cell>
                                        <Cell>{r.due_date ? formatDateIN(r.due_date) : '—'}</Cell>
                                        <Cell num><span className="font-semibold text-red-700">{formatCurrency(r.outstanding)}</span></Cell>
                                        <Cell>
                                            <span className={cn('text-xs font-semibold tabular-nums', r.days_overdue >= 14 ? 'text-red-600' : 'text-orange-600')}>
                                                {r.days_overdue}d
                                            </span>
                                        </Cell>
                                    </tr>
                                ))}
                            </Table>
                        </Section>
                    )}

                    {/* Tomorrow's dispatches */}
                    {props.tomorrow_dispatches.length > 0 && (
                        <Section icon={Calendar} title="Tomorrow's planned dispatches" count={props.tomorrow_dispatches.length}>
                            <Table headers={['Order', 'Customer ref', 'Brands', 'Value', 'Status']}>
                                {props.tomorrow_dispatches.map((r, i) => (
                                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                                        <Cell><Link href={`/orders/${r.order_id}`} className="font-mono text-xs font-medium hover:underline">{r.order_code}</Link></Cell>
                                        <Cell><span className="text-xs">{r.customer_ref ?? '—'}</span></Cell>
                                        <Cell><span className="text-xs">{r.brands || '—'}</span></Cell>
                                        <Cell num>{formatCurrency(r.value)}</Cell>
                                        <Cell>
                                            <span className={cn('inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white', statusBg(r.status))}>
                                                {r.status.replace(/_/g, ' ')}
                                            </span>
                                        </Cell>
                                    </tr>
                                ))}
                            </Table>
                        </Section>
                    )}

                    {/* Open return cases */}
                    {props.open_returns.length > 0 && (
                        <Section icon={RotateCcw} title="Open return & damage cases" count={props.open_returns.length}>
                            <Table headers={['Case', 'Type', 'Brand', 'Severity', 'Status', 'At risk']}>
                                {props.open_returns.map((r, i) => (
                                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                                        <Cell>
                                            <Link href={`/returns/${r.case_id}`} className="font-mono text-xs font-medium hover:underline">{r.case_code}</Link>
                                            {r.case_title && <span className="ml-1 text-[10px] text-muted-foreground">{r.case_title}</span>}
                                        </Cell>
                                        <Cell><span className="text-xs">{r.case_type ?? '—'}</span></Cell>
                                        <Cell><span className="text-xs">{r.brand ?? '—'}</span></Cell>
                                        <Cell>
                                            <span className={cn('text-xs font-semibold uppercase', severityColor(r.severity))}>
                                                {r.severity ?? '—'}
                                            </span>
                                        </Cell>
                                        <Cell><span className="text-xs">{r.case_status.replace(/_/g, ' ')}</span></Cell>
                                        <Cell num>{formatCurrency(r.value_at_risk)}</Cell>
                                    </tr>
                                ))}
                            </Table>
                        </Section>
                    )}
                </div>

                {/* ─── Brand-wise revenue ──────────────────────────── */}
                {props.brand_revenue.length > 0 && (
                    <Section icon={BarChart3} title="Brand-wise revenue snapshot" description="Allocated revenue across orders, weighted by brand share.">
                        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
                            {props.brand_revenue.map((b) => {
                                const max = Math.max(...props.brand_revenue.map((x) => x.revenue));
                                const pct = max > 0 ? Math.round((b.revenue / max) * 100) : 0;
                                return (
                                    <div key={b.brand} className="flex items-center justify-between gap-3 border-b border-border/60 py-2 last:border-0">
                                        <div className="flex min-w-0 flex-1 items-center gap-2">
                                            <span className="truncate text-sm font-medium">{b.brand}</span>
                                            <div className="h-1.5 max-w-[60px] flex-1 overflow-hidden rounded-full bg-muted">
                                                <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                        <span className="font-mono text-xs tabular-nums">{formatCurrency(b.revenue)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </Section>
                )}

                <p className="text-center text-[10px] text-muted-foreground">
                    Automated daily report · Live data in the <Link href="/" className="text-blue-600 hover:underline">Operations dashboard</Link>
                </p>
            </div>
        </AdminLayout>
    );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function Section({
    icon: Icon, title, description, count, tone, children,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description?: string;
    count?: number;
    tone?: 'red' | 'amber';
    children: React.ReactNode;
}) {
    return (
        <Card className={cn(tone === 'red' && 'border-red-200')}>
            <CardHeader className="p-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Icon className={cn('h-4 w-4', tone === 'red' ? 'text-red-600' : 'text-muted-foreground')} />
                    {title}
                    {count !== undefined && (
                        <span className="rounded bg-muted px-1.5 py-px text-[10px] font-semibold tabular-nums text-muted-foreground">{count}</span>
                    )}
                </CardTitle>
                {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
            </CardHeader>
            <CardContent className="p-4 pt-2">{children}</CardContent>
        </Card>
    );
}

function KPI({ icon: Icon, label, value, sub, tone = 'default' }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: React.ReactNode;
    sub?: string;
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

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
    return (
        <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {headers.map((h) => (
                            <th key={h} className="px-2.5 py-2 text-left font-semibold">{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>{children}</tbody>
            </table>
        </div>
    );
}

function Cell({ children, mono = false, num = false }: { children: React.ReactNode; mono?: boolean; num?: boolean }) {
    return (
        <td className={cn(
            'px-2.5 py-2 align-top',
            mono && 'font-mono text-xs',
            num && 'text-right tabular-nums',
        )}>{children}</td>
    );
}

function statusBg(status: string): string {
    const map: Record<string, string> = {
        confirmed: 'bg-purple-600',
        packing: 'bg-orange-600',
        packed: 'bg-orange-500',
        ready_for_dispatch: 'bg-orange-500',
        dispatched: 'bg-blue-600',
        delivered: 'bg-emerald-600',
    };
    return map[status] ?? 'bg-gray-500';
}

function severityColor(sev: string | null): string {
    switch (sev) {
        case 'critical': return 'text-red-600';
        case 'high': return 'text-orange-600';
        case 'medium': return 'text-yellow-700';
        default: return 'text-muted-foreground';
    }
}
