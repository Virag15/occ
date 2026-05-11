import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { DatabaseTable, Column, openPeek, closePeek } from '@/Components/notion/DatabaseTable';
import { SidePeek, PeekProperty } from '@/Components/notion/SidePeek';
import { Sheet, SheetContent } from '@/Components/ui/sheet';
import { Button } from '@/Components/ui/button';
import { TransporterForm } from '@/Components/notion/TransporterForm';
import type { BadgeColor } from '@/Components/ui/badge';
import type { IndexPageProps, Transporter } from '@/types/entities';

const statusColor = (t: Transporter): BadgeColor =>
    t.status === 'active' ? 'green' : 'gray';

const columns: Column<Transporter>[] = [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'city', label: 'City', type: 'text' },
    { key: 'contact_person', label: 'Contact', type: 'text' },
    { key: 'primary_phone', label: 'Phone', type: 'phone' },
    { key: 'avg_transit_days', label: 'Transit (days)', type: 'number', align: 'right' },
    { key: 'triplicate_reliability', label: 'Triplicate', type: 'number', align: 'right' },
    { key: 'status', label: 'Status', type: 'badge', badgeColor: (r) => statusColor(r) },
];

export default function TransporterIndex({ rows, peek, filters, pagination }: IndexPageProps<Transporter>) {
    const [editing, setEditing] = useState<Transporter | null>(null);
    const [creating, setCreating] = useState(false);

    const handleSearch = (q: string) => {
        router.get(route('transporters.index'), { q }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const peekProps: PeekProperty[] = peek ? [
        { key: 'transporter_code', label: 'Code', type: 'mono', value: peek.transporter_code },
        { key: 'name', label: 'Name', type: 'text', value: peek.name },
        { key: 'status', label: 'Status', type: 'badge', value: peek.status, badgeColor: statusColor(peek) },
        { key: 'contact_person', label: 'Contact person', type: 'text', value: peek.contact_person },
        { key: 'primary_phone', label: 'Primary phone', type: 'phone', value: peek.primary_phone },
        { key: 'secondary_phone', label: 'Secondary phone', type: 'phone', value: peek.secondary_phone },
        { key: 'whatsapp', label: 'WhatsApp', type: 'phone', value: peek.whatsapp },
        { key: 'email', label: 'Email', type: 'email', value: peek.email },
        { key: 'office_address', label: 'Office address', type: 'text', value: peek.office_address },
        { key: 'city', label: 'City', type: 'text', value: peek.city },
        { key: 'gstin', label: 'GSTIN', type: 'mono', value: peek.gstin },
        { key: 'areas_served', label: 'Areas served', type: 'multi_select', value: peek.areas_served },
        { key: 'avg_transit_days', label: 'Avg transit (days)', type: 'number', value: peek.avg_transit_days },
        { key: 'cost_per_kg', label: 'Cost per kg', type: 'currency', value: peek.cost_per_kg },
        { key: 'triplicate_reliability', label: 'Triplicate reliability', type: 'number', value: peek.triplicate_reliability },
        { key: 'payment_terms', label: 'Payment terms', type: 'badge', value: peek.payment_terms, badgeColor: 'blue' },
        { key: 'notes', label: 'Notes', type: 'text', value: peek.notes },
    ] : [];

    return (
        <AppLayout crumbs={[{ label: 'Workspace' }, { label: 'Transporters' }]}>
            <Head title="Transporters" />

            <DatabaseTable
                rows={rows}
                columns={columns}
                titleKey="name"
                onRowClick={(t) => openPeek(t.id)}
                searchValue={filters.q}
                onSearch={handleSearch}
                onCreate={() => setCreating(true)}
                createLabel="New transporter"
                rowCount={pagination.total}
            />

            <SidePeek
                open={!!peek && !editing}
                title={peek?.name ?? ''}
                subtitle={peek?.transporter_code ?? undefined}
                icon="🚚"
                properties={peekProps}
                actions={
                    peek && (
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => closePeek()}>Close</Button>
                            <Button onClick={() => setEditing(peek)}>Edit</Button>
                        </div>
                    )
                }
            />

            {/* Edit drawer */}
            <Sheet open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
                <SheetContent>
                    <div className="border-b px-6 py-5">
                        <h2 className="leading-tight">Edit transporter</h2>
                    </div>
                    {editing && (
                        <TransporterForm
                            transporter={editing}
                            onDone={() => { setEditing(null); closePeek(); }}
                        />
                    )}
                </SheetContent>
            </Sheet>

            {/* Create drawer */}
            <Sheet open={creating} onOpenChange={(o) => { if (!o) setCreating(false); }}>
                <SheetContent>
                    <div className="border-b px-6 py-5">
                        <h2 className="leading-tight">New transporter</h2>
                    </div>
                    <TransporterForm
                        transporter={null}
                        onDone={() => setCreating(false)}
                    />
                </SheetContent>
            </Sheet>
        </AppLayout>
    );
}
