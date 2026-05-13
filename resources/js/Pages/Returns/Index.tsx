import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
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
import { SavedViewSwitcher } from '@/components/SavedViewSwitcher';
import type { ReturnCase, SavedView } from '@/types/entities';

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

type ServerFilters = { q: string; status: string; severity: string; per_page: number };
type Pagination = {
    total: number; per_page: number; current_page: number; last_page: number;
    from: number | null; to: number | null;
};

export default function ReturnsIndex({
    rows,
    savedViews = [],
    filters,
    pagination,
}: {
    rows: ReturnCase[];
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
                && (c.filters?.severity ?? undefined) === (filters.severity || undefined);
        });
        return match?.id ?? null;
    }, [filters, savedViews]);

    const currentConfig = {
        search: filters.q || undefined,
        filters: {
            ...(filters.status && { status: filters.status }),
            ...(filters.severity && { severity: filters.severity }),
        },
    };

    const navigateWith = (next: Partial<ServerFilters> & { page?: number }) => {
        const merged = {
            q: searchDraft,
            status: filters.status,
            severity: filters.severity,
            per_page: filters.per_page,
            page: 1,
            ...next,
        };
        const params: Record<string, string | number> = {};
        for (const [k, v] of Object.entries(merged)) {
            if (v !== '' && v !== 0 && v !== null && v !== undefined) params[k] = v;
        }
        router.get(route('returns.index'), params, { preserveScroll: true, preserveState: true, replace: true });
    };

    useEffect(() => {
        if (searchDraft === filters.q) return;
        const t = setTimeout(() => navigateWith({ q: searchDraft, page: 1 }), 300);
        return () => clearTimeout(t);
    }, [searchDraft]); // eslint-disable-line react-hooks/exhaustive-deps

    const applyView = (config: { search?: string; filters?: Record<string, string> }) => {
        navigateWith({
            q: config.search ?? '',
            status: config.filters?.status ?? '',
            severity: config.filters?.severity ?? '',
            page: 1,
        });
    };

    const clearView = () => navigateWith({ q: '', status: '', severity: '', page: 1 });

    useEffect(() => {
        const noUrlFilters = !filters.q && !filters.status && !filters.severity;
        const defaultView = savedViews.find((v) => v.is_default);
        if (!noUrlFilters || !defaultView) return;
        applyView((defaultView.config ?? {}) as { search?: string; filters?: Record<string, string> });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const hasActiveFilters = !!filters.q || !!filters.status || !!filters.severity;

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
                <SavedViewSwitcher
                    databaseType="return"
                    views={savedViews}
                    activeViewId={activeViewId}
                    currentConfig={currentConfig}
                    onApplyView={applyView}
                    onClearView={clearView}
                    allLabel="All returns"
                />
                <div className="relative flex-1 sm:w-72 sm:flex-none">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search case, title, customer, order…"
                        value={searchDraft}
                        onChange={(e) => setSearchDraft(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select
                    value={filters.status || '_all'}
                    onValueChange={(v: string) => navigateWith({ status: v === '_all' ? '' : v, page: 1 })}
                >
                    <SelectTrigger className="w-[160px] shrink-0"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="_all">All statuses</SelectItem>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select
                    value={filters.severity || '_all'}
                    onValueChange={(v: string) => navigateWith({ severity: v === '_all' ? '' : v, page: 1 })}
                >
                    <SelectTrigger className="w-[130px] shrink-0"><SelectValue placeholder="Severity" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="_all">All severities</SelectItem>
                        {SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearView} className="text-destructive hover:text-destructive shrink-0">
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
                data={rows}
                toolbar={toolbar}
                emptyMessage="No return cases match the current filters."
            />

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
        </AdminLayout>
    );
}
