import { Head, Link } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import AdminLayout from '@/components/admin/AdminLayout';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Search, X } from 'lucide-react';
import { formatCurrency, formatDateIN, nullable } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ReturnCase } from '@/types/entities';

const STATUSES = ['reported', 'under_inspection', 'resolved', 'rejected'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];

function statusBadgeClasses(s: string): string {
    const map: Record<string, string> = {
        reported: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
        under_inspection: 'bg-blue-500/10 text-blue-600 border-blue-200',
        resolved: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
        rejected: 'bg-red-500/10 text-red-600 border-red-200',
    };
    return cn('border', map[s] ?? 'bg-muted');
}

export default function ReturnsIndex({ rows }: { rows: ReturnCase[] }) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [severityFilter, setSeverityFilter] = useState('');

    const filteredRows = useMemo(() => {
        let result = rows;
        if (search) {
            const q = search.toLowerCase();
            result = result.filter((r) =>
                r.case_code.toLowerCase().includes(q)
                || (r.case_title ?? '').toLowerCase().includes(q)
                || (r.customer?.name ?? '').toLowerCase().includes(q)
                || (r.order?.order_code ?? '').toLowerCase().includes(q),
            );
        }
        if (statusFilter) result = result.filter((r) => r.case_status === statusFilter);
        if (severityFilter) result = result.filter((r) => r.severity === severityFilter);
        return result;
    }, [search, statusFilter, severityFilter, rows]);

    const hasActiveFilters = !!search || !!statusFilter || !!severityFilter;
    const clearFilters = () => { setSearch(''); setStatusFilter(''); setSeverityFilter(''); };

    const columns = useMemo((): ColumnDef<ReturnCase>[] => [
        {
            accessorKey: 'case_code',
            header: ({ column }) => <SortableHeader column={column} title="Case" />,
            cell: ({ row }) => (
                <Link href={route('returns.show', { return: row.original.id })} className="font-mono text-xs font-medium hover:underline">
                    {row.original.case_code}
                </Link>
            ),
        },
        {
            accessorKey: 'customer',
            header: 'Customer',
            cell: ({ row }) => <span>{row.original.customer?.name ?? '—'}</span>,
        },
        {
            id: 'order',
            header: 'Order',
            cell: ({ row }) => row.original.order
                ? <Link href={route('orders.show', { order: row.original.order.id })} className="font-mono text-xs hover:underline">{row.original.order.order_code}</Link>
                : <span className="text-muted-foreground">—</span>,
        },
        {
            accessorKey: 'date_reported',
            header: ({ column }) => <SortableHeader column={column} title="Reported" />,
            cell: ({ row }) => <span className="text-xs tabular-nums">{formatDateIN(row.original.date_reported)}</span>,
        },
        {
            accessorKey: 'severity',
            header: 'Severity',
            cell: ({ row }) => row.original.severity
                ? <Badge variant="outline">{row.original.severity}</Badge>
                : <span className="text-muted-foreground">—</span>,
        },
        {
            accessorKey: 'case_status',
            header: 'Status',
            cell: ({ row }) => <Badge className={statusBadgeClasses(row.original.case_status)}>{row.original.case_status.replace(/_/g, ' ')}</Badge>,
        },
        {
            accessorKey: 'value_at_risk',
            header: ({ column }) => <SortableHeader column={column} title="Value at risk" />,
            cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{formatCurrency(row.original.value_at_risk)}</span>,
        },
        {
            accessorKey: 'resolution_type',
            header: 'Resolution',
            cell: ({ row }) => row.original.resolution_type
                ? <Badge variant="secondary">{row.original.resolution_type.replace(/_/g, ' ')}</Badge>
                : <span className="text-muted-foreground">{nullable(null)}</span>,
        },
        {
            id: 'actions',
            header: () => <span className="sr-only">Actions</span>,
            cell: ({ row }) => (
                <Button asChild variant="ghost" size="sm">
                    <Link href={route('returns.show', { return: row.original.id })}>
                        View <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                </Button>
            ),
        },
    ], []);

    const toolbar = (
        <div className="flex flex-col gap-2 w-full sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative flex-1 sm:w-72 sm:flex-none">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search case, title, customer, order…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={statusFilter || '_all'} onValueChange={(v: string) => setStatusFilter(v === '_all' ? '' : v)}>
                    <SelectTrigger className="w-[160px] shrink-0"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="_all">All statuses</SelectItem>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={severityFilter || '_all'} onValueChange={(v: string) => setSeverityFilter(v === '_all' ? '' : v)}>
                    <SelectTrigger className="w-[130px] shrink-0"><SelectValue placeholder="Severity" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="_all">All severities</SelectItem>
                        {SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-destructive hover:text-destructive shrink-0">
                        <X className="h-4 w-4 mr-1" /> Reset
                    </Button>
                )}
            </div>
            <p className="text-xs text-muted-foreground sm:ml-auto">
                To report a return, open an order and click <span className="font-medium text-foreground">Report return</span>.
            </p>
        </div>
    );

    return (
        <AdminLayout breadcrumbs={[{ label: 'Returns & Damages' }]}>
            <Head title="Returns" />

            <DataTable
                columns={columns}
                data={filteredRows}
                toolbar={toolbar}
                emptyMessage="No return cases match the current filters."
            />
        </AdminLayout>
    );
}
