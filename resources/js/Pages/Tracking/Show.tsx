import { Head } from '@inertiajs/react';
import { CheckCircle2, Circle, Clock, Package, Truck, MapPin, FileCheck } from 'lucide-react';
import { formatCurrency, formatDateIN } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type TrackedShipment = {
    id: number;
    lr_number: string | null;
    dispatch_date: string | null;
    delivered_date: string | null;
    expected_delivery: string | null;
    status: string;
    transporter?: { id: number; name: string } | null;
};

type TrackedOrder = {
    id: number;
    order_code: string;
    order_date: string;
    customer_reference_number: string | null;
    customer_po_number: string | null;
    brands: string[] | null;
    order_value: string | number | null;
    status: string;
    pod_received: boolean;
    customer: { id: number; name: string; company: string | null; city: string | null } | null;
    items: Array<{ id: number; product_name: string; qty_ordered: string; unit: string | null; unit_price: string | null; line_total: string | null }>;
    shipments: TrackedShipment[];
};

const STAGES: { id: string; label: string; matches: string[] }[] = [
    { id: 'placed', label: 'Order placed', matches: ['new_order', 'confirmed'] },
    { id: 'preparing', label: 'Preparing', matches: ['stock_check', 'packing', 'packed', 'ready_for_dispatch'] },
    { id: 'dispatched', label: 'Dispatched', matches: ['dispatched'] },
    { id: 'delivered', label: 'Delivered', matches: ['delivered', 'closed'] },
];

function currentStageIndex(status: string): number {
    if (status === 'cancelled' || status === 'on_hold') return -1;
    for (let i = STAGES.length - 1; i >= 0; i--) {
        if (STAGES[i].matches.includes(status)) return i;
    }
    return 0;
}

