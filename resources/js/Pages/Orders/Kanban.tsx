import { Head, Link, router, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
    DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, useDraggable, useDroppable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LayoutGrid, ListOrdered, AlertOctagon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDateIN } from '@/lib/format';
import type { Order } from '@/types/entities';
import type { PageProps } from '@/types';

// Display order for kanban columns. Terminal states (closed/cancelled) are last
// and rendered dimmer to push focus toward in-flight work.
const COLUMNS: { id: string; label: string; terminal?: boolean }[] = [
    { id: 'new_order', label: 'New' },
    { id: 'confirmed', label: 'Confirmed' },
    { id: 'stock_check', label: 'Stock check' },
    { id: 'packing', label: 'Packing' },
    { id: 'packed', label: 'Packed' },
    { id: 'ready_for_dispatch', label: 'Ready' },
    { id: 'dispatched', label: 'Dispatched' },
    { id: 'delivered', label: 'Delivered' },
    { id: 'on_hold', label: 'On hold' },
    { id: 'closed', label: 'Closed', terminal: true },
    { id: 'cancelled', label: 'Cancelled', terminal: true },
];

const PRIORITY_TONE: Record<string, string> = {
    urgent: 'border-red-300 bg-red-50 text-red-700',
    high: 'border-amber-300 bg-amber-50 text-amber-700',
    normal: 'border-muted bg-muted/40 text-muted-foreground',
    low: 'border-muted bg-muted/40 text-muted-foreground',
};

function OrderCard({ order, dragging = false }: { order: Order; dragging?: boolean }) {
    const ageDays = Math.max(0, Math.round((Date.now() - new Date(order.order_date).getTime()) / 86_400_000));
    return (
        <div
            className={cn(
                'rounded-md border bg-card p-2.5 shadow-sm transition-colors',
                dragging ? 'cursor-grabbing border-primary ring-2 ring-primary/30' : 'cursor-grab hover:border-primary/40',
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <Link
                    href={route('orders.show', { order: order.id })}
                    className="font-mono text-[10px] font-semibold hover:underline"
                    onClick={(e) => e.stopPropagation()}
                >
                    {order.order_code}
                </Link>
                {order.priority && order.priority !== 'normal' && (
                    <span className={cn('rounded border px-1.5 py-px text-[9px] font-medium uppercase tracking-wider', PRIORITY_TONE[order.priority])}>
                        {order.priority}
                    </span>
                )}
            </div>

            <p className="mt-1 truncate text-xs font-medium">{order.customer?.name ?? '—'}</p>
            {order.customer?.company && (
                <p className="truncate text-[10px] text-muted-foreground">{order.customer.company}</p>
            )}

            <div className="mt-1.5 flex flex-wrap items-center gap-1">
                {(order.brands ?? []).slice(0, 2).map((b) => (
                    <Badge key={b} variant="secondary" className="h-4 px-1 text-[9px]">{b}</Badge>
                ))}
                {(order.brands?.length ?? 0) > 2 && (
                    <span className="text-[9px] text-muted-foreground">+{(order.brands?.length ?? 0) - 2}</span>
                )}
            </div>

            <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground tabular-nums">
                <span>{formatDateIN(order.order_date)}</span>
                <span className="font-mono">{formatCurrency(order.order_value ?? 0)}</span>
            </div>
            {ageDays > 7 && order.status !== 'closed' && order.status !== 'cancelled' && (
                <p className="mt-1 text-[9px] text-amber-600">{ageDays}d old</p>
            )}
        </div>
    );
}

function DraggableCard({ order, disabled }: { order: Order; disabled: boolean }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: String(order.id),
        disabled,
    });

    const style: React.CSSProperties = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
            <OrderCard order={order} />
        </div>
    );
}

