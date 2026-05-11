import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { DatabaseTable, Column, openPeek } from '@/Components/notion/DatabaseTable';
import { SidePeek, PeekProperty } from '@/Components/notion/SidePeek';
import type { BadgeColor } from '@/Components/ui/badge';
import type { Customer, IndexPageProps } from '@/types/entities';

const statusColor = (c: Customer): BadgeColor => {
    switch (c.status) {
        case 'active': return 'green';
        case 'credit_hold': return 'red';
        case 'new': return 'blue';
        default: return 'gray';
    }
};

const customerTypeColor = (c: Customer): BadgeColor => {
    switch (c.customer_type) {
        case 'dealer': return 'blue';
        case 'contractor': return 'purple';
        case 'oem': return 'orange';
        case 'government': return 'brown';
        case 'end_user': return 'gray';
        default: return 'gray';
    }
};

const columns: Column<Customer>[] = [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'company', label: 'Company', type: 'text' },
    { key: 'city', label: 'City', type: 'text' },
    { key: 'customer_type', label: 'Type', type: 'badge', badgeColor: (r) => customerTypeColor(r) },
    { key: 'gstin', label: 'GSTIN', type: 'mono' },
    { key: 'payment_terms', label: 'Terms', type: 'text' },
    { key: 'status', label: 'Status', type: 'badge', badgeColor: (r) => statusColor(r) },
];

export default function CustomerIndex({ rows, peek, filters, pagination }: IndexPageProps<Customer>) {
    const handleSearch = (q: string) => {
        router.get(route('customers.index'), { q }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const peekProps: PeekProperty[] = peek ? [
        { key: 'customer_code', label: 'Code', type: 'mono', value: peek.customer_code },
        { key: 'name', label: 'Name', type: 'text', value: peek.name },
        { key: 'company', label: 'Company', type: 'text', value: peek.company },
        { key: 'customer_type', label: 'Type', type: 'badge', value: peek.customer_type, badgeColor: customerTypeColor(peek) },
        { key: 'status', label: 'Status', type: 'badge', value: peek.status, badgeColor: statusColor(peek) },
        { key: 'contact_person', label: 'Contact person', type: 'text', value: peek.contact_person },
        { key: 'phone', label: 'Phone', type: 'phone', value: peek.phone },
        { key: 'whatsapp', label: 'WhatsApp', type: 'phone', value: peek.whatsapp },
        { key: 'email', label: 'Email', type: 'email', value: peek.email },
        { key: 'billing_address', label: 'Billing address', type: 'text', value: peek.billing_address },
        { key: 'delivery_address', label: 'Delivery address', type: 'text', value: peek.delivery_address },
        { key: 'city', label: 'City', type: 'text', value: peek.city },
        { key: 'state', label: 'State', type: 'text', value: peek.state },
        { key: 'gstin', label: 'GSTIN', type: 'mono', value: peek.gstin },
        { key: 'payment_terms', label: 'Payment terms', type: 'badge', value: peek.payment_terms, badgeColor: 'blue' },
        { key: 'credit_limit', label: 'Credit limit', type: 'currency', value: peek.credit_limit },
        { key: 'brand_preferences', label: 'Brand preferences', type: 'multi_select', value: peek.brand_preferences },
        { key: 'tally_synced_at', label: 'Last synced from Tally', type: 'date', value: peek.tally_synced_at },
        { key: 'notes', label: 'Notes', type: 'text', value: peek.notes },
    ] : [];

    return (
        <AppLayout crumbs={[{ label: 'Workspace' }, { label: 'Customers' }]}>
            <Head title="Customers" />

            <DatabaseTable
                rows={rows}
                columns={columns}
                titleKey="name"
                onRowClick={(c) => openPeek(c.id)}
                searchValue={filters.q}
                onSearch={handleSearch}
                rowCount={pagination.total}
            />

            <SidePeek
                open={!!peek}
                title={peek?.name ?? ''}
                subtitle={peek?.company ?? peek?.customer_code ?? undefined}
                icon="👤"
                properties={peekProps}
                readOnly
            />
        </AppLayout>
    );
}
