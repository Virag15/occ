import { Head, router, useForm } from '@inertiajs/react';
import { ColumnDef } from '@tanstack/react-table';
import { FormEvent, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { IndexPageProps, Transporter } from '@/types/entities';
import { formatCurrency, nullable } from '@/lib/format';

const PAYMENT_TERMS = ['advance', 'weekly', 'fortnightly', 'monthly'];
const STATUSES = ['active', 'inactive'];

function statusBadge(status: string) {
    return status === 'active'
        ? <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Active</Badge>
        : <Badge variant="outline" className="text-muted-foreground">{status}</Badge>;
}

const columns: ColumnDef<Transporter>[] = [
    {
        accessorKey: 'name',
        header: ({ column }) => <SortableHeader column={column} title="Name" />,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
        accessorKey: 'city',
        header: 'City',
        cell: ({ row }) => nullable(row.original.city),
    },
    {
        accessorKey: 'contact_person',
        header: 'Contact',
        cell: ({ row }) => nullable(row.original.contact_person),
    },
    {
        accessorKey: 'primary_phone',
        header: 'Phone',
        cell: ({ row }) => (
            row.original.primary_phone
                ? <a href={`tel:${row.original.primary_phone}`} onClick={(e) => e.stopPropagation()} className="font-mono text-xs hover:underline">{row.original.primary_phone}</a>
                : '—'
        ),
    },
    {
        accessorKey: 'avg_transit_days',
        header: ({ column }) => <SortableHeader column={column} title="Transit (days)" />,
        cell: ({ row }) => row.original.avg_transit_days ?? '—',
    },
    {
        accessorKey: 'triplicate_reliability',
        header: 'Triplicate',
        cell: ({ row }) => row.original.triplicate_reliability ? `${row.original.triplicate_reliability}/5` : '—',
    },
    {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => statusBadge(row.original.status),
    },
];

type FormShape = {
    name: string;
    contact_person: string;
    primary_phone: string;
    secondary_phone: string;
    whatsapp: string;
    email: string;
    office_address: string;
    city: string;
    gstin: string;
    avg_transit_days: number | string;
    cost_per_kg: number | string;
    triplicate_reliability: number | string;
    payment_terms: string;
    status: string;
    notes: string;
};

function emptyForm(t?: Transporter | null): FormShape {
    return {
        name: t?.name ?? '',
        contact_person: t?.contact_person ?? '',
        primary_phone: t?.primary_phone ?? '',
        secondary_phone: t?.secondary_phone ?? '',
        whatsapp: t?.whatsapp ?? '',
        email: t?.email ?? '',
        office_address: t?.office_address ?? '',
        city: t?.city ?? '',
        gstin: t?.gstin ?? '',
        avg_transit_days: t?.avg_transit_days ?? '',
        cost_per_kg: t?.cost_per_kg ?? '',
        triplicate_reliability: t?.triplicate_reliability ?? '',
        payment_terms: t?.payment_terms ?? '',
        status: t?.status ?? 'active',
        notes: t?.notes ?? '',
    };
}

function TransporterForm({ transporter, onDone }: { transporter: Transporter | null; onDone: () => void }) {
    const isEdit = !!transporter?.id;
    const form = useForm<FormShape>(emptyForm(transporter));

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const opts = {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(isEdit ? 'Transporter updated' : 'Transporter created');
                onDone();
            },
        };
        if (isEdit) form.patch(route('transporters.update', { transporter: transporter!.id }), opts);
        else form.post(route('transporters.store'), opts);
    };

    const handleDelete = () => {
        if (!isEdit) return;
        if (!confirm(`Delete transporter "${transporter!.name}"?`)) return;
        form.delete(route('transporters.destroy', { transporter: transporter!.id }), {
            onSuccess: () => {
                toast.success('Transporter deleted');
                onDone();
            },
        });
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                <Field label="Name *" id="name">
                    <Input id="name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} required />
                    {form.errors.name && <p className="text-xs text-destructive mt-1">{form.errors.name}</p>}
                </Field>
                <Field label="Contact person" id="contact_person">
                    <Input id="contact_person" value={form.data.contact_person} onChange={(e) => form.setData('contact_person', e.target.value)} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Primary phone" id="primary_phone">
                        <Input id="primary_phone" value={form.data.primary_phone} onChange={(e) => form.setData('primary_phone', e.target.value)} />
                    </Field>
                    <Field label="Secondary phone" id="secondary_phone">
                        <Input id="secondary_phone" value={form.data.secondary_phone} onChange={(e) => form.setData('secondary_phone', e.target.value)} />
                    </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="WhatsApp" id="whatsapp">
                        <Input id="whatsapp" value={form.data.whatsapp} onChange={(e) => form.setData('whatsapp', e.target.value)} />
                    </Field>
                    <Field label="Email" id="email">
                        <Input id="email" type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} />
                    </Field>
                </div>
                <Field label="Office address" id="office_address">
                    <Textarea id="office_address" rows={2} value={form.data.office_address} onChange={(e) => form.setData('office_address', e.target.value)} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="City" id="city">
                        <Input id="city" value={form.data.city} onChange={(e) => form.setData('city', e.target.value)} />
                    </Field>
                    <Field label="GSTIN" id="gstin">
                        <Input id="gstin" className="font-mono text-xs" value={form.data.gstin} onChange={(e) => form.setData('gstin', e.target.value)} />
                    </Field>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <Field label="Transit (days)" id="avg_transit_days">
                        <Input id="avg_transit_days" type="number" value={form.data.avg_transit_days} onChange={(e) => form.setData('avg_transit_days', e.target.value)} />
                    </Field>
                    <Field label="Cost per kg (₹)" id="cost_per_kg">
                        <Input id="cost_per_kg" type="number" step="0.01" value={form.data.cost_per_kg} onChange={(e) => form.setData('cost_per_kg', e.target.value)} />
                    </Field>
                    <Field label="Triplicate (1-5)" id="triplicate_reliability">
                        <Input id="triplicate_reliability" type="number" min={1} max={5} value={form.data.triplicate_reliability} onChange={(e) => form.setData('triplicate_reliability', e.target.value)} />
                    </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Payment terms" id="payment_terms">
                        <Select value={form.data.payment_terms || undefined} onValueChange={(v: string) => form.setData('payment_terms', v)}>
                            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent>
                                {PAYMENT_TERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label="Status" id="status">
                        <Select value={form.data.status} onValueChange={(v: string) => form.setData('status', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </Field>
                </div>
                <Field label="Notes" id="notes">
                    <Textarea id="notes" rows={3} value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} />
                </Field>
            </div>

            <div className="flex items-center justify-between border-t border-border px-6 py-3 shrink-0">
                {isEdit ? (
                    <Button type="button" variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                    </Button>
                ) : <span />}
                <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={onDone}>Cancel</Button>
                    <Button type="submit" size="sm" disabled={form.processing}>
                        {form.processing ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
                    </Button>
                </div>
            </div>
        </form>
    );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id} className="text-xs">{label}</Label>
            {children}
        </div>
    );
}

