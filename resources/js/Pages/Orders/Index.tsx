import { Head, Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import AdminLayout from '@/components/admin/AdminLayout';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import { formatCurrency, formatDateIN } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Order } from '@/types/entities';

const STATUSES = [
    'new_order', 'confirmed', 'stock_check', 'packing', 'packed',
    'ready_for_dispatch', 'dispatched', 'delivered', 'closed',
    'on_hold', 'cancelled',
];
const PAYMENT_STATUSES = ['not_due', 'pending', 'partial', 'paid', 'overdue'];
const PRIORITIES = ['urgent', 'high', 'normal', 'low'];

function statusBadge(status: string) {
    const cls: Record<string, string> = {
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
    return <Badge className={cn('border', cls[status] ?? 'bg-muted')}>{status.replace(/_/g, ' ')}</Badge>;
}

function paymentBadge(status: string) {
    const cls: Record<string, string> = {
        not_due: 'bg-muted text-muted-foreground border-border',
        pending: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
        partial: 'bg-orange-500/10 text-orange-600 border-orange-200',
        paid: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
        overdue: 'bg-red-500/10 text-red-600 border-red-200',
    };
    return <Badge className={cn('border', cls[status] ?? 'bg-muted')}>{status}</Badge>;
}

function priorityBadge(p: string) {
    if (p === 'urgent') return <Badge className="bg-red-500/10 text-red-600 border border-red-200">urgent</Badge>;
    if (p === 'high') return <Badge className="bg-orange-500/10 text-orange-600 border border-orange-200">high</Badge>;
    if (p === 'low') return <Badge variant="secondary">low</Badge>;
    return <span className="text-muted-foreground text-xs">normal</span>;
}

export default function OrderIndex({ rows }: { rows: Order[] }) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [paymentFilter, setPaymentFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [processing, setProcessing] = useState(false);

    const filteredRows = useMemo(() => {
        let result = rows;
        if (search) {
            const q = search.toLowerCase();
            result = result.filter((r) =>
                r.order_code.toLowerCase().includes(q)
                || (r.customer?.name ?? '').toLowerCase().includes(q)
                || (r.lr_number ?? '').toLowerCase().includes(q)
                || (r.invoice_number ?? '').toLowerCase().includes(q),
            );
        }
        if (statusFilter) result = result.filter((r) => r.status === statusFilter);
        if (paymentFilter) result = result.filter((r) => r.payment_status === paymentFilter);
        if (priorityFilter) result = result.filter((r) => r.priority === priorityFilter);
        return result;
    }, [search, statusFilter, paymentFilter, priorityFilter, rows]);

    const hasActiveFilters = !!search || !!statusFilter || !!paymentFilter || !!priorityFilter;
    const clearFilters = () => { setSearch(''); setStatusFilter(''); setPaymentFilter(''); setPriorityFilter(''); };

    const handleDelete = () => {
        if (!deleteId) return;
        setProcessing(true);
        router.delete(route('orders.destroy', { order: deleteId }), {
            preserveScroll: true,
            onSuccess: () => toast.success('Order deleted'),
            onFinish: () => { setDeleteId(null); setProcessing(false); },
        });
    };

    const columns = useMemo((): ColumnDef<Order>[] => [
        {
            accessorKey: 'order_code',
            header: ({ column }) => <SortableHeader column={column} title="Code" />,
            cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.order_code}</span>,
        },
        {
            id: 'customer',
            header: 'Customer',
            cell: ({ row }) => <span className="font-medium">{row.original.customer?.name ?? '—'}</span>,
        },
        {
            accessorKey: 'order_date',
            header: ({ column }) => <SortableHeader column={column} title="Order date" />,
            cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{formatDateIN(row.original.order_date)}</span>,
        },
        {
            accessorKey: 'order_value',
            header: ({ column }) => <SortableHeader column={column} title="Value" />,
            cell: ({ row }) => <span className="tabular-nums">{formatCurrency(row.original.order_value)}</span>,
        },
        { accessorKey: 'status', header: 'Status', cell: ({ row }) => statusBadge(row.original.status) },
        { accessorKey: 'payment_status', header: 'Payment', cell: ({ row }) => paymentBadge(row.original.payment_status) },
        { accessorKey: 'priority', header: 'Priority', cell: ({ row }) => priorityBadge(row.original.priority) },
        {
            id: 'transporter',
            header: 'Transporter',
            cell: ({ row }) => <span className="text-muted-foreground text-xs">{row.original.transporter?.name ?? '—'}</span>,
        },
        {
            accessorKey: 'lr_number',
            header: 'LR',
            cell: ({ row }) => row.original.lr_number ? <span className="font-mono text-xs">{row.original.lr_number}</span> : <span className="text-muted-foreground">—</span>,
        },
        {
            id: 'actions',
            header: () => <span className="sr-only">Actions</span>,
            cell: ({ row }) => (
                <div className="flex items-center gap-1">
                    <Button asChild variant="ghost" size="icon">
                        <Link href={route('orders.edit', { order: row.original.id })}>
                            <Pencil className="h-4 w-4" />
                        </Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.original.id)} className="text-destructive hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ], []);

    const toolbar = (
        <div className="flex flex-col gap-2 w-full sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative flex-1 sm:w-72 sm:flex-none">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search code, customer, LR, invoice…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={statusFilter || '_all'} onValueChange={(v: string) => setStatusFilter(v === '_all' ? '' : v)}>
                    <SelectTrigger className="w-[160px] shrink-0"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="_all">All statuses</SelectItem>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={paymentFilter || '_all'} onValueChange={(v: string) => setPaymentFilter(v === '_all' ? '' : v)}>
                    <SelectTrigger className="w-[130px] shrink-0"><SelectValue placeholder="Payment" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="_all">All payments</SelectItem>
                        {PAYMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={priorityFilter || '_all'} onValueChange={(v: string) => setPriorityFilter(v === '_all' ? '' : v)}>
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
            <Button asChild className="sm:ml-auto">
                <Link href={route('orders.create')}><Plus className="h-4 w-4 mr-1" /> New order</Link>
            </Button>
        </div>
    );

    return (
        <AdminLayout breadcrumbs={[{ label: 'Orders' }]}>
            <Head title="Orders" />

            <DataTable columns={columns} data={filteredRows} toolbar={toolbar} emptyMessage="No orders match the current filters." />

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
        </AdminLayout>
    );
}
