import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import AdminLayout from '@/components/admin/AdminLayout';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
    Plus, Pencil, Trash2, Search, X, MoreHorizontal, Truck, MessageSquare, CheckCircle2, FileCheck, AlertOctagon, LayoutGrid,
} from 'lucide-react';
import { formatCurrency, formatDateIN } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Order, SavedView } from '@/types/entities';
import type { PageProps } from '@/types';
import { SavedViewSwitcher } from '@/components/SavedViewSwitcher';

const STATUSES = [
    'new_order', 'confirmed', 'stock_check', 'packing', 'packed',
    'ready_for_dispatch', 'dispatched', 'delivered', 'closed',
    'on_hold', 'cancelled',
];
const PAYMENT_STATUSES = ['not_due', 'pending', 'partial', 'paid', 'overdue'];
const PRIORITIES = ['urgent', 'high', 'normal', 'low'];

// Natural next steps in the workflow — surface these in the dropdown for one-click advancement
const NEXT_STATUSES: Record<string, string[]> = {
    new_order: ['confirmed', 'cancelled'],
    confirmed: ['stock_check', 'packing', 'on_hold'],
    stock_check: ['packing', 'on_hold'],
    packing: ['packed'],
    packed: ['ready_for_dispatch'],
    ready_for_dispatch: ['dispatched'],
    dispatched: ['delivered'],
    delivered: ['closed'],
    on_hold: ['confirmed', 'cancelled'],
    closed: [],
    cancelled: [],
};

function statusClasses(status: string): string {
    const map: Record<string, string> = {
        new_order: 'bg-muted text-foreground border-border',
        confirmed: 'bg-blue-500/10 text-blue-600 border-blue-200',
        stock_check: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
        packing: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
        packed: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
        ready_for_dispatch: 'bg-orange-500/10 text-orange-600 border-orange-200',
        dispatched: 'bg-orange-500/10 text-orange-600 border-orange-200',
        delivered: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
        closed: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
        on_hold: 'bg-muted text-muted-foreground border-border',
        cancelled: 'bg-red-500/10 text-red-600 border-red-200',
    };
    return cn('border', map[status] ?? 'bg-muted');
}

function paymentClasses(status: string): string {
    const map: Record<string, string> = {
        not_due: 'bg-muted text-muted-foreground border-border',
        pending: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
        partial: 'bg-orange-500/10 text-orange-600 border-orange-200',
        paid: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
        overdue: 'bg-red-500/10 text-red-600 border-red-200',
    };
    return cn('border', map[status] ?? 'bg-muted');
}

function daysBetween(iso: string | null | undefined): number | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const ms = Date.now() - d.getTime();
    return Math.floor(ms / 86400000);
}

function isPaymentOverdue(o: Order): boolean {
    if (o.payment_status === 'paid' || o.payment_status === 'not_due') return false;
    if (!o.payment_due_date) return false;
    return new Date(o.payment_due_date).getTime() < Date.now();
}

function etaLabel(o: Order): { text: string; tone: 'muted' | 'today' | 'late' | 'soon' } {
    if (!o.expected_delivery) return { text: '—', tone: 'muted' };
    const days = -1 * (daysBetween(o.expected_delivery) ?? 0); // future positive, past negative
    if (days === 0) return { text: `Today · ${formatDateIN(o.expected_delivery)}`, tone: 'today' };
    if (days < 0) return { text: `${Math.abs(days)}d late · ${formatDateIN(o.expected_delivery)}`, tone: 'late' };
    return { text: `+${days}d · ${formatDateIN(o.expected_delivery)}`, tone: 'soon' };
}

// ------- Inline editable text (used for LR, vehicle, invoice etc.) -------
function InlineText({
    value,
    placeholder,
    onSave,
    mono = false,
    width = 'w-32',
}: {
    value: string | null;
    placeholder: string;
    onSave: (v: string) => void;
    mono?: boolean;
    width?: string;
}) {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(value ?? '');

    useEffect(() => setVal(value ?? ''), [value]);

    const commit = () => {
        const trimmed = val.trim();
        const current = (value ?? '').trim();
        if (trimmed !== current) onSave(trimmed);
        setEditing(false);
    };

    if (editing) {
        return (
            <Input
                autoFocus
                value={val}
                onChange={(e) => setVal(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') commit();
                    if (e.key === 'Escape') { setVal(value ?? ''); setEditing(false); }
                }}
                className={cn('h-7 px-1.5 text-xs', mono && 'font-mono', width)}
            />
        );
    }

    return (
        <button
            type="button"
            onClick={() => setEditing(true)}
            className={cn(
                'inline-flex items-center rounded px-1 py-0.5 text-xs hover:bg-accent text-left',
                mono && 'font-mono',
            )}
        >
            {value
                ? value
                : <span className="text-muted-foreground italic">{placeholder}</span>}
        </button>
    );
}

