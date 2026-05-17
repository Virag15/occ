import { Head, Link, router, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import {
    Truck, Camera, CheckCircle2, FileCheck, ChevronRight, Package, LayoutDashboard, LogOut, AlertOctagon, Clock,
} from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDateIN } from '@/lib/format';
import type { Order } from '@/types/entities';
import type { PageProps } from '@/types';

type Tab = 'dispatch' | 'pod' | 'triplicate';

export default function WarehouseQueue({
    awaiting_dispatch,
    pod_pending,
    triplicate_pending,
}: {
    awaiting_dispatch: Order[];
    pod_pending: Order[];
    triplicate_pending: Order[];
}) {
    const { auth } = usePage<PageProps>().props;
    const [tab, setTab] = useState<Tab>('dispatch');

    const tabs: { id: Tab; label: string; icon: typeof Truck; count: number; tone: string }[] = [
        { id: 'dispatch', label: 'Dispatch', icon: Truck, count: awaiting_dispatch.length, tone: 'text-amber-600' },
        { id: 'pod', label: 'POD', icon: Camera, count: pod_pending.length, tone: 'text-blue-600' },
        { id: 'triplicate', label: 'Triplicate', icon: FileCheck, count: triplicate_pending.length, tone: 'text-emerald-600' },
    ];

    const rows = tab === 'dispatch' ? awaiting_dispatch : tab === 'pod' ? pod_pending : triplicate_pending;

    return (
        <div className="flex min-h-svh flex-col bg-muted/30">
            <Head title="Warehouse queue" />

            {/* Top bar */}
            <header className="sticky top-0 z-10 border-b bg-card px-3 py-2 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold tracking-tight">Warehouse</p>
                        <p className="text-[10px] text-muted-foreground">Hi, {auth.user.name}</p>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                        <Link href={route('logout')} method="post" as="button">
                            <LogOut className="h-3.5 w-3.5" />
                        </Link>
                    </Button>
                </div>
            </header>

            {/* Tab switcher — segmented control */}
            <div className="sticky top-[44px] z-10 border-b bg-card px-3 py-2">
                <div className="grid grid-cols-3 gap-1.5 rounded-md bg-muted/50 p-1">
                    {tabs.map(({ id, label, icon: Icon, count, tone }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setTab(id)}
                            className={cn(
                                'flex flex-col items-center gap-0.5 rounded py-1.5 text-[10px] font-medium transition-colors',
                                tab === id ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <Icon className={cn('h-4 w-4', tab === id && tone)} />
                            <span>{label}</span>
                            <span className={cn('rounded-sm px-1 text-[9px] tabular-nums', tab === id ? 'bg-muted text-foreground' : 'text-muted-foreground')}>{count}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Card list */}
            <main className="flex-1 space-y-2 px-3 py-3">
                {rows.length === 0 ? (
                    <EmptyState tab={tab} />
                ) : (
                    rows.map((o) => <OrderCard key={o.id} order={o} tab={tab} />)
                )}
            </main>

            {/* Bottom nav — fixed, big targets */}
            <nav className="sticky bottom-0 z-10 border-t bg-card px-2 py-1.5">
                <div className="grid grid-cols-3 gap-1">
                    <BottomNavLink href={route('warehouse.queue')} icon={Package} label="Queue" active />
                    <BottomNavLink href={route('shipments.calendar')} icon={LayoutDashboard} label="Calendar" />
                    <BottomNavLink href={route('orders.kanban')} icon={Truck} label="Kanban" />
                </div>
            </nav>
        </div>
    );
}

function OrderCard({ order, tab }: { order: Order; tab: Tab }) {
    const ageDays = Math.max(0, Math.round((Date.now() - new Date(order.order_date).getTime()) / 86_400_000));
    const stale = ageDays > 7;

    return (
        <div className="rounded-lg border bg-card p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <Link href={route('orders.show', { order: order.id })} className="font-mono text-xs font-semibold hover:underline">
                        {order.order_code}
                    </Link>
                    <p className="truncate text-sm font-medium">{order.customer?.name ?? '—'}</p>
                    {order.customer?.company && <p className="truncate text-[10px] text-muted-foreground">{order.customer.company}</p>}
                </div>
                <div className="shrink-0 text-right">
                    {order.priority && order.priority !== 'normal' && (
                        <Badge variant="outline" className="text-[9px] uppercase">{order.priority}</Badge>
                    )}
                    {stale && <p className="mt-0.5 flex items-center justify-end gap-0.5 text-[9px] text-amber-600"><Clock className="h-2.5 w-2.5" />{ageDays}d</p>}
                </div>
            </div>

            <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground tabular-nums">
                <span>{formatDateIN(order.order_date)}</span>
                <span className="font-mono">{formatCurrency(order.order_value ?? 0)}</span>
            </div>

            {order.transporter && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                    <Truck className="mr-0.5 inline h-3 w-3" />
                    {order.transporter.name}
                    {order.lr_number && <span className="ml-2 font-mono">LR {order.lr_number}</span>}
                </p>
            )}

            <div className="mt-2.5 flex gap-1.5">
                {tab === 'dispatch' && <DispatchActions order={order} />}
                {tab === 'pod' && <CaptureButton order={order} kind="pod" label="Capture POD" tone="blue" />}
                {tab === 'triplicate' && <CaptureButton order={order} kind="triplicate" label="Capture triplicate" tone="emerald" />}

                <Button asChild variant="outline" size="sm" className="ml-auto">
                    <Link href={route('orders.show', { order: order.id })}>
                        Open <ChevronRight className="ml-0.5 h-3 w-3" />
                    </Link>
                </Button>
            </div>
        </div>
    );
}

function DispatchActions({ order }: { order: Order }) {
    const advance = (target: string) => {
        router.patch(route('orders.update-status', { order: order.id }), { status: target }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => toast.success(`${order.order_code} → ${target.replace(/_/g, ' ')}`),
            onError: (e) => toast.error(e.status ?? 'Could not advance status'),
        });
    };

    if (order.status === 'packed') {
        return (
            <Button size="sm" onClick={() => advance('ready_for_dispatch')} className="flex-1">
                <Truck className="mr-1 h-3.5 w-3.5" /> Mark ready
            </Button>
        );
    }
    if (order.status === 'ready_for_dispatch') {
        return (
            <Button size="sm" onClick={() => advance('dispatched')} className="flex-1">
                <Truck className="mr-1 h-3.5 w-3.5" /> Dispatched
            </Button>
        );
    }
    return null;
}

/** Camera-first capture button — clicking opens the OS camera UI on mobile thanks to capture=environment. */
function CaptureButton({ order, kind, label, tone }: { order: Order; kind: 'pod' | 'triplicate'; label: string; tone: 'blue' | 'emerald' }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);

    const handlePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setBusy(true);
        const fd = new FormData();
        fd.append('photo', file);
        router.post(route('orders.upload-evidence', { order: order.id, kind }), fd, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => toast.success(`${label.replace('Capture ', '')} uploaded · ${order.order_code}`),
            onError: (errs) => toast.error(Object.values(errs).join(', ') || 'Upload failed'),
            onFinish: () => {
                setBusy(false);
                if (inputRef.current) inputRef.current.value = '';
            },
        });
    };

    return (
        <>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePicked}
                className="hidden"
            />
            <Button
                size="sm"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
                className={cn(
                    'flex-1',
                    tone === 'blue' && 'bg-blue-600 hover:bg-blue-700',
                    tone === 'emerald' && 'bg-emerald-600 hover:bg-emerald-700',
                )}
            >
                <Camera className="mr-1 h-3.5 w-3.5" />
                {busy ? 'Uploading…' : label}
            </Button>
        </>
    );
}

function BottomNavLink({ href, icon: Icon, label, active = false }: { href: string; icon: typeof Truck; label: string; active?: boolean }) {
    return (
        <Link
            href={href}
            className={cn(
                'flex flex-col items-center gap-0.5 rounded py-1.5 text-[10px] font-medium',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
        >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
        </Link>
    );
}

function EmptyState({ tab }: { tab: Tab }) {
    const labels: Record<Tab, { icon: typeof Truck; title: string; sub: string }> = {
        dispatch: { icon: CheckCircle2, title: 'All caught up on dispatch', sub: 'No orders waiting to be sent out.' },
        pod: { icon: CheckCircle2, title: 'No PODs pending', sub: 'All dispatched orders have a POD already.' },
        triplicate: { icon: CheckCircle2, title: 'No triplicates pending', sub: 'All delivered orders have a signed triplicate.' },
    };
    const { icon: Icon, title, sub } = labels[tab];
    return (
        <div className="flex flex-col items-center gap-2 rounded-lg border bg-card px-4 py-10 text-center">
            <Icon className="h-8 w-8 text-emerald-500" />
            <p className="text-sm font-medium">{title}</p>
            <p className="text-[11px] text-muted-foreground">{sub}</p>
        </div>
    );
}
