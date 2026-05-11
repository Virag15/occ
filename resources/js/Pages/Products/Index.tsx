import { Head, router } from '@inertiajs/react';
import { ColumnDef } from '@tanstack/react-table';
import AdminLayout from '@/components/admin/AdminLayout';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import type { IndexPageProps, Product } from '@/types/entities';
import { formatCurrency, formatDateIN, nullable } from '@/lib/format';

const columns: ColumnDef<Product>[] = [
    {
        accessorKey: 'name',
        header: ({ column }) => <SortableHeader column={column} title="Product" />,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
        accessorKey: 'sku',
        header: 'SKU',
        cell: ({ row }) => row.original.sku ? <span className="font-mono text-xs">{row.original.sku}</span> : '—',
    },
    {
        accessorKey: 'brand',
        header: 'Brand',
        cell: ({ row }) => row.original.brand
            ? <Badge variant="secondary" className="text-[10px]">{row.original.brand}</Badge>
            : '—',
    },
    { accessorKey: 'unit', header: 'Unit', cell: ({ row }) => nullable(row.original.unit) },
    {
        accessorKey: 'mrp',
        header: ({ column }) => <SortableHeader column={column} title="MRP" />,
        cell: ({ row }) => <span className="tabular-nums">{formatCurrency(row.original.mrp)}</span>,
    },
    {
        accessorKey: 'default_sale_price',
        header: 'Sale price',
        cell: ({ row }) => <span className="tabular-nums">{formatCurrency(row.original.default_sale_price)}</span>,
    },
    {
        accessorKey: 'gst_rate',
        header: 'GST %',
        cell: ({ row }) => row.original.gst_rate ? <span className="tabular-nums">{row.original.gst_rate}%</span> : '—',
    },
];

function DetailView({ product }: { product: Product }) {
    const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
        <div className="grid grid-cols-[140px_1fr] items-start gap-3 py-1.5 border-b border-border/40 last:border-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm">{value || <span className="text-muted-foreground/60">—</span>}</dd>
        </div>
    );

    const totalStock = product.stock_items?.reduce((acc, s) => acc + Number(s.qty_closing || 0), 0) ?? 0;

    return (
        <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="mb-4 flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>Read-only — data syncs from Tally. Last synced: {formatDateIN(product.tally_synced_at)}.</span>
            </div>

            <dl>
                <Row label="SKU" value={product.sku ? <span className="font-mono text-xs">{product.sku}</span> : null} />
                <Row label="Brand" value={product.brand ? <Badge variant="secondary" className="text-[10px]">{product.brand}</Badge> : null} />
                <Row label="Category" value={product.category} />
                <Row label="Description" value={product.description} />
                <Row label="HSN code" value={product.hsn_code ? <span className="font-mono text-xs">{product.hsn_code}</span> : null} />
                <Row label="Unit" value={product.unit} />
                <Row label="GST rate" value={product.gst_rate ? `${product.gst_rate}%` : null} />
                <Row label="MRP" value={formatCurrency(product.mrp)} />
                <Row label="Sale price" value={formatCurrency(product.default_sale_price)} />
                <Row label="Purchase price" value={formatCurrency(product.default_purchase_price)} />
                <Row label="Total closing stock" value={<span className="tabular-nums">{totalStock} {product.unit ?? ''}</span>} />
            </dl>

            {product.stock_items && product.stock_items.length > 0 && (
                <div className="mt-6">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Stock by godown</h3>
                    <div className="rounded-md border border-border">
                        <table className="w-full text-xs">
                            <thead className="bg-muted/40 text-muted-foreground">
                                <tr><th className="px-3 py-2 text-left">Godown</th><th className="px-3 py-2 text-right">Closing</th></tr>
                            </thead>
                            <tbody>
                                {product.stock_items.map((s) => (
                                    <tr key={s.id} className="border-t border-border/40">
                                        <td className="px-3 py-2">{s.godown_name}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{s.qty_closing}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ProductIndex({ rows, peek, filters }: IndexPageProps<Product>) {
    const openPeekRow = (p: Product) => {
        const url = new URL(window.location.href);
        url.searchParams.set('peek', String(p.id));
        router.visit(url.pathname + url.search, { preserveScroll: true, preserveState: true });
    };

    const closePeek = () => {
        const url = new URL(window.location.href);
        url.searchParams.delete('peek');
        router.visit(url.pathname + url.search, { preserveScroll: true, preserveState: true, replace: true });
    };

    const tableColumns: ColumnDef<Product>[] = columns.map((col, i) =>
        i === 0
            ? {
                ...col,
                cell: ({ row }) => (
                    <button
                        type="button"
                        onClick={() => openPeekRow(row.original)}
                        className="text-left font-medium hover:underline"
                    >
                        {row.original.name}
                    </button>
                ),
            }
            : col,
    );

    return (
        <AdminLayout breadcrumbs={[{ label: 'Products' }]}>
            <Head title="Products" />

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Products</h1>
                    <span className="text-xs text-muted-foreground hidden sm:inline">Synced from Tally</span>
                </div>

                <DataTable
                    columns={tableColumns}
                    data={rows}
                    searchKey="name"
                    searchPlaceholder="Search by name or SKU…"
                    emptyMessage="No products synced from Tally yet."
                />
            </div>

            <Sheet open={!!peek} onOpenChange={(o: boolean) => { if (!o) closePeek(); }}>
                <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
                    <SheetHeader className="border-b border-border px-6 py-4 shrink-0">
                        <SheetTitle>{peek?.name}</SheetTitle>
                    </SheetHeader>
                    {peek && <DetailView product={peek} />}
                </SheetContent>
            </Sheet>

            <span className="hidden">{filters.q}</span>
        </AdminLayout>
    );
}
