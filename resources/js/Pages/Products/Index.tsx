import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { DatabaseTable, Column, openPeek } from '@/Components/notion/DatabaseTable';
import { SidePeek, PeekProperty } from '@/Components/notion/SidePeek';
import type { IndexPageProps, Product } from '@/types/entities';

const columns: Column<Product>[] = [
    { key: 'name', label: 'Product', type: 'text' },
    { key: 'sku', label: 'SKU', type: 'mono' },
    { key: 'brand', label: 'Brand', type: 'badge', badgeColor: 'purple' },
    { key: 'unit', label: 'Unit', type: 'text' },
    { key: 'mrp', label: 'MRP', type: 'currency', align: 'right' },
    { key: 'default_sale_price', label: 'Sale price', type: 'currency', align: 'right' },
    { key: 'gst_rate', label: 'GST %', type: 'number', align: 'right' },
];

export default function ProductIndex({ rows, peek, filters, pagination }: IndexPageProps<Product>) {
    const handleSearch = (q: string) => {
        router.get(route('products.index'), { q }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const totalStock = peek?.stock_items?.reduce(
        (acc, s) => acc + Number(s.qty_closing || 0),
        0,
    );

    const peekProps: PeekProperty[] = peek ? [
        { key: 'sku', label: 'SKU', type: 'mono', value: peek.sku },
        { key: 'name', label: 'Name', type: 'text', value: peek.name },
        { key: 'brand', label: 'Brand', type: 'badge', value: peek.brand, badgeColor: 'purple' },
        { key: 'category', label: 'Category', type: 'text', value: peek.category },
        { key: 'description', label: 'Description', type: 'text', value: peek.description },
        { key: 'hsn_code', label: 'HSN', type: 'mono', value: peek.hsn_code },
        { key: 'unit', label: 'Unit', type: 'text', value: peek.unit },
        { key: 'gst_rate', label: 'GST rate (%)', type: 'number', value: peek.gst_rate },
        { key: 'mrp', label: 'MRP', type: 'currency', value: peek.mrp },
        { key: 'default_sale_price', label: 'Default sale price', type: 'currency', value: peek.default_sale_price },
        { key: 'default_purchase_price', label: 'Default purchase price', type: 'currency', value: peek.default_purchase_price },
        { key: 'closing_stock', label: 'Total closing stock', type: 'number', value: totalStock ?? 0 },
        { key: 'tally_synced_at', label: 'Last synced from Tally', type: 'date', value: peek.tally_synced_at },
    ] : [];

    return (
        <AppLayout crumbs={[{ label: 'Workspace' }, { label: 'Products' }]}>
            <Head title="Products" />

            <DatabaseTable
                rows={rows}
                columns={columns}
                titleKey="name"
                onRowClick={(p) => openPeek(p.id)}
                searchValue={filters.q}
                onSearch={handleSearch}
                rowCount={pagination.total}
            />

            <SidePeek
                open={!!peek}
                title={peek?.name ?? ''}
                subtitle={peek?.sku ?? undefined}
                icon="📦"
                properties={peekProps}
                readOnly
            />
        </AppLayout>
    );
}