function DetailView({ transporter, onEdit }: { transporter: Transporter; onEdit: () => void }) {
    const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
        <div className="grid grid-cols-[140px_1fr] items-start gap-3 py-1.5 border-b border-border/40 last:border-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm">{value || <span className="text-muted-foreground/60">—</span>}</dd>
        </div>
    );

    return (
        <>
            <div className="flex-1 overflow-y-auto px-6 py-5">
                <dl>
                    <Row label="Code" value={<span className="font-mono text-xs">{transporter.transporter_code}</span>} />
                    <Row label="Status" value={statusBadge(transporter.status)} />
                    <Row label="Contact person" value={transporter.contact_person} />
                    <Row label="Primary phone" value={transporter.primary_phone ? <a href={`tel:${transporter.primary_phone}`} className="font-mono text-xs hover:underline">{transporter.primary_phone}</a> : null} />
                    <Row label="Secondary phone" value={transporter.secondary_phone} />
                    <Row label="WhatsApp" value={transporter.whatsapp} />
                    <Row label="Email" value={transporter.email ? <a href={`mailto:${transporter.email}`} className="hover:underline">{transporter.email}</a> : null} />
                    <Row label="Office address" value={transporter.office_address} />
                    <Row label="City" value={transporter.city} />
                    <Row label="GSTIN" value={transporter.gstin ? <span className="font-mono text-xs">{transporter.gstin}</span> : null} />
                    <Row label="Areas served" value={transporter.areas_served?.length
                        ? <div className="flex flex-wrap gap-1">{transporter.areas_served.map((a) => <Badge key={a} variant="secondary" className="text-[10px]">{a}</Badge>)}</div>
                        : null} />
                    <Row label="Avg transit (days)" value={transporter.avg_transit_days} />
                    <Row label="Cost per kg" value={formatCurrency(transporter.cost_per_kg)} />
                    <Row label="Triplicate reliability" value={transporter.triplicate_reliability ? `${transporter.triplicate_reliability}/5` : null} />
                    <Row label="Payment terms" value={transporter.payment_terms} />
                    <Row label="Notes" value={transporter.notes} />
                </dl>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-3 shrink-0">
                <Button size="sm" onClick={onEdit}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
            </div>
        </>
    );
}