export default function TrackingShow({
    order,
    company,
}: {
    order: TrackedOrder;
    company: { name: string; phone: string | null; email: string | null };
}) {
    const idx = currentStageIndex(order.status);
    const isParked = order.status === 'on_hold' || order.status === 'cancelled';

    const latestShipment = order.shipments[order.shipments.length - 1] ?? null;

    return (
        <div className="min-h-svh bg-muted/30">
            <Head title={`Order ${order.order_code} — tracking`} />

            {/* Header band */}
            <header className="border-b bg-card">
                <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <div>
                        <h1 className="text-base font-bold tracking-tight">{company.name}</h1>
                        <p className="text-[10px] text-muted-foreground">Order tracking</p>
                    </div>
                    {(company.phone || company.email) && (
                        <p className="text-[10px] text-muted-foreground">
                            {company.phone} {company.phone && company.email ? '·' : ''} {company.email}
                        </p>
                    )}
                </div>
            </header>

            <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
                {/* Order header card */}
                <section className="rounded-lg border bg-card p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Order</p>
                            <p className="font-mono text-lg font-semibold">{order.order_code}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                                Placed {formatDateIN(order.order_date)}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Customer</p>
                            <p className="text-sm font-medium">{order.customer?.name ?? '—'}</p>
                            {order.customer?.company && (
                                <p className="text-xs text-muted-foreground">{order.customer.company}</p>
                            )}
                            {order.customer?.city && (
                                <p className="flex items-center justify-end gap-0.5 text-[10px] text-muted-foreground">
                                    <MapPin className="h-2.5 w-2.5" /> {order.customer.city}
                                </p>
                            )}
                        </div>
                    </div>

                    {(order.customer_reference_number || order.customer_po_number) && (
                        <div className="mt-3 flex flex-wrap gap-2 border-t pt-3 text-xs">
                            {order.customer_reference_number && (
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Your reference</p>
                                    <p className="font-mono">{order.customer_reference_number}</p>
                                </div>
                            )}
                            {order.customer_po_number && (
                                <div className="ml-4">
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">PO number</p>
                                    <p className="font-mono">{order.customer_po_number}</p>
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* Status timeline */}
                <section className="rounded-lg border bg-card p-4 shadow-sm">
                    <p className="mb-3 text-[10px] uppercase tracking-wider text-muted-foreground">Status</p>

                    {isParked ? (
                        <p className={cn(
                            'rounded border px-3 py-2 text-sm font-medium',
                            order.status === 'cancelled'
                                ? 'border-red-200 bg-red-50 text-red-700'
                                : 'border-amber-200 bg-amber-50 text-amber-800',
                        )}>
                            This order is currently {order.status.replace(/_/g, ' ')}.
                            {order.status === 'on_hold' && ' We\'ll resume it shortly — contact us if you need an update.'}
                        </p>
                    ) : (
                        <ol className="space-y-3">
                            {STAGES.map((stage, i) => {
                                const done = i < idx;
                                const current = i === idx;
                                return (
                                    <li key={stage.id} className="flex items-start gap-3">
                                        {done ? (
                                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                                        ) : current ? (
                                            <Clock className="mt-0.5 h-5 w-5 shrink-0 animate-pulse text-primary" />
                                        ) : (
                                            <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground/40" />
                                        )}
                                        <div className="flex-1">
                                            <p className={cn(
                                                'text-sm',
                                                done && 'text-muted-foreground line-through decoration-1',
                                                current && 'font-medium',
                                            )}>
                                                {stage.label}
                                            </p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </section>

                {/* Dispatch info — only show if we have a shipment with details */}
                {latestShipment && (latestShipment.transporter || latestShipment.lr_number || latestShipment.dispatch_date) && (
                    <section className="rounded-lg border bg-card p-4 shadow-sm">
                        <p className="mb-3 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                            <Truck className="h-3 w-3" />
                            Dispatch
                        </p>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            {latestShipment.transporter && (
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Transporter</p>
                                    <p className="font-medium">{latestShipment.transporter.name}</p>
                                </div>
                            )}
                            {latestShipment.lr_number && (
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">LR / Docket</p>
                                    <p className="font-mono">{latestShipment.lr_number}</p>
                                </div>
                            )}
                            {latestShipment.dispatch_date && (
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Dispatched on</p>
                                    <p className="tabular-nums">{formatDateIN(latestShipment.dispatch_date)}</p>
                                </div>
                            )}
                            {latestShipment.expected_delivery && !latestShipment.delivered_date && (
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Expected delivery</p>
                                    <p className="tabular-nums">{formatDateIN(latestShipment.expected_delivery)}</p>
                                </div>
                            )}
                            {latestShipment.delivered_date && (
                                <div className="col-span-2 rounded border border-emerald-200 bg-emerald-50 p-2">
                                    <p className="flex items-center gap-1 text-xs font-medium text-emerald-700">
                                        <FileCheck className="h-3 w-3" />
                                        Delivered on {formatDateIN(latestShipment.delivered_date)}
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* Line items */}
                <section className="rounded-lg border bg-card p-4 shadow-sm">
                    <p className="mb-3 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        <Package className="h-3 w-3" />
                        Items ({order.items.length})
                    </p>
                    <div className="divide-y">
                        {order.items.map((it) => (
                            <div key={it.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                                <div className="flex-1">
                                    <p className="font-medium">{it.product_name}</p>
                                    <p className="text-[11px] text-muted-foreground tabular-nums">
                                        {it.qty_ordered} {it.unit ?? ''} {it.unit_price ? `× ${formatCurrency(it.unit_price)}` : ''}
                                    </p>
                                </div>
                                {it.line_total && (
                                    <span className="font-mono text-xs tabular-nums">{formatCurrency(it.line_total)}</span>
                                )}
                            </div>
                        ))}
                    </div>
                    {order.order_value && (
                        <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm">
                            <span className="font-medium">Order total</span>
                            <span className="font-mono text-base font-semibold tabular-nums">{formatCurrency(order.order_value)}</span>
                        </div>
                    )}
                    {order.brands && order.brands.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1 border-t pt-3">
                            {order.brands.map((b) => (
                                <Badge key={b} variant="secondary" className="text-[10px]">{b}</Badge>
                            ))}
                        </div>
                    )}
                </section>

                <p className="text-center text-[10px] text-muted-foreground">
                    Questions? Reply to the WhatsApp / call us on {company.phone ?? '—'}.
                </p>
            </main>
        </div>
    );
}
