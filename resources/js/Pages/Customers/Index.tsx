import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import AdminLayout from '@/components/admin/AdminLayout';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Search, X } from '@/lib/icons';
import { nullable } from '@/lib/format';
import { SavedViewSwitcher } from '@/components/SavedViewSwitcher';
import type { Customer, SavedView } from '@/types/entities';

const STATUSES = ['active', 'inactive', 'credit_hold', 'new'];
const TYPES = ['dealer', 'contractor', 'oem', 'end_user', 'government'];

type ServerFilters = {
    q: string;
    status: string;
    customer_type: string;
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

export default function CustomerIndex({
    rows,
    savedViews = [],
    filters,
    pagination,
}: {
    rows: Customer[];
    savedViews?: SavedView[];
    filters: ServerFilters;
    pagination: Pagination;
}) {
    const [searchDraft, setSearchDraft] = useState(filters.q);
    useEffect(() => setSearchDraft(filters.q), [filters.q]);

    const activeViewId = useMemo(() => {
        const match = savedViews.find((v) => {
            const c = (v.config ?? {}) as { search?: string; filters?: Record<string, string> };
            return (c.search ?? undefined) === (filters.q || undefined)
                && (c.filters?.status ?? undefined) === (filters.status || undefined)
                && (c.filters?.customer_type ?? undefined) === (filters.customer_type || undefined);
        });
        return match?.id ?? null;
    }, [filters, savedViews]);

    const currentConfig = {
        search: filters.q || undefined,
        filters: {
            ...(filters.status && { status: filters.status }),
            ...(filters.customer_type && { customer_type: filters.customer_type }),
        },
    };

    const navigateWith = (next: Partial<ServerFilters> & { page?: number }) => {
        const merged = {
            q: searchDraft,
            status: filters.status,
            customer_type: filters.customer_type,
            per_page: filters.per_page,
            page: 1,
            ...next,
        };
        const params: Record<string, string | number> = {};
        for (const [k, v] of Object.entries(merged)) {
            if (v !== '' && v !== 0 && v !== null && v !== undefined) params[k] = v;
        }
        router.get(route('customers.index'), params, { preserveScroll: true, preserveState: true, replace: true });
    };

    // Debounced search-to-URL
    useEffect(() => {
        if (searchDraft === filters.q) return;
        const t = setTimeout(() => navigateWith({ q: searchDraft, page: 1 }), 300);
        return () => clearTimeout(t);
    }, [searchDraft]); // eslint-disable-line react-hooks/exhaustive-deps

    const applyView = (config: { search?: string; filters?: Record<string, string> }) => {
        navigateWith({
            q: config.search ?? '',
            status: config.filters?.status ?? '',
            customer_type: config.filters?.customer_type ?? '',
            page: 1,
        });
    };

    const clearView = () => navigateWith({ q: '', status: '', customer_type: '', page: 1 });

    // First-mount default view
    useEffect(() => {
        const noUrlFilters = !filters.q && !filters.status && !filters.customer_type;
        const defaultView = savedViews.find((v) => v.is_default);
        if (!noUrlFilters || !defaultView) return;
        applyView((defaultView.config ?? {}) as { search?: string; filters?: Record<string, string> });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [processing, setProcessing] = useState(false);

    const hasActiveFilters = !!filters.q || !!filters.status || !!filters.customer_type;

    const handleDelete = () => {
        if (!deleteId) return;
        setProcessing(true);
        router.delete(route('customers.destroy', { customer: deleteId }), {
            preserveScroll: true,
            onSuccess: () => toast.success('Customer deleted (will sync to Tally)'),
            onFinish: () => { setDeleteId(null); setProcessing(false); },
        });
    };

    const columns = useMemo((): ColumnDef<Customer>[] => [
        {
            accessorKey: 'name',
            header: ({ column }) => <SortableHeader column={column} title="Name" />,
            cell: ({ row }) => (
                <Link href={route('customers.show', { customer: row.original.id })} className="font-medium hover:underline">
                    {row.original.name}
                </Link>
            ),
        },
        { accessorKey: 'company', header: 'Company', cell: ({ row }) => <span className="text-muted-foreground">{nullable(row.original.company)}</span> },
        { accessorKey: 'city', header: 'City', cell: ({ row }) => <span className="text-muted-foreground">{nullable(row.original.city)}</span> },
        {
            accessorKey: 'customer_type',
            header: 'Type',
            cell: ({ row }) => row.original.customer_type
                ? <Badge variant="secondary">{row.original.customer_type}</Badge>
                : <span className="text-muted-foreground">—</span>,
        },
        {
            accessorKey: 'gstin',
            header: 'GSTIN',
            cell: ({ row }) => row.original.gstin
                ? <span className="font-mono text-xs">{row.original.gstin}</span>
                : <span className="text-muted-foreground">—</span>,
        },
        { accessorKey: 'payment_terms', header: 'Terms', cell: ({ row }) => <span className="text-muted-foreground">{nullable(row.original.payment_terms)}</span> },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => <Badge variant={row.original.status === 'active' ? 'default' : 'secondary'}>{row.original.status}</Badge>,
        },
        {
            id: 'actions',
            header: () => <span className="sr-only">Actions</span>,
            cell: ({ row }) => (
                <div className="flex items-center gap-1">
                    <Button asChild variant="ghost" size="icon">
                        <Link href={route('customers.edit', { customer: row.original.id })}>
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
                <SavedViewSwitcher
                    databaseType="customer"
                    views={savedViews}
                    activeViewId={activeViewId}
                    currentConfig={currentConfig}
                    onApplyView={applyView}
                    onClearView={clearView}
                    allLabel="All customers"
                />
                <div className="relative flex-1 sm:w-72 sm:flex-none">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search name, company, GSTIN…"
                        value={searchDraft}
                        onChange={(e) => setSearchDraft(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select
                    value={filters.status || '_all'}
                    onValueChange={(v: string) => navigateWith({ status: v === '_all' ? '' : v, page: 1 })}
                >
                    <SelectTrigger className="w-[130px] shrink-0"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="_all">All statuses</SelectItem>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select
                    value={filters.customer_type || '_all'}
                    onValueChange={(v: string) => navigateWith({ customer_type: v === '_all' ? '' : v, page: 1 })}
                >
                    <SelectTrigger className="w-[130px] shrink-0"><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="_all">All types</SelectItem>
                        {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                </Select>
                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearView} className="text-destructive hover:text-destructive shrink-0">
                        <X className="h-4 w-4 mr-1" /> Reset
                    </Button>
                )}
            </div>
            <Button asChild className="sm:ml-auto">
                <Link href={route('customers.create')}><Plus className="h-4 w-4 mr-1" /> New customer</Link>
            </Button>
        </div>
    );

    return (
        <AdminLayout breadcrumbs={[{ label: 'Customers' }]}>
            <Head title="Customers" />

            <DataTable columns={columns} data={rows} toolbar={toolbar} emptyMessage="No customers match the current filters." />

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
                        <DialogTitle>Delete customer</DialogTitle>
                        <DialogDescription>Are you sure? This will also remove the customer from Tally on the next sync.</DialogDescription>
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
