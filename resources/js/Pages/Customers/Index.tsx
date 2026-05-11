import { Head, router } from '@inertiajs/react';
import { ColumnDef } from '@tanstack/react-table';
import AdminLayout from '@/components/admin/AdminLayout';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import type { Customer, IndexPageProps } from '@/types/entities';
import { formatCurrency, formatDateIN, nullable } from '@/lib/format';

function statusBadge(status: string) {
    const map: Record<string, string> = {
        active: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
        credit_hold: 'bg-red-500/10 text-red-600 border-red-200',
        new: 'bg-blue-500/10 text-blue-600 border-blue-200',
    };
    const cls = map[status] || 'bg-muted text-muted-foreground border-border';
    return <Badge className={cls}>{status}</Badge>;
}

function typeBadge(type: string | null) {
    if (!type) return <span className="text-muted-foreground/60">—</span>;
    const map: Record<string, string> = {
        dealer: 'bg-blue-500/10 text-blue-600 border-blue-200',
        contractor: 'bg-purple-500/10 text-purple-600 border-purple-200',
        oem: 'bg-orange-500/10 text-orange-600 border-orange-200',
        government: 'bg-amber-700/10 text-amber-700 border-amber-200',
        end_user: 'bg-muted text-muted-foreground border-border',
    };
    return <Badge className={map[type] || 'bg-muted'}>{type}</Badge>;
}

const columns: ColumnDef<Customer>[] = [
    {
        accessorKey: 'name',
        header: ({ column }) => <SortableHeader column={column} title="Name" />,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    { accessorKey: 'company', header: 'Company', cell: ({ row }) => nullable(row.original.company) },
    { accessorKey: 'city', header: 'City', cell: ({ row }) => nullable(row.original.city) },
    { accessorKey: 'customer_type', header: 'Type', cell: ({ row }) => typeBadge(row.original.customer_type) },
    {
        accessorKey: 'gstin',
        header: 'GSTIN',
        cell: ({ row }) => row.original.gstin ? <span className="font-mono text-xs">{row.original.gstin}</span> : '—',
    },
    { accessorKey: 'payment_terms', header: 'Terms', cell: ({ row }) => nullable(row.original.payment_terms) },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => statusBadge(row.original.status) },
];

function DetailView({ customer }: { customer: Customer }) {
    const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
        <div className="grid grid-cols-[140px_1fr] items-start gap-3 py-1.5 border-b border-border/40 last:border-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm">{value || <span className="text-muted-foreground/60">—</span>}</dd>
        </div>
    );

    return (
        <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="mb-4 flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>Read-only — data syncs from Tally. Last synced: {formatDateIN(customer.tally_synced_at)}.</span>
            </div>

            <dl>
                <Row label="Code" value={<span className="font-mono text-xs">{customer.customer_code}</span>} />
                <Row label="Company" value={customer.company} />
                <Row label="Type" value={typeBadge(customer.customer_type)} />
                <Row label="Status" value={statusBadge(customer.status)} />
                <Row label="Contact person" value={customer.contact_person} />
                <Row label="Phone" value={customer.phone ? <a href={`tel:${customer.phone}`} className="font-mono text-xs hover:underline">{customer.phone}</a> : null} />
                <Row label="WhatsApp" value={customer.whatsapp} />
                <Row label="Email" value={customer.email ? <a href={`mailto:${customer.email}`} className="hover:underline">{customer.email}</a> : null} />
                <Row label="Billing address" value={customer.billing_address} />
                <Row label="Delivery address" value={customer.delivery_address} />
                <Row label="City" value={customer.city} />
                <Row label="State" value={customer.state} />
                <Row label="GSTIN" value={customer.gstin ? <span className="font-mono text-xs">{customer.gstin}</span> : null} />
                <Row label="Payment terms" value={customer.payment_terms} />
                <Row label="Credit limit" value={formatCurrency(customer.credit_limit)} />
                <Row label="Brand preferences" value={customer.brand_preferences?.length
                    ? <div className="flex flex-wrap gap-1">{customer.brand_preferences.map((b) => <Badge key={b} variant="secondary" className="text-[10px]">{b}</Badge>)}</div>
                    : null} />
                <Row label="Notes" value={customer.notes} />
            </dl>
        </div>
    );
}

export default function CustomerIndex({ rows, peek, filters }: IndexPageProps<Customer>) {
    const openPeekRow = (c: Customer) => {
        const url = new URL(window.location.href);
        url.searchParams.set('peek', String(c.id));
        router.visit(url.pathname + url.search, { preserveScroll: true, preserveState: true });
    };

    const closePeek = () => {
        const url = new URL(window.location.href);
        url.searchParams.delete('peek');
        router.visit(url.pathname + url.search, { preserveScroll: true, preserveState: true, replace: true });
    };

    const tableColumns: ColumnDef<Customer>[] = columns.map((col, i) =>
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
        <AdminLayout breadcrumbs={[{ label: 'Customers' }]}>
            <Head title="Customers" />

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Customers</h1>
                    <span className="text-xs text-muted-foreground hidden sm:inline">Synced from Tally</span>
                </div>

                <DataTable
                    columns={tableColumns}
                    data={rows}
                    searchKey="name"
                    searchPlaceholder="Search by name…"
                    emptyMessage="No customers synced from Tally yet."
                />
            </div>

            <Sheet open={!!peek} onOpenChange={(o: boolean) => { if (!o) closePeek(); }}>
                <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
                    <SheetHeader className="border-b border-border px-6 py-4 shrink-0">
                        <SheetTitle>{peek?.name}</SheetTitle>
                    </SheetHeader>
                    {peek && <DetailView customer={peek} />}
                </SheetContent>
            </Sheet>

            <span className="hidden">{filters.q}</span>
        </AdminLayout>
    );
}
