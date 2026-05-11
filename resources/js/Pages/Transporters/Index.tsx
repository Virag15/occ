import { Head, Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import AdminLayout from '@/components/admin/AdminLayout';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import { nullable } from '@/lib/format';
import type { IndexPageProps, Transporter } from '@/types/entities';

export default function TransporterIndex({ rows }: IndexPageProps<Transporter>) {
    const [search, setSearch] = useState('');
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [processing, setProcessing] = useState(false);

    const filteredRows = useMemo(() => {
        if (!search) return rows;
        const q = search.toLowerCase();
        return rows.filter((r) =>
            r.name.toLowerCase().includes(q)
            || (r.city ?? '').toLowerCase().includes(q)
            || (r.contact_person ?? '').toLowerCase().includes(q)
            || (r.primary_phone ?? '').toLowerCase().includes(q),
        );
    }, [search, rows]);

    const handleDelete = () => {
        if (!deleteId) return;
        setProcessing(true);
        router.delete(route('transporters.destroy', { transporter: deleteId }), {
            preserveScroll: true,
            onSuccess: () => toast.success('Transporter deleted'),
            onFinish: () => {
                setDeleteId(null);
                setProcessing(false);
            },
        });
    };

    const columns = useMemo((): ColumnDef<Transporter>[] => [
        {
            accessorKey: 'name',
            header: ({ column }) => <SortableHeader column={column} title="Name" />,
            cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
        },
        {
            accessorKey: 'city',
            header: 'City',
            cell: ({ row }) => <span className="text-muted-foreground">{nullable(row.original.city)}</span>,
        },
        {
            accessorKey: 'contact_person',
            header: 'Contact',
            cell: ({ row }) => <span className="text-muted-foreground">{nullable(row.original.contact_person)}</span>,
        },
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
            cell: ({ row }) => (
                <Badge variant={row.original.status === 'active' ? 'default' : 'secondary'}>
                    {row.original.status}
                </Badge>
            ),
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
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(row.original.id)}
                        className="text-destructive hover:text-red-700"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ], []);

    const toolbar = (
        <div className="flex flex-col gap-2 w-full sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 sm:w-72 sm:flex-none">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search name, city, contact, phone…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                {search && (
                    <Button variant="ghost" size="sm" onClick={() => setSearch('')} className="text-destructive hover:text-destructive shrink-0 hidden sm:flex">
                        <X className="h-4 w-4 mr-1" />
                        Reset
                    </Button>
                )}
            </div>
            <Button asChild className="sm:ml-auto">
                <Link href={route('transporters.create')}>
                    <Plus className="h-4 w-4 mr-1" /> New transporter
                </Link>
            </Button>
        </div>
    );

    return (
        <AdminLayout breadcrumbs={[{ label: 'Transporters' }]}>
            <Head title="Transporters" />

            <DataTable
                columns={columns}
                data={filteredRows}
                toolbar={toolbar}
                emptyMessage="No transporters yet. Add your first carrier."
            />

            <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete transporter</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this transporter? Orders that already reference it will keep the historical data, but this carrier won't be selectable for new orders.
                        </DialogDescription>
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