// ------- Status pill that's a Popover -------
function StatusCell({ order, onChange }: { order: Order; onChange: (status: string) => void }) {
    const days = daysBetween(order.updated_at) ?? 0;
    return (
        <Popover>
            <PopoverTrigger asChild>
                <button type="button" className="inline-flex flex-col items-start gap-0.5 text-left">
                    <Badge className={statusClasses(order.status)}>{order.status.replace(/_/g, ' ')}</Badge>
                    {days > 0 && (
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                            {days}d in status
                        </span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 pb-1">Change status</div>
                <div className="grid gap-1">
                    {STATUSES.map((s) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => onChange(s)}
                            disabled={s === order.status}
                            className={cn(
                                'flex items-center rounded px-2 py-1 text-left text-xs hover:bg-accent disabled:opacity-50',
                                s === order.status && 'bg-accent',
                            )}
                        >
                            <Badge className={cn(statusClasses(s), 'mr-2 shrink-0')}>{s.replace(/_/g, ' ')}</Badge>
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}

// ------- Payment pill Popover -------
function PaymentCell({ order, onChange }: { order: Order; onChange: (status: string) => void }) {
    const overdue = isPaymentOverdue(order);
    return (
        <Popover>
            <PopoverTrigger asChild>
                <button type="button" className="inline-flex items-center gap-1 text-left">
                    <Badge className={paymentClasses(order.payment_status)}>{order.payment_status}</Badge>
                    {overdue && <span className="h-1.5 w-1.5 rounded-full bg-red-500" title="Overdue" />}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-2" align="start">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 pb-1">Payment</div>
                <Select value={order.payment_status} onValueChange={onChange}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {PAYMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
                {order.payment_due_date && (
                    <p className="text-[10px] text-muted-foreground px-2 pt-2">
                        Due {formatDateIN(order.payment_due_date)}
                    </p>
                )}
            </PopoverContent>
        </Popover>
    );
}

// ------- Flag chips (the action queues) -------
function FlagChips({ order }: { order: Order }) {
    const flags: { label: string; cls: string; key: string }[] = [];

    if (isPaymentOverdue(order)) {
        flags.push({ key: 'pay_overdue', label: 'Payment overdue', cls: 'bg-red-500/10 text-red-600 border border-red-200' });
    }
    if (['dispatched', 'delivered'].includes(order.status) && order.lr_number && !order.lr_shared_with_customer) {
        flags.push({ key: 'lr_share', label: 'Share LR', cls: 'bg-amber-500/10 text-amber-700 border border-amber-200' });
    }
    if (order.status === 'delivered' && !order.triplicate_received) {
        flags.push({ key: 'tri', label: 'Triplicate due', cls: 'bg-orange-500/10 text-orange-600 border border-orange-200' });
    }
    if (order.status === 'delivered' && !order.pod_received) {
        flags.push({ key: 'pod', label: 'POD due', cls: 'bg-orange-500/10 text-orange-600 border border-orange-200' });
    }
    if (['dispatched', 'ready_for_dispatch'].includes(order.status) && !order.lr_number) {
        flags.push({ key: 'lr_missing', label: 'LR missing', cls: 'bg-red-500/10 text-red-600 border border-red-200' });
    }

    if (flags.length === 0) return <span className="text-muted-foreground">—</span>;

    return (
        <div className="flex flex-wrap gap-1">
            {flags.map((f) => (
                <span key={f.key} className={cn('inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium', f.cls)}>
                    {f.label}
                </span>
            ))}
        </div>
    );
}

type ServerFilters = {
    q: string;
    status: string;
    payment_status: string;
    priority: string;
    per_page: number;
};

type Pagination = {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
};

// ------- Main page -------
export default function OrderIndex({
    rows,
    savedViews = [],
    transporters = [],
    filters,
    pagination,
}: {
    rows: Order[];
    savedViews?: SavedView[];
    transporters?: { id: number; name: string }[];
    filters: ServerFilters;
    pagination: Pagination;
}) {
    const { auth } = usePage<PageProps>().props;
    const canBulkEdit = auth.user.role === 'owner' || auth.user.role === 'manager';

    // Filters live in the URL — local state is purely the search-box draft
    // (debounced before pushing to URL) so typing stays responsive.
    const [searchDraft, setSearchDraft] = useState(filters.q);
    useEffect(() => setSearchDraft(filters.q), [filters.q]);

    const activeViewId = useMemo(() => {
        // A saved view is "active" when its config exactly matches the current URL filters.
        const current = {
            search: filters.q || undefined,
            status: filters.status || undefined,
            payment_status: filters.payment_status || undefined,
            priority: filters.priority || undefined,
        };
        const match = savedViews.find((v) => {
            const c = (v.config ?? {}) as { search?: string; filters?: Record<string, string> };
            return (c.search ?? undefined) === current.search
                && (c.filters?.status ?? undefined) === current.status
                && (c.filters?.payment_status ?? undefined) === current.payment_status
                && (c.filters?.priority ?? undefined) === current.priority;
        });
        return match?.id ?? null;
    }, [filters, savedViews]);

    const currentConfig = {
        search: filters.q || undefined,
        filters: {
            ...(filters.status && { status: filters.status }),
            ...(filters.payment_status && { payment_status: filters.payment_status }),
            ...(filters.priority && { priority: filters.priority }),
        },
    };

    /** Reload Orders Index with a new filter set. Empty values are dropped from the URL. */
    const navigateWith = (next: Partial<ServerFilters> & { page?: number }) => {
        const merged = {
            q: searchDraft,
            status: filters.status,
            payment_status: filters.payment_status,
            priority: filters.priority,
            per_page: filters.per_page,
            page: 1,
            ...next,
        };
        const params: Record<string, string | number> = {};
        for (const [k, v] of Object.entries(merged)) {
            if (v !== '' && v !== 0 && v !== null && v !== undefined) params[k] = v;
        }
        router.get(route('orders.index'), params, { preserveScroll: true, preserveState: true, replace: true });
    };

    // Debounce search-box draft → URL by 300ms so each keystroke doesn't fire a request
    useEffect(() => {
        if (searchDraft === filters.q) return;
        const t = setTimeout(() => navigateWith({ q: searchDraft, page: 1 }), 300);
        return () => clearTimeout(t);
    }, [searchDraft]); // eslint-disable-line react-hooks/exhaustive-deps

    // First-mount default-view: if the URL has no filters but the user has a default
    // saved view, push that view's filters into the URL so the page loads in their
    // preferred state. Runs at most once per landing.
    useEffect(() => {
        const noUrlFilters = !filters.q && !filters.status && !filters.payment_status && !filters.priority;
        const defaultView = savedViews.find((v) => v.is_default);
        if (!noUrlFilters || !defaultView) return;
        const c = (defaultView.config ?? {}) as { search?: string; filters?: Record<string, string> };
        applyView(c, defaultView.id);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const applyView = (config: { search?: string; filters?: Record<string, string> }, _viewId: number | null) => {
        // _viewId not used — active view is derived from URL match below.
        navigateWith({
            q: config.search ?? '',
            status: config.filters?.status ?? '',
            payment_status: config.filters?.payment_status ?? '',
            priority: config.filters?.priority ?? '',
            page: 1,
        });
    };

    const clearView = () => navigateWith({ q: '', status: '', payment_status: '', priority: '', page: 1 });

    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [processing, setProcessing] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [bulkProcessing, setBulkProcessing] = useState(false);

    const filteredRows = rows; // server already filtered

    const hasActiveFilters = !!filters.q || !!filters.status || !!filters.payment_status || !!filters.priority;
    const clearFilters = () => clearView();

    // ---- Mutations ----
    const changeStatus = (orderId: number, status: string) => {
        router.patch(route('orders.update-status', { order: orderId }), { status }, {
            preserveScroll: true,
            preserveState: true,
            only: ['rows'],
            onSuccess: () => toast.success(`Status → ${status.replace(/_/g, ' ')}`),
            onError: (errors) => toast.error(errors.status ?? 'Could not update status'),
        });
    };

    const quickPatch = (orderId: number, payload: Record<string, string | number | null>, successMsg?: string) => {
        router.patch(route('orders.quick-update', { order: orderId }), payload, {
            preserveScroll: true,
            preserveState: true,
            only: ['rows'],
            onSuccess: () => { if (successMsg) toast.success(successMsg); },
            onError: (errors) => toast.error(Object.values(errors).join(', ')),
        });
    };

    const toggleLrShared = (orderId: number) => {
        router.patch(route('orders.toggle-lr-shared', { order: orderId }), {}, {
            preserveScroll: true,
            preserveState: true,
            only: ['rows'],
            onSuccess: () => toast.success('LR share flag toggled'),
        });
    };

    const toggleTriplicate = (orderId: number) => {
        router.patch(route('orders.toggle-triplicate', { order: orderId }), {}, {
            preserveScroll: true,
            preserveState: true,
            only: ['rows'],
        });
    };

    const togglePod = (orderId: number) => {
        router.patch(route('orders.toggle-pod', { order: orderId }), {}, {
            preserveScroll: true,
            preserveState: true,
            only: ['rows'],
        });
    };

    const handleDelete = () => {
        if (!deleteId) return;
        setProcessing(true);
        router.delete(route('orders.destroy', { order: deleteId }), {
            preserveScroll: true,
            onSuccess: () => toast.success('Order deleted'),
            onFinish: () => { setDeleteId(null); setProcessing(false); },
        });
    };

    // Filtered ids — used by header checkbox + select-all
    const filteredIds = useMemo(() => new Set(filteredRows.map((r) => r.id)), [filteredRows]);
    const allFilteredSelected = filteredIds.size > 0 && [...filteredIds].every((id) => selectedIds.has(id));
    const someFilteredSelected = !allFilteredSelected && [...filteredIds].some((id) => selectedIds.has(id));

    const toggleRow = (id: number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleAllFiltered = () => {
        setSelectedIds((prev) => {
            if (allFilteredSelected) {
                const next = new Set(prev);
                filteredIds.forEach((id) => next.delete(id));
                return next;
            }
            return new Set([...prev, ...filteredIds]);
        });
    };

    const clearSelection = () => setSelectedIds(new Set());

    const bulkApply = (payload: { priority?: string; payment_status?: string; transporter_id?: number }, successMsg?: string) => {
        const order_ids = Array.from(selectedIds);
        if (order_ids.length === 0) return;
        setBulkProcessing(true);
        router.patch(route('orders.bulk-update'), { order_ids, ...payload }, {
            preserveScroll: true,
            preserveState: true,
            only: ['rows'],
            onSuccess: () => {
                toast.success(successMsg ?? `${order_ids.length} order${order_ids.length === 1 ? '' : 's'} updated`);
                clearSelection();
            },
            onError: (errs) => toast.error(Object.values(errs).join(', ')),
            onFinish: () => setBulkProcessing(false),
        });
    };

    const columns = useMemo((): ColumnDef<Order>[] => [
        ...(canBulkEdit ? [{
            id: '__select',
            header: () => (
                <Checkbox
                    checked={allFilteredSelected ? true : someFilteredSelected ? 'indeterminate' : false}
                    onCheckedChange={() => toggleAllFiltered()}
                    aria-label="Select all visible"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={selectedIds.has(row.original.id)}
                    onCheckedChange={() => toggleRow(row.original.id)}
                    aria-label={`Select ${row.original.order_code}`}
                />
            ),
            enableSorting: false,
        } as ColumnDef<Order>] : []),
        {
            accessorKey: 'order_code',
            header: ({ column }) => <SortableHeader column={column} title="Code" />,
            cell: ({ row }) => (
                <Link href={route('orders.show', { order: row.original.id })} className="flex flex-col group">
                    <span className="font-mono text-xs font-medium group-hover:underline">{row.original.order_code}</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{formatDateIN(row.original.order_date)}</span>
                </Link>
            ),
        },
        {
            id: 'customer',
            header: 'Customer',
            cell: ({ row }) => (
                <Link
                    href={route('orders.show', { order: row.original.id })}
                    className="flex flex-col min-w-0 group"
                >
                    <span className="font-medium truncate group-hover:underline">{row.original.customer?.name ?? '—'}</span>
                    {row.original.customer?.company && (
                        <span className="text-[10px] text-muted-foreground truncate">{row.original.customer.company}</span>
                    )}
                </Link>
            ),
        },
        {
            id: 'brands',
            header: 'Brands',
            cell: ({ row }) => {
                const brands = row.original.brands ?? [];
                if (brands.length === 0) return <span className="text-muted-foreground">—</span>;
                return (
                    <div className="flex flex-wrap gap-1">
                        {brands.map((b) => (
                            <Badge key={b} variant="secondary" className="text-[10px]">{b}</Badge>
                        ))}
                    </div>
                );
            },
        },
        {
            accessorKey: 'order_value',
            header: ({ column }) => <SortableHeader column={column} title="Value" />,
            cell: ({ row }) => <span className="tabular-nums">{formatCurrency(row.original.order_value)}</span>,
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => <StatusCell order={row.original} onChange={(s) => changeStatus(row.original.id, s)} />,
        },
        {
            accessorKey: 'payment_status',
            header: 'Payment',
            cell: ({ row }) => <PaymentCell order={row.original} onChange={(s) => quickPatch(row.original.id, { payment_status: s }, 'Payment status updated')} />,
        },
        {
            id: 'dispatch',
            header: 'Dispatch',
            cell: ({ row }) => (
                <div className="flex flex-col min-w-0">
                    <span className="text-xs text-muted-foreground truncate">{row.original.transporter?.name ?? <span className="italic">no transporter</span>}</span>
                    {row.original.lr_number ? (
                        <span className="font-mono text-xs">{row.original.lr_number}</span>
                    ) : (
                        <Link href={route('orders.show', { order: row.original.id })} className="text-xs text-muted-foreground hover:underline">
                            + add LR on a shipment
                        </Link>
                    )}
                </div>
            ),
        },
        {
            id: 'eta',
            header: 'ETA',
            cell: ({ row }) => {
                const e = etaLabel(row.original);
                const cls = {
                    muted: 'text-muted-foreground',
                    today: 'text-blue-600 font-medium',
                    late: 'text-red-600 font-medium',
                    soon: 'text-foreground',
                }[e.tone];
                return <span className={cn('text-xs tabular-nums', cls)}>{e.text}</span>;
            },
        },
        {
            id: 'flags',
            header: 'Flags',
            cell: ({ row }) => <FlagChips order={row.original} />,
        },
        {
            id: 'actions',
            header: () => <span className="sr-only">Actions</span>,
            cell: ({ row }) => {
                const o = row.original;
                const next = NEXT_STATUSES[o.status] ?? [];
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            {next.length > 0 && (
                                <>
                                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Advance status</DropdownMenuLabel>
                                    {next.map((s) => (
                                        <DropdownMenuItem key={s} onClick={() => changeStatus(o.id, s)}>
                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                            Mark {s.replace(/_/g, ' ')}
                                        </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuSeparator />
                                </>
                            )}
                            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Quick flags</DropdownMenuLabel>
                            {o.lr_shared_with_customer ? (
                                <DropdownMenuItem onClick={() => toggleLrShared(o.id)}>
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Unmark LR shared
                                </DropdownMenuItem>
                            ) : (
                                <DropdownMenuItem asChild>
                                    <Link href={route('orders.show', { order: o.id })}>
                                        <MessageSquare className="h-4 w-4 mr-2" />
                                        Share LR (capture number + photo)…
                                    </Link>
                                </DropdownMenuItem>
                            )}
                            {o.pod_received ? (
                                <DropdownMenuItem disabled>
                                    <FileCheck className="h-4 w-4 mr-2" />
                                    POD already received
                                </DropdownMenuItem>
                            ) : (
                                <DropdownMenuItem asChild>
                                    <Link href={route('orders.show', { order: o.id })}>
                                        <FileCheck className="h-4 w-4 mr-2" />
                                        Mark POD received…
                                    </Link>
                                </DropdownMenuItem>
                            )}
                            {o.triplicate_received ? (
                                <DropdownMenuItem disabled>
                                    <Truck className="h-4 w-4 mr-2" />
                                    Triplicate already received
                                </DropdownMenuItem>
                            ) : (
                                <DropdownMenuItem asChild>
                                    <Link href={route('orders.show', { order: o.id })}>
                                        <Truck className="h-4 w-4 mr-2" />
                                        Mark triplicate received…
                                    </Link>
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href={route('orders.edit', { order: o.id })}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit details
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteId(o.id)} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ], [selectedIds, allFilteredSelected, someFilteredSelected, canBulkEdit]);

    const toolbar = (
        <div className="flex flex-col gap-2 w-full sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-2 flex-1">
                <SavedViewSwitcher
                    databaseType="order"
                    views={savedViews}
                    activeViewId={activeViewId}
                    currentConfig={currentConfig}
                    onApplyView={applyView}
                    onClearView={clearView}
                />
                <div className="relative flex-1 sm:w-72 sm:flex-none">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search code, customer, LR, invoice…"
                        value={searchDraft}
                        onChange={(e) => setSearchDraft(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select
                    value={filters.status || '_all'}
                    onValueChange={(v: string) => navigateWith({ status: v === '_all' ? '' : v, page: 1 })}
                >
                    <SelectTrigger className="w-[160px] shrink-0"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="_all">All statuses</SelectItem>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select
                    value={filters.payment_status || '_all'}
                    onValueChange={(v: string) => navigateWith({ payment_status: v === '_all' ? '' : v, page: 1 })}
                >
                    <SelectTrigger className="w-[130px] shrink-0"><SelectValue placeholder="Payment" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="_all">All payments</SelectItem>
                        {PAYMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select
                    value={filters.priority || '_all'}
                    onValueChange={(v: string) => navigateWith({ priority: v === '_all' ? '' : v, page: 1 })}
                >
                    <SelectTrigger className="w-[120px] shrink-0"><SelectValue placeholder="Priority" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="_all">All priorities</SelectItem>
                        {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                </Select>
                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-destructive hover:text-destructive shrink-0">
                        <X className="h-4 w-4 mr-1" /> Reset
                    </Button>
                )}
            </div>
            <div className="flex items-center gap-2 sm:ml-auto">
                <Button asChild variant="outline">
                    <Link href={route('orders.kanban')}><LayoutGrid className="h-4 w-4 mr-1" /> Kanban</Link>
                </Button>
                <Button asChild>
                    <Link href={route('orders.create')}><Plus className="h-4 w-4 mr-1" /> New order</Link>
                </Button>
            </div>
        </div>
    );

    return (
        <AdminLayout breadcrumbs={[{ label: 'Orders' }]}>
            <Head title="Orders" />

            {canBulkEdit && selectedIds.size > 0 && (
                <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                    <span className="font-medium">
                        {selectedIds.size} selected
                    </span>
                    <span className="text-muted-foreground">·</span>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" disabled={bulkProcessing}>
                                Set priority…
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                Apply priority to {selectedIds.size}
                            </DropdownMenuLabel>
                            {PRIORITIES.map((p) => (
                                <DropdownMenuItem key={p} onClick={() => bulkApply({ priority: p })}>
                                    {p}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" disabled={bulkProcessing}>
                                Set payment…
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                Apply payment status to {selectedIds.size}
                            </DropdownMenuLabel>
                            {PAYMENT_STATUSES.map((p) => (
                                <DropdownMenuItem key={p} onClick={() => bulkApply({ payment_status: p })}>
                                    {p}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" disabled={bulkProcessing || transporters.length === 0}>
                                Assign transporter…
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="max-h-72 overflow-auto">
                            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                Set transporter on latest shipment ({selectedIds.size})
                            </DropdownMenuLabel>
                            {transporters.length === 0 && (
                                <DropdownMenuItem disabled>No active transporters</DropdownMenuItem>
                            )}
                            {transporters.map((t) => (
                                <DropdownMenuItem
                                    key={t.id}
                                    onClick={() => bulkApply({ transporter_id: t.id }, `Assigned ${t.name} to ${selectedIds.size} order(s)`)}
                                >
                                    {t.name}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button size="sm" variant="ghost" onClick={clearSelection} className="ml-auto">
                        <X className="h-3.5 w-3.5 mr-1" /> Clear
                    </Button>
                </div>
            )}

            <DataTable columns={columns} data={filteredRows} toolbar={toolbar} emptyMessage="No orders match the current filters." />

            {/* Server-side pagination footer — only renders when there's more than one page. */}
            {pagination.last_page > 1 && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <p className="text-muted-foreground tabular-nums">
                        Showing {pagination.from ?? 0}–{pagination.to ?? 0} of {pagination.total.toLocaleString('en-IN')}
                    </p>
                    <div className="flex items-center gap-1">
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={pagination.current_page <= 1}
                            onClick={() => navigateWith({ page: pagination.current_page - 1 })}
                        >
                            Prev
                        </Button>
                        <span className="px-2 tabular-nums text-muted-foreground">
                            Page {pagination.current_page} / {pagination.last_page}
                        </span>
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={pagination.current_page >= pagination.last_page}
                            onClick={() => navigateWith({ page: pagination.current_page + 1 })}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}

            <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete order</DialogTitle>
                        <DialogDescription>This will permanently delete the order and its audit history. Tally invoice references will not be touched.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={processing}>
                            {processing ? 'Deleting…' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Tiny legend at bottom for at-a-glance flags */}
            <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><AlertOctagon className="h-3 w-3" /> Flags surface action queues — tap the ⋯ menu on any row to resolve them.</span>
            </div>
        </AdminLayout>
    );
}
