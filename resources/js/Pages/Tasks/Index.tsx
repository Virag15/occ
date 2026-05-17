import { Head, Link } from '@inertiajs/react';
import { ReactNode, useState } from 'react';
import {
    Truck, FileCheck, IndianRupee, RotateCcw, AlertTriangle, ChevronRight, Phone,
} from '@/lib/icons';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDateIN } from '@/lib/format';
import { cn } from '@/lib/utils';

type Customer = { id: number; name: string; company?: string | null; phone?: string | null };
type TransporterLite = { id: number; name: string };

type AwaitingLrRow = {
    id: number; order_code: string; order_date: string; order_value: string | null;
    status: string; priority: string; lr_number: string | null;
    customer?: Customer;
};

type PodPendingRow = {
    id: number; order_code: string; order_date: string; dispatch_date: string | null;
    order_value: string | null; lr_number: string | null;
    customer?: Customer; transporter?: TransporterLite | null;
};

type TriplicateRow = {
    id: number; order_code: string; dispatch_date: string | null; delivered_date: string | null;
    lr_number: string | null;
    customer?: Customer; transporter?: TransporterLite | null;
};

type PaymentRow = {
    id: number; order_code: string; invoice_number: string | null;
    order_value: string | null; amount_received: string | null;
    payment_due_date: string | null; payment_status: string;
    customer?: Customer;
};

type ReturnRow = {
    id: number; case_code: string; date_reported: string;
    severity: string | null; case_status: string; value_at_risk: string | null;
    case_title: string | null;
    customer?: Customer; order?: { id: number; order_code: string } | null;
};

type Props = {
    awaiting_lr: AwaitingLrRow[];
    pod_pending: PodPendingRow[];
    triplicate_pending: TriplicateRow[];
    payments_overdue: PaymentRow[];
    open_returns: ReturnRow[];
    today: string;
};

function daysAgo(date: string | null): number {
    if (!date) return 0;
    const d = new Date(date);
    const now = new Date();
    return Math.max(0, Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)));
}

function daysDelta(date: string | null): string {
    if (!date) return '—';
    const d = daysAgo(date);
    if (d === 0) return 'today';
    if (d === 1) return '1d ago';
    return `${d}d ago`;
}

function severityClasses(s: string | null): string {
    switch (s) {
        case 'critical': return 'bg-red-500/10 text-red-700 border-red-200';
        case 'high':     return 'bg-orange-500/10 text-orange-700 border-orange-200';
        case 'medium':   return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
        case 'low':      return 'bg-muted text-muted-foreground border-border';
        default:         return 'bg-muted text-muted-foreground border-border';
    }
}

function priorityClasses(p: string): string {
    switch (p) {
        case 'urgent': return 'bg-red-500/10 text-red-700 border-red-200';
        case 'high':   return 'bg-orange-500/10 text-orange-700 border-orange-200';
        default:       return 'bg-muted text-muted-foreground border-border';
    }
}

