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
import { Plus, Pencil, Trash2, Search, X } from '@/lib/icons';
import { formatDateIN } from '@/lib/format';

type Row = { id: number; name: string; email: string; role: string; created_at: string };

const ROLES = ['owner', 'manager', 'accounts', 'warehouse', 'viewer'];

function roleBadge(role: string) {
    const map: Record<string, string> = {
        owner: 'bg-red-500/10 text-red-600 border-red-200',
        manager: 'bg-blue-500/10 text-blue-600 border-blue-200',
        accounts: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
        warehouse: 'bg-amber-500/10 text-amber-700 border-amber-200',
        viewer: 'bg-muted text-muted-foreground border-border',
    };
    return <Badge className={`border ${map[role] ?? 'bg-muted'}`}>{role}</Badge>;
}

export default function UsersIndex({ rows }: { rows: Row[] }) {
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [processing, setProcessing] = useState(false);

    const filtered = useMemo(() => {
        let r = rows;
        if (search) {
            const q = search.toLowerCase();
            r = r.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
        }
        if (roleFilter) r = r.filter((u) => u.role === roleFilter);
        return r;
    }, [rows, search, roleFilter]);

    const handleDelete = () => {
        if (!deleteId) return;
        setProcessing(true);
        router.delete(route('users.destroy', { user: deleteId }), {
            preserveScroll: true,
            onSuccess: () => toast.success('User deleted'),
            onError: (e) => toast.error(Object.values(e).join(', ')),
            onFinish: () => { setDeleteId(null); setProcessing(false); },
        });
    };

    const columns: ColumnDef<Row>[] = [
        {
            accessorKey: 'name',
            header: ({ column }) => <SortableHeader column={column} title="Name" />,
            cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
        },
        { accessorKey: 'email', header: 'Email', cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span> },
        { accessorKey: 'role', header: 'Role', cell: ({ row }) => roleBadge(row.original.role) },
        { accessorKey: 'created_at', header: 'Created', cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{formatDateIN(row.original.created_at)}</span> },
        {
            id: 'actions',
            header: () => <span className="sr-only">Actions</span>,
            cell: ({ row }) => (
                <div className="flex items-center gap-1">
                    <Button asChild variant="ghost" size="icon">
                        <Link href={route('users.edit', { user: row.original.id })}><Pencil className="h-4 w-4" /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.original.id)} className="text-destructive hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    const toolbar = (
        <div className="flex flex-col gap-2 w-full sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative flex-1 sm:w-72 sm:flex-none">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={roleFilter || '_all'} onValueChange={(v: string) => setRoleFilter(v === '_all' ? '' : v)}>
                    <SelectTrigger className="w-[140px] shrink-0"><SelectValue placeholder="Role" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="_all">All roles</SelectItem>
                        {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                </Select>
                {(search || roleFilter) && (
                    <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setRoleFilter(''); }} className="text-destructive hover:text-destructive shrink-0">
                        <X className="h-4 w-4 mr-1" /> Reset
                    </Button>
                )}
            </div>
            <Button asChild className="sm:ml-auto">
                <Link href={route('users.create')}><Plus className="h-4 w-4 mr-1" /> New user</Link>
            </Button>
        </div>
    );

    return (
        <AdminLayout breadcrumbs={[{ label: 'Users' }]}>
            <Head title="Users" />

            <DataTable columns={columns} data={filtered} toolbar={toolbar} emptyMessage="No users match." />

            <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete user</DialogTitle>
                        <DialogDescription>The user will lose access immediately. Their audit-log history stays intact.</DialogDescription>
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
