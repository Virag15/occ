import { Head } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import AdminLayout from '@/components/admin/AdminLayout';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X, Plus, Pencil, Trash2, LogIn, LogOut, Shield, Truck, FileCheck, AlertTriangle, RefreshCcw, Check, Download, Printer, RotateCcw } from '@/lib/icons';
import { cn } from '@/lib/utils';

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

// ─── Prettifiers ──────────────────────────────────────────────────────

const ENTITY_LABELS: Record<string, string> = {
    order: 'Order',
    order_item: 'Order item',
    customer: 'Customer',
    product: 'Product',
    transporter: 'Transporter',
    user: 'User',
    shipment: 'Shipment',
    shipment_item: 'Shipment item',
    return_case: 'Return case',
    return_item: 'Return item',
    audit_log: 'Audit log',
};

const KEY_LABELS: Record<string, string> = {
    lr_shared_with_customer: 'LR shared with customer',
    lr_shared_at: 'LR shared at',
    lr_number: 'LR number',
    pod_received: 'POD received',
    triplicate_received: 'Triplicate received',
    triplicate_received_date: 'Triplicate received on',
    qty_ordered: 'Qty ordered',
    qty_packed: 'Qty packed',
    qty_dispatched: 'Qty shipped',
    qty_delivered: 'Qty delivered',
    qty_returned: 'Qty returned',
    qty_cancelled: 'Qty cancelled',
    order_value: 'Order value',
    order_code: 'Order code',
    order_date: 'Order date',
    order_source: 'Order source',
    customer_reference_number: 'Customer reference',
    customer_po_number: 'Customer PO',
    payment_status: 'Payment status',
    payment_mode: 'Payment mode',
    payment_terms: 'Payment terms',
    payment_due_date: 'Payment due',
    payment_received_date: 'Payment received on',
    amount_received: 'Amount received',
    invoice_number: 'Invoice number',
    invoice_date: 'Invoice date',
    expected_delivery: 'Expected delivery',
    delivered_date: 'Delivered on',
    dispatch_date: 'Dispatched on',
    pickup_scheduled_date: 'Pickup scheduled',
    vehicle_number: 'Vehicle',
    driver_name: 'Driver',
    driver_contact: 'Driver contact',
    transporter_id: 'Transporter',
    customer_id: 'Customer',
    case_status: 'Case status',
    case_code: 'Case code',
    resolution_type: 'Resolution',
    resolution_date: 'Resolved on',
    inspection_started_at: 'Inspection started at',
    inspected_by: 'Inspected by',
    resolved_by: 'Resolved by',
    created_by: 'Created by',
    shipment_code: 'Shipment code',
    parcel_weight_kg: 'Parcel weight',
    number_of_boxes: 'Box count',
    packing_slip_generated: 'Packing slip generated',
    picking_slip_generated_at: 'Picking slip printed at',
    packing_slip_generated_at: 'Packing slip printed at',
    is_active: 'Active',
    role: 'Role',
    density_preference: 'Display density',
    internal_notes: 'Internal notes',
    name: 'Name',
    company: 'Company',
    email: 'Email',
    phone: 'Phone',
    gstin: 'GSTIN',
    city: 'City',
    state: 'State',
    status: 'Status',
    priority: 'Priority',
    brands: 'Brands',
    notes: 'Notes',
};