function KanbanColumn({
    column,
    orders,
    canDrop,
}: {
    column: typeof COLUMNS[number];
    orders: Order[];
    canDrop: boolean;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: column.id });

    return (
        <div className="flex w-72 shrink-0 flex-col">
            <div className="mb-2 flex items-center justify-between">
                <h2 className={cn('text-xs font-semibold uppercase tracking-wider', column.terminal && 'text-muted-foreground')}>
                    {column.label}
                </h2>
                <span className="rounded bg-muted px-1.5 py-px text-[10px] tabular-nums text-muted-foreground">
                    {orders.length}
                </span>
            </div>
            <div
                ref={setNodeRef}
                className={cn(
                    'flex flex-1 min-h-[120px] flex-col gap-2 rounded-lg border bg-muted/20 p-2 transition-colors',
                    isOver && canDrop && 'border-primary bg-primary/5',
                    isOver && !canDrop && 'border-destructive/40 bg-destructive/5',
                )}
            >
                {orders.length === 0 ? (
                    <p className="my-auto text-center text-[10px] italic text-muted-foreground">—</p>
                ) : (
                    orders.map((o) => <DraggableCard key={o.id} order={o} disabled={column.terminal === true} />)
                )}
            </div>
        </div>
    );
}

export default function OrdersKanban({ rows }: { rows: Order[] }) {
    const { auth } = usePage<PageProps>().props;
    const canDrag = auth.user.role === 'owner' || auth.user.role === 'manager' || auth.user.role === 'warehouse';

    // Local copy so the card moves immediately on drop (optimistic), reverted on server error.
    const [orders, setOrders] = useState<Order[]>(rows);
    const [draggingId, setDraggingId] = useState<number | null>(null);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

    const byStatus = useMemo(() => {
        const map = new Map<string, Order[]>();
        for (const c of COLUMNS) map.set(c.id, []);
        for (const o of orders) {
            const bucket = map.get(o.status) ?? [];
            bucket.push(o);
            map.set(o.status, bucket);
        }
        return map;
    }, [orders]);

    const draggingOrder = draggingId !== null ? orders.find((o) => o.id === draggingId) ?? null : null;

    const onDragStart = (e: DragStartEvent) => setDraggingId(Number(e.active.id));

    const onDragEnd = (e: DragEndEvent) => {
        const { active, over } = e;
        setDraggingId(null);
        if (!over) return;

        const orderId = Number(active.id);
        const newStatus = String(over.id);
        const order = orders.find((o) => o.id === orderId);
        if (!order || order.status === newStatus) return;

        const oldStatus = order.status;

        // Optimistic — move the card before the server confirms
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));

        router.patch(route('orders.update-status', { order: orderId }), { status: newStatus }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => toast.success(`${order.order_code} → ${newStatus.replace(/_/g, ' ')}`),
            onError: (errs) => {
                // Revert and surface the precondition error (e.g., "Add an LR number before dispatching")
                setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: oldStatus } : o)));
                toast.error(errs.status ?? 'Status change rejected');
            },
        });
    };

    const total = orders.length;

    return (
        <AdminLayout breadcrumbs={[{ label: 'Orders', href: '/orders' }, { label: 'Kanban' }]}>
            <Head title="Orders — Kanban" />

            <div className="mb-3 flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4" />
                    Workflow board
                </h1>
                <span className="text-xs text-muted-foreground">· {total} orders</span>
                <Button asChild variant="outline" size="sm" className="ml-auto">
                    <Link href={route('orders.index')}>
                        <ListOrdered className="h-3.5 w-3.5 mr-1" /> Table view
                    </Link>
                </Button>
            </div>

            {!canDrag && (
                <p className="mb-2 flex items-center gap-1.5 rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-700">
                    <AlertOctagon className="h-3 w-3" />
                    Your role can view this board but not change order status. Open an order to act on it.
                </p>
            )}

            <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
                <div className="flex gap-3 overflow-x-auto pb-3">
                    {COLUMNS.map((c) => (
                        <KanbanColumn
                            key={c.id}
                            column={c}
                            orders={byStatus.get(c.id) ?? []}
                            canDrop={canDrag && !c.terminal}
                        />
                    ))}
                </div>

                <DragOverlay>
                    {draggingOrder ? <OrderCard order={draggingOrder} dragging /> : null}
                </DragOverlay>
            </DndContext>
        </AdminLayout>
    );
}