export default function TasksIndex(props: Props) {
    const totalActions =
        props.awaiting_lr.length +
        props.pod_pending.length +
        props.triplicate_pending.length +
        props.payments_overdue.length +
        props.open_returns.length;

    return (
        <AdminLayout breadcrumbs={[{ label: 'Tasks' }]}>
            <Head title="Tasks" />

            <div className="space-y-5">
                {/* Header — title implied by breadcrumb; show the open-count badge */}
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                        Every open action across orders, payments, and returns. Work top-to-bottom or jump to a section.
                    </p>
                    <Badge
                        variant="outline"
                        className={cn('text-sm tabular-nums', totalActions === 0 ? 'border-emerald-200 bg-emerald-500/10 text-emerald-700' : 'border-primary/30 bg-primary/10 text-primary')}
                    >
                        {totalActions === 0 ? '✓ inbox zero' : `${totalActions} open`}
                    </Badge>
                </div>

                {/* Section summary chips — jump links */}
                <div className="flex flex-wrap gap-2">
                    <SectionChip icon={Truck} label="Awaiting LR" count={props.awaiting_lr.length} href="#awaiting-lr" />
                    <SectionChip icon={FileCheck} label="POD pending" count={props.pod_pending.length} href="#pod-pending" />
                    <SectionChip icon={FileCheck} label="Triplicate pending" count={props.triplicate_pending.length} href="#triplicate-pending" />
                    <SectionChip icon={IndianRupee} label="Payments overdue" count={props.payments_overdue.length} href="#payments-overdue" tone="red" />
                    <SectionChip icon={RotateCcw} label="Open returns" count={props.open_returns.length} href="#open-returns" />
                </div>

                {/* ─── Awaiting LR ───────────────────────────────── */}
                <Section
                    id="awaiting-lr"
                    icon={Truck}
                    title="Awaiting LR / dispatch"
                    description="Orders packed or ready to dispatch. Add the LR number + photo to advance the order."
                    count={props.awaiting_lr.length}
                    empty="Nothing waiting for an LR. Warehouse is caught up."
                >
                    {props.awaiting_lr.length > 0 && (
                        <Table>
                            <THead headers={['Order', 'Customer', 'Status', 'Priority', 'Value', 'Age', '']} />
                            <tbody>
                                {props.awaiting_lr.map((o) => (
                                    <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30">
                                        <Td><Link href={`/orders/${o.id}`} className="font-mono text-xs font-medium hover:underline">{o.order_code}</Link></Td>
                                        <Td>{o.customer?.name ?? '—'}</Td>
                                        <Td><Badge variant="outline" className="text-[10px] uppercase">{o.status.replace(/_/g, ' ')}</Badge></Td>
                                        <Td>{o.priority !== 'normal' ? <Badge className={cn('border text-[10px] uppercase', priorityClasses(o.priority))}>{o.priority}</Badge> : <span className="text-muted-foreground">—</span>}</Td>
                                        <Td num>{formatCurrency(o.order_value)}</Td>
                                        <Td><span className="text-xs text-muted-foreground">{daysDelta(o.order_date)}</span></Td>
                                        <Td><ActionLink href={`/orders/${o.id}`}>Open</ActionLink></Td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Section>

                {/* ─── POD pending ───────────────────────────────── */}
                <Section
                    id="pod-pending"
                    icon={FileCheck}
                    title="POD pending"
                    description="Dispatched orders without proof of delivery. Chase the transporter or customer for confirmation."
                    count={props.pod_pending.length}
                    empty="No POD chasing today."
                >
                    {props.pod_pending.length > 0 && (
                        <Table>
                            <THead headers={['Order', 'Customer', 'Transporter', 'LR', 'Dispatched', 'Value', '']} />
                            <tbody>
                                {props.pod_pending.map((o) => (
                                    <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30">
                                        <Td><Link href={`/orders/${o.id}`} className="font-mono text-xs font-medium hover:underline">{o.order_code}</Link></Td>
                                        <Td>{o.customer?.name ?? '—'}</Td>
                                        <Td>{o.transporter?.name ?? <span className="italic text-muted-foreground">—</span>}</Td>
                                        <Td mono>{o.lr_number ?? '—'}</Td>
                                        <Td><AgeIndicator date={o.dispatch_date} amber={5} red={10} /></Td>
                                        <Td num>{formatCurrency(o.order_value)}</Td>
                                        <Td><ActionLink href={`/orders/${o.id}`}>Upload POD</ActionLink></Td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Section>

                {/* ─── Triplicate pending ─────────────────────────── */}
                <Section
                    id="triplicate-pending"
                    icon={FileCheck}
                    title="Triplicate copies awaited"
                    description="Delivered orders without the triplicate copy back from the transporter. Older than 15 days → escalate."
                    count={props.triplicate_pending.length}
                    empty="All triplicates received. Compliance is happy."
                >
                    {props.triplicate_pending.length > 0 && (
                        <Table>
                            <THead headers={['Order', 'Customer', 'Transporter', 'LR', 'Delivered', '']} />
                            <tbody>
                                {props.triplicate_pending.map((o) => (
                                    <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30">
                                        <Td><Link href={`/orders/${o.id}`} className="font-mono text-xs font-medium hover:underline">{o.order_code}</Link></Td>
                                        <Td>{o.customer?.name ?? '—'}</Td>
                                        <Td>{o.transporter?.name ?? <span className="italic text-muted-foreground">—</span>}</Td>
                                        <Td mono>{o.lr_number ?? '—'}</Td>
                                        <Td><AgeIndicator date={o.delivered_date} amber={7} red={15} /></Td>
                                        <Td><ActionLink href={`/orders/${o.id}`}>Open</ActionLink></Td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Section>

                {/* ─── Payments overdue ──────────────────────────── */}
                <Section
                    id="payments-overdue"
                    icon={IndianRupee}
                    title="Payments overdue"
                    description="Accounts: make collection calls. Older than 7 days needs owner intervention."
                    count={props.payments_overdue.length}
                    empty="No overdue payments. Cash flow looks healthy."
                    tone="red"
                >
                    {props.payments_overdue.length > 0 && (
                        <Table>
                            <THead headers={['Order', 'Customer', 'Invoice', 'Due date', 'Outstanding', 'Phone', '']} />
                            <tbody>
                                {props.payments_overdue.map((o) => {
                                    const outstanding = Math.max(0, Number(o.order_value ?? 0) - Number(o.amount_received ?? 0));
                                    return (
                                        <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30">
                                            <Td><Link href={`/orders/${o.id}`} className="font-mono text-xs font-medium hover:underline">{o.order_code}</Link></Td>
                                            <Td>{o.customer?.name ?? '—'}</Td>
                                            <Td mono>{o.invoice_number ?? '—'}</Td>
                                            <Td><AgeIndicator date={o.payment_due_date} amber={3} red={7} suffix="overdue" /></Td>
                                            <Td num><span className="font-semibold text-red-700">{formatCurrency(outstanding)}</span></Td>
                                            <Td>{o.customer?.phone ? <a href={`tel:${o.customer.phone}`} className="inline-flex items-center gap-1 font-mono text-xs hover:underline"><Phone className="h-3 w-3" />{o.customer.phone}</a> : <span className="text-muted-foreground">—</span>}</Td>
                                            <Td><ActionLink href={`/orders/${o.id}`}>Record payment</ActionLink></Td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    )}
                </Section>

                {/* ─── Open returns ──────────────────────────────── */}
                <Section
                    id="open-returns"
                    icon={RotateCcw}
                    title="Open return cases"
                    description="Critical cases need same-day attention. High/medium can wait but log progress."
                    count={props.open_returns.length}
                    empty="No open return cases. Great quality this period."
                >
                    {props.open_returns.length > 0 && (
                        <Table>
                            <THead headers={['Case', 'Customer', 'Order', 'Severity', 'Status', 'Value at risk', 'Reported', '']} />
                            <tbody>
                                {props.open_returns.map((r) => (
                                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                                        <Td>
                                            <Link href={`/returns/${r.id}`} className="font-mono text-xs font-medium hover:underline">{r.case_code}</Link>
                                            {r.case_title && <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">{r.case_title}</p>}
                                        </Td>
                                        <Td>{r.customer?.name ?? '—'}</Td>
                                        <Td>{r.order ? <Link href={`/orders/${r.order.id}`} className="font-mono text-xs hover:underline">{r.order.order_code}</Link> : '—'}</Td>
                                        <Td><Badge className={cn('border text-[10px] uppercase', severityClasses(r.severity))}>{r.severity ?? '—'}</Badge></Td>
                                        <Td><Badge variant="outline" className="text-[10px] uppercase">{r.case_status.replace(/_/g, ' ')}</Badge></Td>
                                        <Td num>{formatCurrency(r.value_at_risk)}</Td>
                                        <Td><span className="text-xs text-muted-foreground">{daysDelta(r.date_reported)}</span></Td>
                                        <Td><ActionLink href={`/returns/${r.id}`}>Open</ActionLink></Td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Section>
            </div>
        </AdminLayout>
    );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function Section({ id, icon: Icon, title, description, count, empty, tone = 'default', children }: {
    id: string;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    count: number;
    empty: string;
    tone?: 'default' | 'red';
    children: ReactNode;
}) {
    const [collapsed, setCollapsed] = useState(false);
    const empty0 = count === 0;
    return (
        <Card id={id} className={cn(empty0 && 'opacity-60', tone === 'red' && count > 0 && 'border-red-200')}>
            <CardHeader className="cursor-pointer p-4 pb-2" onClick={() => setCollapsed((c) => !c)}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                        <Icon className={cn('h-4 w-4', tone === 'red' && count > 0 ? 'text-red-600' : 'text-muted-foreground')} />
                        {title}
                        <Badge
                            className={cn(
                                'border text-[10px] tabular-nums',
                                empty0 ? 'bg-muted text-muted-foreground border-border'
                                : tone === 'red' ? 'bg-red-500/10 text-red-700 border-red-200'
                                : 'bg-primary/10 text-primary border-primary/20',
                            )}
                        >
                            {count}
                        </Badge>
                    </CardTitle>
                    <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform', !collapsed && 'rotate-90')} />
                </div>
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardHeader>
            {!collapsed && (
                <CardContent className="p-4 pt-2">
                    {empty0 ? <p className="text-sm text-muted-foreground">{empty}</p> : children}
                </CardContent>
            )}
        </Card>
    );
}

function SectionChip({ icon: Icon, label, count, href, tone = 'default' }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string; count: number; href: string;
    tone?: 'default' | 'red';
}) {
    const muted = count === 0;
    return (
        <a
            href={href}
            className={cn(
                'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition-colors',
                muted ? 'text-muted-foreground hover:bg-muted/30' : 'hover:bg-muted/50',
            )}
        >
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
            <span className={cn(
                'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums',
                muted ? 'bg-muted text-muted-foreground'
                : tone === 'red' ? 'bg-red-500/10 text-red-700'
                : 'bg-primary/10 text-primary',
            )}>{count}</span>
        </a>
    );
}

function Table({ children }: { children: ReactNode }) {
    return <div className="overflow-x-auto rounded-md border"><table className="w-full text-sm">{children}</table></div>;
}

function THead({ headers }: { headers: string[] }) {
    return (
        <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
            <tr>
                {headers.map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left font-medium">{h}</th>
                ))}
            </tr>
        </thead>
    );
}

function Td({ children, num = false, mono = false }: { children: ReactNode; num?: boolean; mono?: boolean }) {
    return (
        <td className={cn(
            'px-3 py-2 text-xs align-top',
            num && 'text-right tabular-nums',
            mono && 'font-mono',
        )}>{children}</td>
    );
}

function ActionLink({ href, children }: { href: string; children: ReactNode }) {
    return (
        <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
            <Link href={href}>{children} <ChevronRight className="ml-0.5 h-3 w-3" /></Link>
        </Button>
    );
}

function AgeIndicator({ date, amber, red, suffix = 'ago' }: { date: string | null; amber: number; red: number; suffix?: string }) {
    if (!date) return <span className="text-muted-foreground">—</span>;
    const d = daysAgo(date);
    const tone = d >= red ? 'text-red-600' : d >= amber ? 'text-orange-600' : 'text-muted-foreground';
    return (
        <span className={cn('text-xs tabular-nums', tone)}>
            {d === 0 ? 'today' : `${d}d ${suffix}`}
        </span>
    );
}
