import * as React from 'react';
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    Column,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';

interface ServerPagination {
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
    links: { label: string; url: string | null; active: boolean }[];
}

interface DataTableProps<TData> {
    columns: ColumnDef<TData>[];
    data: TData[];
    searchKey?: string;
    searchPlaceholder?: string;
    toolbar?: React.ReactNode;
    serverPagination?: ServerPagination;
    emptyMessage?: string;
}

interface SortableHeaderProps<TData> {
    column: Column<TData>;
    title: string;
}

function useIsMobile(breakpoint = 768): boolean {
    const [isMobile, setIsMobile] = React.useState(() =>
        typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
    );
    React.useEffect(() => {
        const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
        setIsMobile(mq.matches);
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [breakpoint]);
    return isMobile;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getColumnLabel(columnDef: any): string | null {
    if (columnDef.id === 'actions') return null;
    if (typeof columnDef.header === 'string') return columnDef.header;
    const key = columnDef.accessorKey || columnDef.id || '';
    if (!key) return null;
    return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
}

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | 'ellipsis')[] = [1];
    if (current > 3) pages.push('ellipsis');
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 2) pages.push('ellipsis');
    pages.push(total);
    return pages;
}

export function DataTable<TData>({
    columns,
    data,
    searchKey,
    searchPlaceholder = 'Search...',
    toolbar,
    serverPagination,
    emptyMessage = 'No results.',
}: DataTableProps<TData>) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const isMobile = useIsMobile();

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        ...(serverPagination ? {} : { getPaginationRowModel: getPaginationRowModel() }),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        state: { sorting, columnFilters },
    });

    const searchValue = searchKey
        ? (table.getColumn(searchKey)?.getFilterValue() as string) ?? ''
        : '';

    const clearSearch = () => {
        if (searchKey) table.getColumn(searchKey)?.setFilterValue('');
    };

    const clientCurrentPage = table.getState().pagination.pageIndex + 1;
    const clientTotalPages = table.getPageCount();
    const clientPageNumbers = getPageNumbers(clientCurrentPage, clientTotalPages);

    const serverPageNumbers = serverPagination
        ? getPageNumbers(serverPagination.current_page, serverPagination.last_page)
        : [];

    const useServerPagination = !!serverPagination;
    const showPagination = useServerPagination
        ? serverPagination.last_page > 1
        : clientTotalPages > 1;

    const renderMobileCards = () => {
        const rows = table.getRowModel().rows;
        if (!rows?.length) {
            return (
                <div className="rounded-lg border border-border p-8 text-center text-muted-foreground">
                    {emptyMessage}
                </div>
            );
        }

        return (
            <div className="space-y-3">
                {rows.map((row) => {
                    const cells = row.getVisibleCells();
                    const actionCell = cells.find((c) => c.column.id === 'actions');
                    const dataCells = cells.filter((c) => c.column.id !== 'actions');
                    const primaryCell = dataCells[0];
                    const secondaryCells = dataCells.slice(1);

                    return (
                        <div key={row.id} className="rounded-lg border border-border bg-card p-4">
                            {primaryCell && (
                                <div className="text-sm font-medium text-foreground mb-2">
                                    {flexRender(primaryCell.column.columnDef.cell, primaryCell.getContext())}
                                </div>
                            )}
                            {secondaryCells.length > 0 && (
                                <div className="space-y-1.5 text-sm">
                                    {secondaryCells.map((cell) => {
                                        const label = getColumnLabel(cell.column.columnDef);
                                        if (!label) return null;
                                        return (
                                            <div key={cell.id} className="flex items-start justify-between gap-3">
                                                <span className="text-muted-foreground text-xs shrink-0">{label}</span>
                                                <span className="text-right">
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {actionCell && (
                                <div className="mt-3 pt-3 border-t border-border flex justify-end gap-1">
                                    {flexRender(actionCell.column.columnDef.cell, actionCell.getContext())}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderPagination = () => {
        if (!useServerPagination && !showPagination) return null;

        return (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3">
                <p className="text-xs sm:text-sm text-muted-foreground">
                    {useServerPagination
                        ? `${serverPagination.from ?? 0}\u2013${serverPagination.to ?? 0} of ${serverPagination.total}`
                        : `${table.getFilteredRowModel().rows.length} row(s)`}
                </p>
                {showPagination && (
                    <Pagination className="w-auto mx-0">
                        <PaginationContent>
                            {useServerPagination ? (
                                <>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                // no-op in static mode
                                            }}
                                            aria-disabled={!serverPagination.prev_page_url}
                                            className={!serverPagination.prev_page_url ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                        />
                                    </PaginationItem>
                                    {!isMobile && serverPageNumbers.map((page, i) =>
                                        page === 'ellipsis' ? (
                                            <PaginationItem key={`e-${i}`}>
                                                <PaginationEllipsis />
                                            </PaginationItem>
                                        ) : (
                                            <PaginationItem key={page}>
                                                <PaginationLink
                                                    href="#"
                                                    isActive={page === serverPagination.current_page}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        if (page !== serverPagination.current_page) {
                                                            // no-op in static mode
                                                        }
                                                    }}
                                                >
                                                    {page}
                                                </PaginationLink>
                                            </PaginationItem>
                                        )
                                    )}
                                    {isMobile && (
                                        <PaginationItem>
                                            <span className="px-2 text-xs text-muted-foreground">
                                                {serverPagination.current_page} / {serverPagination.last_page}
                                            </span>
                                        </PaginationItem>
                                    )}
                                    <PaginationItem>
                                        <PaginationNext
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                // no-op in static mode
                                            }}
                                            aria-disabled={!serverPagination.next_page_url}
                                            className={!serverPagination.next_page_url ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                        />
                                    </PaginationItem>
                                </>
                            ) : (
                                <>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href="#"
                                            onClick={(e) => { e.preventDefault(); table.previousPage(); }}
                                            aria-disabled={!table.getCanPreviousPage()}
                                            className={!table.getCanPreviousPage() ? 'pointer-events-none opacity-50' : ''}
                                        />
                                    </PaginationItem>
                                    {!isMobile && clientPageNumbers.map((page, i) =>
                                        page === 'ellipsis' ? (
                                            <PaginationItem key={`e-${i}`}>
                                                <PaginationEllipsis />
                                            </PaginationItem>
                                        ) : (
                                            <PaginationItem key={page}>
                                                <PaginationLink
                                                    href="#"
                                                    isActive={page === clientCurrentPage}
                                                    onClick={(e) => { e.preventDefault(); table.setPageIndex(page - 1); }}
                                                >
                                                    {page}
                                                </PaginationLink>
                                            </PaginationItem>
                                        )
                                    )}
                                    {isMobile && (
                                        <PaginationItem>
                                            <span className="px-2 text-xs text-muted-foreground">
                                                {clientCurrentPage} / {clientTotalPages}
                                            </span>
                                        </PaginationItem>
                                    )}
                                    <PaginationItem>
                                        <PaginationNext
                                            href="#"
                                            onClick={(e) => { e.preventDefault(); table.nextPage(); }}
                                            aria-disabled={!table.getCanNextPage()}
                                            className={!table.getCanNextPage() ? 'pointer-events-none opacity-50' : ''}
                                        />
                                    </PaginationItem>
                                </>
                            )}
                        </PaginationContent>
                    </Pagination>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-3">
            {(searchKey || toolbar) && (
                <div className="flex flex-wrap items-center gap-2">
                    {searchKey && (
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={searchPlaceholder}
                                value={searchValue}
                                onChange={(e) => table.getColumn(searchKey)?.setFilterValue(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    )}
                    {searchValue && (
                        <Button variant="ghost" size="sm" onClick={clearSearch} className="text-destructive hover:text-destructive">
                            <X className="h-3 w-3 mr-1" /> Clear
                        </Button>
                    )}
                    {toolbar}
                </div>
            )}

            {isMobile ? (
                <div>
                    {renderMobileCards()}
                    {renderPagination()}
                </div>
            ) : (
                <div className="flex flex-col rounded-lg border border-border overflow-hidden">
                    <div className="flex-1 min-h-0 overflow-auto">
                        <Table>
                            <TableHeader>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <TableHead key={header.id}>
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(header.column.columnDef.header, header.getContext())}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {table.getRowModel().rows?.length ? (
                                    table.getRowModel().rows.map((row) => (
                                        <TableRow key={row.id}>
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell key={cell.id}>
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                                            {emptyMessage}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    {renderPagination()}
                </div>
            )}
        </div>
    );
}

export function SortableHeader<TData>({ column, title }: SortableHeaderProps<TData>) {
    return (
        <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
            {title}
            <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
    );
}