function prettifyEntity(entity: string): string {
    return ENTITY_LABELS[entity] ?? entity.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function prettifyKey(key: string): string {
    if (KEY_LABELS[key]) return KEY_LABELS[key];
    return key.split('_').map((w, i) => i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w).join(' ');
}

function isIsoDate(s: string): boolean {
    return /^\d{4}-\d{2}-\d{2}(T|\s)/.test(s) || /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function fmtValue(v: unknown): React.ReactNode {
    if (v === null || v === undefined || v === '') return <span className="text-muted-foreground/60">—</span>;

    if (typeof v === 'boolean') {
        return v
            ? <span className="inline-flex items-center gap-1 rounded-sm bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">✓ Yes</span>
            : <span className="inline-flex items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">✗ No</span>;
    }

    if (Array.isArray(v)) {
        if (v.length === 0) return <span className="text-muted-foreground/60">none</span>;
        return <span>{v.join(', ')}</span>;
    }

    if (typeof v === 'object') {
        return <span className="font-mono text-[10px] text-muted-foreground">{JSON.stringify(v)}</span>;
    }

    const s = String(v);

    // Date / datetime
    if (isIsoDate(s)) {
        try {
            const d = new Date(s);
            const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(s);
            if (!isNaN(d.getTime())) {
                const out = isDateOnly
                    ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                return <span className="tabular-nums">{out}</span>;
            }
        } catch { /* fall through */ }
    }

    // URLs (long photo paths) → "📎 file" link
    if (s.startsWith('/storage/') || s.startsWith('http')) {
        return <a href={s} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">📎 file</a>;
    }

    // Long string → truncate
    if (s.length > 40) return <span title={s}>{s.slice(0, 40)}…</span>;

    return s;
}

// ─── Action style map ─────────────────────────────────────────────────

type ActionMeta = { label: string; icon: React.ComponentType<{ className?: string }>; classes: string };

function actionMeta(action: string): ActionMeta {
    const a = action.toLowerCase();
    const pretty = action.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

    // Return case lifecycle — most specific first
    if (a === 'return_inspection_started') return { label: 'Inspection started', icon: RotateCcw, classes: 'bg-blue-500/10 text-blue-700 border-blue-200' };
    if (a === 'return_resolved') return { label: 'Return resolved', icon: Check, classes: 'bg-emerald-500/10 text-emerald-700 border-emerald-200' };
    if (a === 'return_rejected') return { label: 'Return rejected', icon: X, classes: 'bg-red-500/10 text-red-700 border-red-200' };

    // Document outputs
    if (a === 'invoice_downloaded') return { label: 'Invoice downloaded', icon: Download, classes: 'bg-indigo-500/10 text-indigo-700 border-indigo-200' };
    if (a === 'quotation_downloaded') return { label: 'Quotation downloaded', icon: Download, classes: 'bg-indigo-500/10 text-indigo-700 border-indigo-200' };
    if (a === 'picking_slip_printed') return { label: 'Picking slip printed', icon: Printer, classes: 'bg-indigo-500/10 text-indigo-700 border-indigo-200' };
    if (a === 'packing_slip_printed') return { label: 'Packing slip printed', icon: Printer, classes: 'bg-indigo-500/10 text-indigo-700 border-indigo-200' };

    // Evidence uploads
    if (a === 'evidence_uploaded') return { label: 'Evidence uploaded', icon: FileCheck, classes: 'bg-emerald-500/10 text-emerald-700 border-emerald-200' };

    // CRUD basics
    if (a === 'created' || a.endsWith('_created')) return { label: 'Created', icon: Plus, classes: 'bg-emerald-500/10 text-emerald-700 border-emerald-200' };
    if (a === 'deleted' || a.endsWith('_deleted')) return { label: 'Deleted', icon: Trash2, classes: 'bg-red-500/10 text-red-700 border-red-200' };
    if (a === 'updated' || a.endsWith('_updated')) return { label: 'Updated', icon: Pencil, classes: 'bg-blue-500/10 text-blue-700 border-blue-200' };

    // State transitions
    if (a === 'status_changed') return { label: 'Status changed', icon: RefreshCcw, classes: 'bg-orange-500/10 text-orange-700 border-orange-200' };
    if (a === 'payment_status_changed') return { label: 'Payment status changed', icon: RefreshCcw, classes: 'bg-orange-500/10 text-orange-700 border-orange-200' };

    // Auth
    if (a === 'login') return { label: 'Signed in', icon: LogIn, classes: 'bg-muted text-muted-foreground border-border' };
    if (a === 'logout') return { label: 'Signed out', icon: LogOut, classes: 'bg-muted text-muted-foreground border-border' };
    if (a === 'failed_login' || a === 'login_failed') return { label: 'Login failed', icon: AlertTriangle, classes: 'bg-yellow-500/10 text-yellow-700 border-yellow-200' };
    if (a === 'role_changed') return { label: 'Role changed', icon: Shield, classes: 'bg-purple-500/10 text-purple-700 border-purple-200' };

    // Toggle flags
    if (a.includes('shared') || a.includes('toggled') || a.includes('marked')) return { label: pretty, icon: Check, classes: 'bg-yellow-500/10 text-yellow-700 border-yellow-200' };

    // Catch-all uploads & dispatches
    if (a.includes('uploaded')) return { label: pretty, icon: FileCheck, classes: 'bg-emerald-500/10 text-emerald-700 border-emerald-200' };
    if (a.includes('dispatch')) return { label: pretty, icon: Truck, classes: 'bg-orange-500/10 text-orange-700 border-orange-200' };

    return { label: pretty, icon: Pencil, classes: 'bg-muted text-foreground border-border' };
}

// ─── Component ────────────────────────────────────────────────────────

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
            cell: ({ row }) => (
                <span className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                    {new Date(row.original.created_at).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                    })}
                </span>
            ),
        },
        {
            id: 'user',
            header: 'Who',
            cell: ({ row }) => row.original.user?.name
                ? <span className="font-medium">{row.original.user.name}</span>
                : <span className="italic text-muted-foreground">System</span>,
        },
        {
            accessorKey: 'action',
            header: 'Action',
            cell: ({ row }) => {
                const meta = actionMeta(row.original.action);
                const Icon = meta.icon;
                return (
                    <Badge className={cn('border gap-1 capitalize', meta.classes)}>
                        <Icon className="h-3 w-3" /> {meta.label}
                    </Badge>
                );
            },
        },
        {
            id: 'entity',
            header: 'On',
            cell: ({ row }) => (
                <span className="whitespace-nowrap text-xs">
                    {prettifyEntity(row.original.entity_type)}{' '}
                    <span className="font-mono text-[10px] text-muted-foreground">#{row.original.entity_id}</span>
                </span>
            ),
        },
        {
            id: 'changes',
            header: 'What changed',
            cell: ({ row }) => {
                const c = row.original.changes;
                if (!c || Object.keys(c).length === 0) {
                    return <span className="text-xs text-muted-foreground">—</span>;
                }
                const action = row.original.action;
                const isCreation = action === 'created' || action.endsWith('_created');
                return (
                    <div className="space-y-1 text-xs">
                        {Object.entries(c).map(([k, v]) => {
                            // Event-style entry (from=null/to=value) and not a creation snapshot
                            // → render just the value, no arrow, no strikethrough.
                            const isEvent = v.from === null && v.to !== null && !isCreation;
                            // Deletion-style (from=value/to=null) → just show the prior value with strikethrough.
                            const isDeletion = v.to === null && v.from !== null;
                            return (
                                <div key={k} className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-muted-foreground">{prettifyKey(k)}:</span>
                                    {isEvent ? (
                                        <span className="font-medium">{fmtValue(v.to)}</span>
                                    ) : isDeletion ? (
                                        <span className="line-through opacity-60">{fmtValue(v.from)}</span>
                                    ) : (
                                        <>
                                            <span className="opacity-60 line-through">{fmtValue(v.from)}</span>
                                            <span className="text-muted-foreground/60">→</span>
                                            <span className="font-medium">{fmtValue(v.to)}</span>
                                        </>
                                    )}
                                </div>
                            );
                        })}
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
                <SelectTrigger className="w-[160px] shrink-0"><SelectValue placeholder="On" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="_all">All entities</SelectItem>
                    {entityTypes.map((e) => <SelectItem key={e} value={e}>{prettifyEntity(e)}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={actionFilter || '_all'} onValueChange={(v: string) => setActionFilter(v === '_all' ? '' : v)}>
                <SelectTrigger className="w-[180px] shrink-0"><SelectValue placeholder="Action" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="_all">All actions</SelectItem>
                    {actions.map((a) => <SelectItem key={a} value={a}>{actionMeta(a).label}</SelectItem>)}
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
