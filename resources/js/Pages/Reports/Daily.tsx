import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import {
    ChevronLeft, ChevronRight, Printer, FileText, AlertTriangle, AlertCircle,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

            {/* Toolbar */}
            <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => shiftDate(-1)} title="Previous day">
                        <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <div className="w-44">
                        <DatePicker value={date} onChange={setDateFromPicker} />
                    </div>
                    <Button variant="outline" size="sm" onClick={() => shiftDate(1)} title="Next day">
                        <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => navigateDate(new Date().toISOString().slice(0, 10))}>
                        Today
                    </Button>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                    <Printer className="h-3.5 w-3.5 mr-1" /> Print / Save as PDF
                </Button>
            </div>

            {/* ─── Digest ─────────────────────────────────────────── */}
            <div className="mx-auto max-w-[880px] space-y-8 rounded-lg border bg-white p-6 print:max-w-none print:border-0 print:p-0">
                {/* Header */}
                <header className="border-b-[3px] border-foreground pb-4">
                    <h1 className="text-xl font-bold tracking-tight">{props.company.name} — Daily Operations Report</h1>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                        {' · Generated ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </header>

                {/* Today's Snapshot */}
                <Section title="Today's snapshot">
                    <StatGrid>
                        <Stat tone="good" label="New orders" value={props.snapshot.new_orders_count} sub={formatCurrency(props.snapshot.new_orders_value)} />
                        <Stat tone="good" label="Dispatched" value={props.snapshot.dispatched_count} sub={formatCurrency(props.snapshot.dispatched_value)} />
                        <Stat tone="good" label="Payments received" value={formatCurrency(props.snapshot.payments_today)} sub={`across ${0}`} />
                        <Stat label="Tomorrow's dispatches" value={props.snapshot.tomorrow_dispatches_count} sub="Planned pickups" />
                    </StatGrid>
                </Section>

                {/* Pending Actions */}
                <Section title="Pending actions">
                    <StatGrid>
                        <Stat tone={props.pending.lr_sharing_pending_count > 0 ? 'alert' : 'default'}
                              label="LR sharing pending" value={props.pending.lr_sharing_pending_count}
                              sub="Dispatched, customer not informed" />
                        <Stat tone={props.pending.triplicate_pending_count > 5 ? 'alert' : 'default'}
                              label="Triplicate awaited" value={props.pending.triplicate_pending_count}
                              sub="Compliance copies pending" />
                        <Stat tone={props.pending.payments_overdue_amount > 0 ? 'alert' : 'default'}
                              label="Payments overdue" value={props.pending.payments_overdue_count}
                              sub={`${formatCurrency(props.pending.payments_overdue_amount)} stuck`} />
                        <Stat tone={props.pending.open_returns_count > 0 ? 'alert' : 'default'}
                              label="Open cases" value={props.pending.open_returns_count}
                              sub={`${formatCurrency(props.pending.open_returns_value)} at risk`} />
                    </StatGrid>
                </Section>

                {/* Top Alerts */}
                {props.alerts.length > 0 && (
                    <Section title="Top alerts">
                        <div className="space-y-2">
                            {props.alerts.map((a, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        'rounded-md border bg-white p-3 border-l-4',
                                        a.severity === 'red' ? 'border-l-red-600' : 'border-l-yellow-600',
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

                {/* Dispatched today */}
                {props.dispatched_today.length > 0 && (
                    <Section title={`Dispatched today (${props.dispatched_today.length})`}>
                        <Table headers={['Order', 'Customer ref', 'LR number', 'Value', 'LR shared']}>
                            {props.dispatched_today.map((r, i) => (
                                <tr key={i} className="border-b last:border-0">
                                    <Cell><Link href={`/orders/${r.order_id}`} className="font-mono font-medium hover:underline">{r.order_code}</Link></Cell>
                                    <Cell>{r.customer_ref ?? '—'}</Cell>
                                    <Cell mono>{r.lr_number ?? '—'}</Cell>
                                    <Cell>{formatCurrency(r.value)}</Cell>
                                    <Cell>{r.lr_shared
                                        ? <span className="font-semibold text-emerald-700">SHARED</span>
                                        : <span className="font-semibold text-red-600">PENDING</span>}</Cell>
                                </tr>
                            ))}
                        </Table>
                    </Section>
                )}

                {/* LR sharing pending */}
                {props.lr_pending.length > 0 && (
                    <Section
                        title={`LR sharing pending (${props.lr_pending.length})`}
                        description="Action: share LR photo and number with each customer on WhatsApp before end of day."
                    >
                        <Table headers={['Order', 'Customer ref', 'LR number', 'Dispatched']}>
                            {props.lr_pending.map((r, i) => (
                                <tr key={i} className="border-b last:border-0">
                                    <Cell><Link href={`/orders/${r.order_id}`} className="font-mono font-medium hover:underline">{r.order_code}</Link></Cell>
                                    <Cell>{r.customer_ref ?? '—'}</Cell>
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
                        title={`Triplicate copies awaited (${props.triplicate_pending.length})`}
                        description="Action: follow up with the transporter for each. Anything older than 15 days needs escalation."
                    >
                        <Table headers={['Order', 'Customer ref', 'LR number', 'Dispatched', 'Days ago']}>
                            {props.triplicate_pending.map((r, i) => (
                                <tr key={i} className="border-b last:border-0">
                                    <Cell><Link href={`/orders/${r.order_id}`} className="font-mono font-medium hover:underline">{r.order_code}</Link></Cell>
                                    <Cell>{r.customer_ref ?? '—'}</Cell>
                                    <Cell mono>{r.lr_number ?? '—'}</Cell>
                                    <Cell>{r.dispatch_date ? formatDateIN(r.dispatch_date) : '—'}</Cell>
                                    <Cell>
                                        <span className={cn('font-semibold', r.days_ago >= 15 ? 'text-red-600' : r.days_ago >= 7 ? 'text-orange-600' : 'text-muted-foreground')}>
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
                        title={`Payments overdue (${props.payments_overdue.length})`}
                        description="Action: collection call from accounts. Anything older than 7 days needs owner intervention."
                    >
                        <Table headers={['Order', 'Customer ref', 'Invoice', 'Due date', 'Outstanding', 'Days overdue']}>
                            {props.payments_overdue.map((r, i) => (
                                <tr key={i} className="border-b last:border-0">
                                    <Cell><Link href={`/orders/${r.order_id}`} className="font-mono font-medium hover:underline">{r.order_code}</Link></Cell>
                                    <Cell>{r.customer_ref ?? '—'}</Cell>
                                    <Cell mono>{r.invoice_number ?? '—'}</Cell>
                                    <Cell>{r.due_date ? formatDateIN(r.due_date) : '—'}</Cell>
                                    <Cell><span className="font-semibold text-red-700">{formatCurrency(r.outstanding)}</span></Cell>
                                    <Cell>
                                        <span className={cn('font-semibold', r.days_overdue >= 14 ? 'text-red-600' : 'text-orange-600')}>
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
                    <Section title={`Tomorrow's planned dispatches (${props.tomorrow_dispatches.length})`}>
                        <Table headers={['Order', 'Customer ref', 'Brands', 'Value', 'Status']}>
                            {props.tomorrow_dispatches.map((r, i) => (
                                <tr key={i} className="border-b last:border-0">
                                    <Cell><Link href={`/orders/${r.order_id}`} className="font-mono font-medium hover:underline">{r.order_code}</Link></Cell>
                                    <Cell>{r.customer_ref ?? '—'}</Cell>
                                    <Cell>{r.brands || '—'}</Cell>
                                    <Cell>{formatCurrency(r.value)}</Cell>
                                    <Cell>
                                        <span className={cn('inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white',
                                            statusBg(r.status))}>
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
                    <Section title={`Open return and damage cases (${props.open_returns.length})`}>
                        <Table headers={['Case', 'Type', 'Brand', 'Severity', 'Status', 'Value at risk']}>
                            {props.open_returns.map((r, i) => (
                                <tr key={i} className="border-b last:border-0">
                                    <Cell>
                                        <Link href={`/returns/${r.case_id}`} className="font-mono font-medium hover:underline">{r.case_code}</Link>
                                        {r.case_title && <span className="text-[10px] text-muted-foreground"> {r.case_title}</span>}
                                    </Cell>
                                    <Cell>{r.case_type ?? '—'}</Cell>
                                    <Cell>{r.brand ?? '—'}</Cell>
                                    <Cell>
                                        <span className={cn('font-semibold', severityColor(r.severity))}>
                                            {r.severity ?? '—'}
                                        </span>
                                    </Cell>
                                    <Cell>{r.case_status.replace(/_/g, ' ')}</Cell>
                                    <Cell>{formatCurrency(r.value_at_risk)}</Cell>
                                </tr>
                            ))}
                        </Table>
                    </Section>
                )}

                {/* Brand-wise revenue */}
                {props.brand_revenue.length > 0 && (
                    <Section
                        title="Brand-wise revenue snapshot"
                        description="Allocated revenue across orders in the system, weighted by brand share."
                    >
                        <div className="rounded-md border bg-white px-4 py-2">
                            {props.brand_revenue.map((b) => (
                                <div key={b.brand} className="flex items-center justify-between border-b border-muted py-2 text-sm last:border-0">
                                    <span className="font-medium">{b.brand}</span>
                                    <span className="font-mono tabular-nums text-muted-foreground">{formatCurrency(b.revenue)}</span>
                                </div>
                            ))}
                        </div>
                    </Section>
                )}

                {/* Footer */}
                <footer className="mt-8 border-t pt-4 text-[10px] text-muted-foreground">
                    {props.company.name}{props.company.city ? `, ${props.company.city}` : ''} · B2B Switchgear Distribution<br />
                    Automated daily report. Live data in the <Link href="/" className="text-blue-600 hover:underline">Operations dashboard</Link>.
                </footer>
            </div>
        </AdminLayout>
    );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
    return (
        <section className="space-y-2">
            <h2 className="border-b pb-1 text-xs font-bold uppercase tracking-wider">{title}</h2>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
            {children}
        </section>
    );
}

function StatGrid({ children }: { children: React.ReactNode }) {
    return <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{children}</div>;
}

function Stat({ tone = 'default', label, value, sub }: {
    tone?: 'default' | 'good' | 'alert';
    label: string;
    value: React.ReactNode;
    sub?: string;
}) {
    const toneClass: Record<string, string> = {
        default: 'bg-muted/30 border-border',
        good: 'bg-emerald-50 border-emerald-200',
        alert: 'bg-red-50 border-red-200',
    };
    const valueClass: Record<string, string> = {
        default: 'text-foreground',
        good: 'text-emerald-700',
        alert: 'text-red-700',
    };
    return (
        <div className={cn('rounded-md border p-3', toneClass[tone])}>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className={cn('mt-1 text-xl font-bold tabular-nums', valueClass[tone])}>{value}</p>
            {sub && <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>}
        </div>
    );
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
    return (
        <div className="overflow-hidden rounded-md border">
            <table className="w-full text-xs">
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

function Cell({ children, mono = false }: { children: React.ReactNode; mono?: boolean }) {
    return <td className={cn('px-2.5 py-2 align-top', mono && 'font-mono')}>{children}</td>;
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
