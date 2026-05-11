import { Head } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import AdminLayout from '@/components/admin/AdminLayout';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

type Entry = {
    id: number;
    user_id: number | null;
    user?: { id: number; name: string } | null;
    entity_type: string;
    entity_id: number;
    action: string;
    changes: Record<string, { from: unknown; to: unknown }> | null;
    created_at: string;
};

export default function AuditLogIndex({ rows }: { rows: Entry[] }) {
    const [search, setSearch] = useState('');
    const [entityFilter, setEntityFilter] = useState('');
    const [actionFilter, setActionFilter] = useState('');

    const entityTypes = useMemo(() => Array.from(new Set(rows.map((r) => r.entity_type))).sort(), [rows]);
    const actions = useMemo(() => Array.from(new Set(rows.map((r) => r.action))).sort(), [rows]);

    const filtered = useMemo(() => {
        let r = rows;
        if (search) {
            const q = search.toLowerCase();
            r = r.filter((e) =>
                e.entity_type.toLowerCase().includes(q)
                || e.action.toLowerCase().includes(q)
                || String(e.entity_id).includes(q)
                || (e.user?.name ?? '').toLowerCase().includes(q),
            );
        }
        if (entityFilter) r = r.filter((e) => e.entity_type === entityFilter);
        if (actionFilter) r = r.filter((e) => e.action === actionFilter);
        return r;
    }, [rows, search, entityFilter, actionFilter]);

    const columns: ColumnDef<Entry>[] = [
        {
            accessorKey: 'created_at',
            header: ({ column }) => <SortableHeader column={column} title="When" />,
            cell: ({ row }) => <span className="text-xs text-muted-foreground tabular-nums">{new Date(row.original.created_at).toLocaleString('en-IN')}</span>,
        },
        {
            id: 'user',
            header: 'Who',
            cell: ({ row }) => row.original.user?.name ? <span className="font-medium">{row.original.user.name}</span> : <span className="text-muted-foreground italic">system</span>,
        },
        { accessorKey: 'action', header: 'Action', cell: ({ row }) => <Badge variant="secondary">{row.original.action.replace(/_/g, ' ')}</Badge> },
        {
            id: 'entity',
            header: 'Entity',
            cell: ({ row }) => <span className="text-xs">{row.original.entity_type} <span className="font-mono text-muted-foreground">#{row.original.entity_id}</span></span>,
        },
        {
            id: 'changes',
            header: 'Changes',
            cell: ({ row }) => {
                const c = row.original.changes;
                if (!c) return <span className="text-muted-foreground">—</span>;
                return (
                    <div className="text-[11px] space-y-0.5">
                        {Object.entries(c).map(([k, v]) => (
                            <div key={k}>
                                <span className="text-muted-foreground">{k}:</span>{' '}
                                <span className="line-through text-muted-foreground">{String(v.from ?? '—')}</span>{' → '}
                                <span className="font-medium">{String(v.to ?? '—')}</span>
                            </div>
                        ))}
                    </div>
                );
            },
        },
    ];

    const toolbar = (
        <div className="flex flex-wrap items-center gap-2 w-full">
            <div className="relative flex-1 sm:w-72 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search user, action, entity ID…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={entityFilter || '_all'} onValueChange={(v: string) => setEntityFilter(v === '_all' ? '' : v)}>
                <SelectTrigger className="w-[140px] shrink-0"><SelectValue placeholder="Entity" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="_all">All entities</SelectItem>
                    {entityTypes.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={actionFilter || '_all'} onValueChange={(v: string) => setActionFilter(v === '_all' ? '' : v)}>
                <SelectTrigger className="w-[160px] shrink-0"><SelectValue placeholder="Action" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="_all">All actions</SelectItem>
                    {actions.map((a) => <SelectItem key={a} value={a}>{a.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
            </Select>
            {(search || entityFilter || actionFilter) && (
                <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setEntityFilter(''); setActionFilter(''); }} className="text-destructive hover:text-destructive shrink-0">
                    <X className="h-4 w-4 mr-1" /> Reset
                </Button>
            )}
        </div>
    );

    return (
        <AdminLayout breadcrumbs={[{ label: 'Activity log' }]}>
            <Head title="Activity log" />

            <DataTable columns={columns} data={filtered} toolbar={toolbar} emptyMessage="No matching activity." />
        </AdminLayout>
    );
}