export default function TransporterIndex({ rows, peek, filters }: IndexPageProps<Transporter>) {
    const [editing, setEditing] = useState<Transporter | null>(null);
    const [creating, setCreating] = useState(false);

    const closeDrawers = () => {
        setEditing(null);
        setCreating(false);
        // Clear ?peek param
        const url = new URL(window.location.href);
        url.searchParams.delete('peek');
        router.visit(url.pathname + url.search, { preserveScroll: true, preserveState: true, replace: true });
    };

    const openPeekRow = (t: Transporter) => {
        const url = new URL(window.location.href);
        url.searchParams.set('peek', String(t.id));
        router.visit(url.pathname + url.search, { preserveScroll: true, preserveState: true });
    };

    // Wrap rows to add click handler — DataTable doesn't natively support row click,
    // so we override via column mutation: attach onClick to TableRow via row.original handler.
    // Simpler: add a non-rendered "id" column, use cell onClick.
    // For now: clicking the name column opens peek.
    const tableColumns: ColumnDef<Transporter>[] = columns.map((col, i) =>
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

    const showDetail = !!peek && !editing && !creating;
    const showEdit = !!editing;
    const showCreate = creating;

    return (
        <AdminLayout breadcrumbs={[{ label: 'Transporters' }]}>
            <Head title="Transporters" />

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Transporters</h1>
                    <Button size="sm" onClick={() => setCreating(true)}>
                        <Plus className="mr-1 h-3.5 w-3.5" /> New transporter
                    </Button>
                </div>

                <DataTable
                    columns={tableColumns}
                    data={rows}
                    searchKey="name"
                    searchPlaceholder="Search by name…"
                    emptyMessage="No transporters yet. Add your first carrier above."
                />
            </div>

            {/* Detail / Edit / Create — single Sheet, content switches by mode */}
            <Sheet
                open={showDetail || showEdit || showCreate}
                onOpenChange={(o: boolean) => { if (!o) closeDrawers(); }}
            >
                <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
                    <SheetHeader className="border-b border-border px-6 py-4 shrink-0">
                        <SheetTitle>
                            {showCreate
                                ? 'New transporter'
                                : showEdit
                                    ? `Edit ${editing!.name}`
                                    : peek?.name}
                        </SheetTitle>
                    </SheetHeader>
                    {showCreate && <TransporterForm transporter={null} onDone={closeDrawers} />}
                    {showEdit && <TransporterForm transporter={editing} onDone={closeDrawers} />}
                    {showDetail && peek && <DetailView transporter={peek} onEdit={() => setEditing(peek)} />}
                </SheetContent>
            </Sheet>

            {/* Hide unused vars warning */}
            <span className="hidden">{filters.q}</span>
        </AdminLayout>
    );
}
