import { router } from '@inertiajs/react';
import { Plus, Search, MoreHorizontal } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { PropertyCell, PropertyType, PropertyValue } from '@/Components/notion/PropertyCell';
import type { BadgeColor } from '@/Components/ui/badge';
import { cn } from '@/lib/utils';

export type Column<T> = {
    key: string;
    label: string;
    type: PropertyType;
    width?: number;
    align?: 'left' | 'right' | 'center';
    badgeColor?: BadgeColor | ((row: T) => BadgeColor);
    accessor?: (row: T) => PropertyValue;
};

type DatabaseTableProps<T extends { id: number | string }> = {
    rows: T[];
    columns: Column<T>[];
    titleKey: string;
    onRowClick?: (row: T) => void;
    searchPlaceholder?: string;
    searchValue?: string;
    onSearch?: (q: string) => void;
    onCreate?: () => void;
    createLabel?: string;
    emptyState?: ReactNode;
    rowCount?: number;
};

export function DatabaseTable<T extends { id: number | string }>({
    rows,
    columns,
    titleKey,
    onRowClick,
    searchPlaceholder = 'Search…',
    searchValue,
    onSearch,
    onCreate,
    createLabel = 'New',
    emptyState,
    rowCount,
}: DatabaseTableProps<T>) {
    const [localSearch, setLocalSearch] = useState(searchValue ?? '');

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch?.(localSearch);
    };

    const visibleRowCount = rowCount ?? rows.length;

    return (
        <div className="flex h-full flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 px-6 py-3">
                <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2">
                    <div className="relative max-w-xs flex-1">
                        <Search
                            className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-muted-foreground)]"
                            strokeWidth={1.75}
                        />
                        <Input
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="pl-7"
                        />
                    </div>
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                        {visibleRowCount} {visibleRowCount === 1 ? 'row' : 'rows'}
                    </span>
                </form>

                <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="icon" aria-label="More options">
                        <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
                    </Button>
                    {onCreate && (
                        <Button size="sm" onClick={onCreate}>
                            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                            {createLabel}
                        </Button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                {rows.length === 0 ? (
                    <div className="flex h-full items-center justify-center p-12 text-center">
                        {emptyState ?? (
                            <div className="text-[var(--color-muted-foreground)]">
                                <p>No records yet.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 z-10 bg-[var(--color-background)]">
                            <tr className="border-b text-[var(--color-muted-foreground)]">
                                {columns.map((col) => (
                                    <th
                                        key={col.key}
                                        className={cn(
                                            'px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider',
                                            col.align === 'right' && 'text-right',
                                            col.align === 'center' && 'text-center',
                                        )}
                                        style={col.width ? { width: col.width } : undefined}
                                    >
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr
                                    key={row.id}
                                    onClick={() => onRowClick?.(row)}
                                    className={cn(
                                        'border-b border-[var(--color-border)]/60 transition-colors',
                                        onRowClick && 'cursor-pointer hover:bg-[var(--color-accent)]/50',
                                    )}
                                >
                                    {columns.map((col) => {
                                        const isTitle = col.key === titleKey;
                                        const raw = col.accessor
                                            ? col.accessor(row)
                                            : ((row as unknown as Record<string, PropertyValue>)[col.key]);
                                        const badgeColor =
                                            typeof col.badgeColor === 'function' ? col.badgeColor(row) : col.badgeColor;
                                        return (
                                            <td
                                                key={col.key}
                                                className={cn(
                                                    'whitespace-nowrap px-3 py-1.5',
                                                    isTitle && 'font-medium text-[var(--color-foreground)]',
                                                    col.align === 'right' && 'text-right',
                                                    col.align === 'center' && 'text-center',
                                                )}
                                            >
                                                <PropertyCell
                                                    type={col.type}
                                                    value={raw}
                                                    badgeColor={badgeColor}
                                                />
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export function openPeek(id: number | string) {
    const url = new URL(window.location.href);
    url.searchParams.set('peek', String(id));
    router.visit(url.pathname + url.search, {
        preserveScroll: true,
        preserveState: true,
        only: ['peek'],
    });
}

export function closePeek() {
    const url = new URL(window.location.href);
    url.searchParams.delete('peek');
    router.visit(url.pathname + url.search, {
        preserveScroll: true,
        preserveState: true,
        only: ['peek'],
    });
}
