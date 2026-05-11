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
import { formatCurrency, nullable } from '@/lib/format';
import type { IndexPageProps, Product } from '@/types/entities';

export default function ProductIndex({ rows }: IndexPageProps<Product>) {
    const [search, setSearch] = useState('');
    const [brandFilter, setBrandFilter] = useState('');
    const [activeFilter, setActiveFilter] = useState(''); // '', 'active', 'inactive'
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [processing, setProcessing] = useState(false);

    const brands = useMemo(() => {
        const set = new Set<string>();
        rows.forEach((r) => { if (r.brand) set.add(r.brand); });
        return Array.from(set).sort();
    }, [rows]);

    const filteredRows = useMemo(() => {
        let result = rows;
        if (search) {
            const q = search.toLowerCase();
            result = result.filter((r) =>
                r.name.toLowerCase().includes(q)
                || (r.sku ?? '').toLowerCase().includes(q)
                || (r.brand ?? '').toLowerCase().includes(q)
                || (r.hsn_code ?? '').toLowerCase().includes(q),
            );
        }
        if (brandFilter) result = result.filter((r) => r.brand === brandFilter);
        if (activeFilter === 'active') result = result.filter((r) => r.is_active);
        if (activeFilter === 'inactive') result = result.filter((r) => !r.is_active);
        return result;
    }, [search, brandFilter, activeFilter, rows]);

    const hasActiveFilters = !!search || !!brandFilter || !!activeFilter;
    const clearFilters = () => { setSearch(''); setBrandFilter(''); setActiveFilter(''); };

    const handleDelete = () => {
        if (!deleteId) return;
        setProcessing(true);
        router.delete(route('products.destroy', { product: deleteId }), {
            preserveScroll: true,
            onSuccess: () => toast.success('Product deleted (will sync to Tally)'),
            onFinish: () => { setDeleteId(null); setProcessing(false); },
        });
    };

    const columns = useMemo((): ColumnDef<Product>[] => [
        {
            accessorKey: 'name',
            header: ({ column }) => <SortableHeader column={column} title="Product" />,
            cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
        },
        { accessorKey: 'sku', header: 'SKU', cell: ({ row }) => row.original.sku ? <span className="font-mono text-xs">{row.original.sku}</span> : <span className="text-muted-foreground">—</span> },
        {
            accessorKey: 'brand',
            header: 'Brand',
            cell: ({ row }) => row.original.brand ? <Badge variant="secondary">{row.original.brand}</Badge> : <span className="text-muted-foreground">—</span>,
        },
        { accessorKey: 'unit', header: 'Unit', cell: ({ row }) => <span className="text-muted-foreground">{nullable(row.original.unit)}</span> },
        {
            accessorKey: 'mrp',
            header: ({ column }) => <SortableHeader column={column} title="MRP" />,
            cell: ({ row }) => <span className="tabular-nums">{formatCurrency(row.original.mrp)}</span>,
        },
        { accessorKey: 'default_sale_price', header: 'Sale price', cell: ({ row }) => <span className="tabular-nums">{formatCurrency(row.original.default_sale_price)}</span> },
        {
            accessorKey: 'gst_rate',
            header: 'GST',
            cell: ({ row }) => row.original.gst_rate ? <span className="tabular-nums text-muted-foreground">{row.original.gst_rate}%</span> : <span className="text-muted-foreground">—</span>,
        },
        {
            accessorKey: 'is_active',
            header: 'Status',
            cell: ({ row }) => <Badge variant={row.original.is_active ? 'default' : 'secondary'}>{row.original.is_active ? 'Active' : 'Inactive'}</Badge>,
        },
        {
            id: 'actions',
            header: () => <span className="sr-only">Actions</span>,
            cell: ({ row }) => (
                <div className="flex items-center gap-1">
                    <Button asChild variant="ghost" size="icon">
                        <Link href={route('products.edit', { product: row.original.id })}>
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
                    <Input placeholder="Search name, SKU, brand, HSN…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={brandFilter || '_all'} onValueChange={(v: string) => setBrandFilter(v === '_all' ? '' : v)}>
                    <SelectTrigger className="w-[140px] shrink-0"><SelectValue placeholder="Brand" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="_all">All brands</SelectItem>
                        {brands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={activeFilter || '_all'} onValueChange={(v: string) => setActiveFilter(v === '_all' ? '' : v)}>
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
                <Link href={route('products.create')}><Plus className="h-4 w-4 mr-1" /> New product</Link>
            </Button>
        </div>
    );

    return (
        <AdminLayout breadcrumbs={[{ label: 'Products' }]}>
            <Head title="Products" />

            <DataTable columns={columns} data={filteredRows} toolbar={toolbar} emptyMessage="No products match the current filters." />

            <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete product</DialogTitle>
                        <DialogDescription>Are you sure? This will also remove the product from Tally on the next sync.</DialogDescription>
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
