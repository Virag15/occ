import { Head, Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import {
    addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday,
    parse, startOfMonth, startOfWeek, subMonths,
} from 'date-fns';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Truck, Clock } from '@/lib/icons';
import { cn } from '@/lib/utils';
import type { Shipment, Customer } from '@/types/entities';

type CalendarShipment = Shipment & {
    order?: { id: number; order_code: string; customer?: Pick<Customer, 'id' | 'name' | 'company'> | null } | null;
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ShipmentsCalendar({
    month,
    shipments,
    pending,
}: {
    month: string;
    shipments: CalendarShipment[];
    pending: CalendarShipment[];
}) {
    const cursor = useMemo(() => parse(month, 'yyyy-MM', new Date()), [month]);
    const [activeDay, setActiveDay] = useState<Date | null>(null);

    // 7×N grid spanning the visual month — leading/trailing days from adjacent months
    // so each week row is complete.
    const gridDays = useMemo(() => {
        const start = startOfWeek(startOfMonth(cursor));
        const end = endOfWeek(endOfMonth(cursor));
        return eachDayOfInterval({ start, end });
    }, [cursor]);

    // Index dispatched + pending shipments by their date for O(1) cell lookup
    const dispatchedByDate = useMemo(() => {
        const m = new Map<string, CalendarShipment[]>();
        for (const s of shipments) {
            if (!s.dispatch_date) continue;
            const key = s.dispatch_date;
            (m.get(key) ?? m.set(key, []).get(key)!).push(s);
        }
        return m;
    }, [shipments]);

    const pendingByDate = useMemo(() => {
        const m = new Map<string, CalendarShipment[]>();
        for (const s of pending) {
            if (!s.pickup_scheduled_date) continue;
            (m.get(s.pickup_scheduled_date) ?? m.set(s.pickup_scheduled_date, []).get(s.pickup_scheduled_date)!).push(s);
        }
        return m;
    }, [pending]);

    const navigate = (delta: number) => {
        const next = format(delta > 0 ? addMonths(cursor, 1) : subMonths(cursor, 1), 'yyyy-MM');
        router.get(route('shipments.calendar'), { month: next }, { preserveScroll: true, preserveState: false });
    };

    const goToday = () => {
        router.get(route('shipments.calendar'), { month: format(new Date(), 'yyyy-MM') }, { preserveScroll: true, preserveState: false });
    };

    const activeKey = activeDay ? format(activeDay, 'yyyy-MM-dd') : null;
    const activeDispatched = activeKey ? dispatchedByDate.get(activeKey) ?? [] : [];
    const activePending = activeKey ? pendingByDate.get(activeKey) ?? [] : [];

    const totals = {
        dispatched: shipments.length,
        pending: pending.length,
    };

    return (
        <AdminLayout breadcrumbs={[{ label: 'Shipments' }, { label: 'Calendar' }]}>
            <Head title={`Calendar — ${format(cursor, 'MMMM yyyy')}`} />

            <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">
                    {totals.dispatched} dispatched · {totals.pending} pending pickup
                </span>

                <div className="ml-auto flex items-center gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                        <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <div className="min-w-[120px] text-center text-sm font-medium tabular-nums">
                        {format(cursor, 'MMMM yyyy')}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(1)}>
                        <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={goToday}>Today</Button>
                </div>
            </div>

            {/* Weekday header */}
            <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                {WEEKDAY_LABELS.map((d) => (
                    <div key={d} className="px-2 py-1">{d}</div>
                ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-1">
                {gridDays.map((day) => {
                    const inMonth = isSameMonth(day, cursor);
                    const key = format(day, 'yyyy-MM-dd');
                    const dispatched = dispatchedByDate.get(key) ?? [];
                    const pendingHere = pendingByDate.get(key) ?? [];
                    const hasAny = dispatched.length > 0 || pendingHere.length > 0;

                    return (
                        <button
                            key={day.toISOString()}
                            type="button"
                            onClick={() => hasAny ? setActiveDay(day) : null}
                            className={cn(
                                'flex min-h-[88px] flex-col gap-1 rounded-md border bg-card p-1.5 text-left transition-colors',
                                !inMonth && 'bg-muted/30 text-muted-foreground',
                                isToday(day) && 'border-primary ring-1 ring-primary/40',
                                hasAny ? 'cursor-pointer hover:border-primary/50' : 'cursor-default',
                            )}
                        >
                            <div className="flex items-start justify-between">
                                <span className={cn('text-[11px] font-medium tabular-nums', isToday(day) && 'text-primary')}>
                                    {format(day, 'd')}
                                </span>
                                {hasAny && (
                                    <span className="text-[9px] tabular-nums text-muted-foreground">
                                        {dispatched.length + pendingHere.length}
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-col gap-0.5 overflow-hidden">
                                {dispatched.slice(0, 2).map((s) => (
                                    <span key={s.id} className="truncate rounded bg-emerald-500/10 px-1 py-0.5 text-[9px] text-emerald-700">
                                        <Truck className="inline h-2.5 w-2.5 mr-0.5" />
                                        {s.order?.order_code}
                                    </span>
                                ))}
                                {pendingHere.slice(0, Math.max(0, 2 - dispatched.length)).map((s) => (
                                    <span key={s.id} className="truncate rounded bg-amber-500/10 px-1 py-0.5 text-[9px] text-amber-700">
                                        <Clock className="inline h-2.5 w-2.5 mr-0.5" />
                                        {s.order?.order_code}
                                    </span>
                                ))}
                                {(dispatched.length + pendingHere.length) > 2 && (
                                    <span className="text-[9px] text-muted-foreground">+ {(dispatched.length + pendingHere.length) - 2} more</span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500/40" />
                    Dispatched
                </span>
                <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-sm bg-amber-500/40" />
                    Pickup scheduled (no LR yet)
                </span>
            </div>

            <Dialog open={activeDay !== null} onOpenChange={(o) => !o && setActiveDay(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{activeDay && format(activeDay, 'EEEE, d MMMM yyyy')}</DialogTitle>
                        <DialogDescription>
                            {activeDispatched.length} dispatched · {activePending.length} pending pickup
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[60vh] space-y-2 overflow-auto">
                        {activeDispatched.length > 0 && (
                            <div>
                                <p className="mb-1 text-[10px] uppercase tracking-wider text-emerald-700">Dispatched</p>
                                {activeDispatched.map((s) => (
                                    <ShipmentRow key={s.id} shipment={s} variant="dispatched" />
                                ))}
                            </div>
                        )}
                        {activePending.length > 0 && (
                            <div>
                                <p className="mb-1 mt-3 text-[10px] uppercase tracking-wider text-amber-700">Pending pickup</p>
                                {activePending.map((s) => (
                                    <ShipmentRow key={s.id} shipment={s} variant="pending" />
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}

function ShipmentRow({ shipment, variant }: { shipment: CalendarShipment; variant: 'dispatched' | 'pending' }) {
    const tone = variant === 'dispatched' ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50';
    return (
        <Link
            href={route('orders.show', { order: shipment.order?.id ?? 0 })}
            className={cn('flex items-center gap-2 rounded border px-2 py-1.5 text-sm hover:bg-muted/40', tone)}
        >
            <span className="font-mono text-xs font-medium">{shipment.shipment_code}</span>
            <span className="text-xs text-muted-foreground">→</span>
            <span className="truncate text-xs font-medium flex-1">
                {shipment.order?.order_code} · {shipment.order?.customer?.name ?? '—'}
            </span>
            {shipment.transporter && (
                <Badge variant="secondary" className="shrink-0 text-[10px]">{shipment.transporter.name}</Badge>
            )}
            {shipment.lr_number && (
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">LR {shipment.lr_number}</span>
            )}
        </Link>
    );
}
