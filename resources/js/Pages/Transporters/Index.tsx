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
import type { Transporter } from '@/types/entities';

type ServerFilters = { q: string; status: string; per_page: number };
type Pagination = {
    total: number; per_page: number; current_page: number; last_page: number;
    from: number | null; to: number | null;
};

export default function TransporterIndex({
    rows,
    filters,
    pagination,
}: {
    rows: Transporter[];
    filters: ServerFilters;
    pagination: Pagination;
}) {
    const [searchDraft, setSearchDraft] = useState(filters.q);
    useEffect(() => setSearchDraft(filters.q), [filters.q]);

    const navigateWith = (next: Partial<ServerFilters> & { page?: number }) => {
        const merged = {
            q: searchDraft,
            status: filters.status,
            per_page: filters.per_page,
            page: 1,
            ...next,
        };
        const params: Record<string, string | number> = {};
        for (const [k, v] of Object.entries(merged)) {
            if (v !== '' && v !== 0 && v !== null && v !== undefined) params[k] = v;
        }
        router.get(route('transporters.index'), params, { preserveScroll: true, preserveState: true, replace: true });
    };

    useEffect(() => {
        if (searchDraft === filters.q) return;
        const t = setTimeout(() => navigateWith({ q: searchDraft, page: 1 }), 300);
        return () => clearTimeout(t);
    }, [searchDraft]); // eslint-disable-line react-hooks/exhaustive-deps

    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [processing, setProcessing] = useState(false);

    const hasActiveFilters = !!filters.q || !!filters.status;
    const clearFilters = () => navigateWith({ q: '', status: '', page: 1 });

    const handleDelete = () => {
        if (!deleteId) return;
        setProcessing(true);
        router.delete(route('transporters.destroy', { transporter: deleteId }), {
            preserveScroll: true,
            onSuccess: () => toast.success('Transporter deleted'),
            onFinish: () => { setDeleteId(null); setProcessing(false); },
        });
    };

    const columns = useMemo((): ColumnDef<Transporter>[] => [
        {
            accessorKey: 'name',
            header: ({ column }) => <SortableHeader column={column} title="Name" />,
            cell: ({ row }) => (
                <Link href={route('transporters.show', { transporter: row.original.id })} className="font-medium hover:underline">
                    {row.original.name}
                </Link>
            ),
        },
        { accessorKey: 'city', header: 'City', cell: ({ row }) => <span className="text-muted-foreground">{nullable(row.original.city)}</span> },
        { accessorKey: 'contact_person', header: 'Contact', cell: ({ row }) => <span className="text-muted-foreground">{nullable(row.original.contact_person)}</span> },
        {
            accessorKey: 'primary_phone',
            header: 'Phone',
            cell: ({ row }) => row.original.primary_phone
                ? <a href={`tel:${row.original.primary_phone}`} onClick={(e) => e.stopPropagation()} className="font-mono text-xs hover:underline">{row.original.primary_phone}</a>
                : <span className="text-muted-foreground">—</span>,
        },
        {
            accessorKey: 'avg_transit_days',
            header: ({ column }) => <SortableHeader column={column} title="Transit" />,
            cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{row.original.avg_transit_days ?? '—'}</span>,
        },
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
                        <Link href={route('transporters.edit', { transporter: row.original.id })}>
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
                    <Input
                        placeholder="Search name, contact, phone…"
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
                        <SelectItem value="_all">All</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                </Select>
                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-destructive hover:text-destructive shrink-0">
                        <X className="h-4 w-4 mr-1" /> Reset
                    </Button>
                )}
            </div>
            <Button asChild className="sm:ml-auto">
                <Link href={route('transporters.create')}><Plus className="h-4 w-4 mr-1" /> New transporter</Link>
            </Button>
        </div>
    );

    return (
        <AdminLayout breadcrumbs={[{ label: 'Transporters' }]}>
            <Head title="Transporters" />

            <DataTable columns={columns} data={rows} toolbar={toolbar} emptyMessage="No transporters match the current filters." />

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
                        <DialogTitle>Delete transporter</DialogTitle>
                        <DialogDescription>Are you sure? Orders that already reference this carrier keep the historical data.</DialogDescription>
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
