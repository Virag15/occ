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
import { nullable } from '@/lib/format';
import { SavedViewSwitcher } from '@/components/SavedViewSwitcher';
import { CapBanner } from '@/components/CapBanner';
import type { Customer, IndexPageProps, SavedView } from '@/types/entities';

const STATUSES = ['active', 'inactive', 'credit_hold', 'new'];
const TYPES = ['dealer', 'contractor', 'oem', 'end_user', 'government'];

export default function CustomerIndex({ rows, savedViews = [], total_count, cap }: IndexPageProps<Customer> & { savedViews?: SavedView[]; total_count?: number; cap?: number }) {
    // Apply the default saved view on first mount so the user lands in their preferred state.
    const defaultView = savedViews.find((v) => v.is_default) ?? null;
    const dc = (defaultView?.config ?? {}) as { search?: string; filters?: Record<string, string> };

    const [search, setSearch] = useState(dc.search ?? '');
    const [statusFilter, setStatusFilter] = useState(dc.filters?.status ?? '');
    const [typeFilter, setTypeFilter] = useState(dc.filters?.customer_type ?? '');
    const [activeViewId, setActiveViewId] = useState<number | null>(defaultView?.id ?? null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [processing, setProcessing] = useState(false);

    const currentConfig = {
        search: search || undefined,
        filters: {
            ...(statusFilter && { status: statusFilter }),
            ...(typeFilter && { customer_type: typeFilter }),
        },
    };

    const applyView = (config: { search?: string; filters?: Record<string, string> }, viewId: number | null) => {
        setSearch(config.search ?? '');
        setStatusFilter(config.filters?.status ?? '');
        setTypeFilter(config.filters?.customer_type ?? '');
        setActiveViewId(viewId);
    };

    const clearView = () => {
        setSearch(''); setStatusFilter(''); setTypeFilter('');
        setActiveViewId(null);
    };

    const filteredRows = useMemo(() => {
        let result = rows;
        if (search) {
            const q = search.toLowerCase();
            result = result.filter((r) =>
                r.name.toLowerCase().includes(q)
                || (r.company ?? '').toLowerCase().includes(q)
                || (r.gstin ?? '').toLowerCase().includes(q)
                || (r.phone ?? '').toLowerCase().includes(q)
                || (r.city ?? '').toLowerCase().includes(q),
            );
        }
        if (statusFilter) result = result.filter((r) => r.status === statusFilter);
        if (typeFilter) result = result.filter((r) => r.customer_type === typeFilter);
        return result;
    }, [search, statusFilter, typeFilter, rows]);

    const hasActiveFilters = !!search || !!statusFilter || !!typeFilter;
    const clearFilters = () => { setSearch(''); setStatusFilter(''); setTypeFilter(''); setActiveViewId(null); };

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
                    <Input placeholder="Search name, company, GSTIN…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={statusFilter || '_all'} onValueChange={(v: string) => setStatusFilter(v === '_all' ? '' : v)}>
                    <SelectTrigger className="w-[130px] shrink-0"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="_all">All statuses</SelectItem>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={typeFilter || '_all'} onValueChange={(v: string) => setTypeFilter(v === '_all' ? '' : v)}>
                    <SelectTrigger className="w-[130px] shrink-0"><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="_all">All types</SelectItem>
                        {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                </Select>
                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-destructive hover:text-destructive shrink-0">
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

            {total_count !== undefined && cap !== undefined && (
                <CapBanner shown={rows.length} total={total_count} cap={cap} entityLabel="customers" />
            )}
            <DataTable columns={columns} data={filteredRows} toolbar={toolbar} emptyMessage="No customers match the current filters." />

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
