import { Head, Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Search, X } from '@/lib/icons';
import AdminLayout from '@/components/admin/AdminLayout';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { formatCurrency, formatDateIN } from '@/lib/format';

type Row = {
    id: number;
    quotation_code: string;
    customer_name: string;
    customer_company: string | null;
    quotation_date: string;
    valid_until: string | null;
    status: string;
    total: string;
};

type Props = {
    rows: Row[];
    pagination: { total: number; current_page: number; last_page: number; from: number | null; to: number | null };
    filters: { q: string; status: string };
    statuses: string[];
};

const STATUS_VARIANT: Record<string, 'secondary' | 'default' | 'outline' | 'destructive'> = {
    draft: 'secondary',
    sent: 'default',
    accepted: 'default',
    rejected: 'destructive',
    expired: 'outline',
};

export default function QuotationsIndex({ rows, pagination, filters, statuses }: Props) {
    const [q, setQ] = useState(filters.q);

    const navigate = (next: Partial<{ q: string; status: string }>) => {
        const merged = { q, status: filters.status, ...next };
        const params: Record<string, string> = {};
        for (const [k, v] of Object.entries(merged)) if (v) params[k] = v;
        router.get('/quotations', params, { preserveState: true, preserveScroll: true, replace: true });
    };

    const columns = useMemo((): ColumnDef<Row>[] => [
        {
            accessorKey: 'quotation_code',
            header: ({ column }) => <SortableHeader column={column} title="Code" />,
            cell: ({ row }) => (
                <Link href={`/quotations/${row.original.id}`} className="font-mono font-medium hover:underline">
                    {row.original.quotation_code}
                </Link>
            ),
        },
        {
            accessorKey: 'customer_name',
            header: 'Customer',
            cell: ({ row }) => (
                <div className="min-w-0">
                    <div className="truncate font-medium">
                        {row.original.customer_company || row.original.customer_name}
                    </div>
                    {row.original.customer_company && (
                        <div className="truncate text-xs text-muted-foreground">{row.original.customer_name}</div>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'quotation_date',
            header: ({ column }) => <SortableHeader column={column} title="Date" />,
            cell: ({ row }) => formatDateIN(row.original.quotation_date),
        },
        {
            accessorKey: 'valid_until',
            header: 'Valid until',
            cell: ({ row }) => row.original.valid_until ? formatDateIN(row.original.valid_until) : <span className="text-muted-foreground">—</span>,
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => (
                <Badge variant={STATUS_VARIANT[row.original.status] ?? 'secondary'} className="capitalize">
                    {row.original.status}
                </Badge>
            ),
        },
        {
            accessorKey: 'total',
            header: ({ column }) => <SortableHeader column={column} title="Total" />,
            cell: ({ row }) => <span className="font-mono tabular-nums">{formatCurrency(Number(row.original.total))}</span>,
        },
    ], []);

    const toolbar = (
        <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && navigate({ q })}
                    placeholder="Search code or customer"
                    className="w-64 pl-8"
                />
            </div>
            <Select
                value={filters.status || 'all'}
                onValueChange={(v) => navigate({ status: v === 'all' ? '' : v })}
            >
                <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {statuses.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {(filters.q || filters.status) && (
                <Button variant="ghost" size="sm" onClick={() => { setQ(''); router.get('/quotations'); }}
                        className="text-destructive hover:text-destructive">
                    <X className="mr-1 h-4 w-4" /> Reset
                </Button>
            )}
            <Button asChild className="sm:ml-auto">
                <Link href="/quotations/create"><Plus className="mr-1 h-4 w-4" /> New quotation</Link>
            </Button>
        </div>
    );

    return (
        <AdminLayout breadcrumbs={[{ label: 'Quotations' }]}>
            <Head title="Quotations" />

            <DataTable
                columns={columns}
                data={rows}
                toolbar={toolbar}
                emptyMessage="No quotations yet. Create one — you don't need an order first."
            />

            {pagination.last_page > 1 && (
                <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                        {pagination.from}–{pagination.to} of {pagination.total}
                    </span>
                    <div className="flex gap-1">
                        <Button
                            variant="outline" size="sm"
                            disabled={pagination.current_page <= 1}
                            onClick={() => router.get('/quotations', { q: filters.q, status: filters.status, page: pagination.current_page - 1 }, { preserveScroll: true })}
                        >
                            Prev
                        </Button>
                        <Button
                            variant="outline" size="sm"
                            disabled={pagination.current_page >= pagination.last_page}
                            onClick={() => router.get('/quotations', { q: filters.q, status: filters.status, page: pagination.current_page + 1 }, { preserveScroll: true })}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
