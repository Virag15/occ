import { Head } from '@inertiajs/react';
import AdminLayout from '@/components/admin/AdminLayout';
import OrderForm from '@/Pages/Orders/Form';
import type { CustomerLite, ProductLite } from '@/types/entities';

export default function OrderCreate({
    customers,
    products,
    nextOrderCode,
}: {
    customers: CustomerLite[];
    products: ProductLite[];
    nextOrderCode: string;
}) {
    return (
        <AdminLayout breadcrumbs={[{ label: 'Orders', href: '/orders' }, { label: 'New' }]}>
            <Head title="New order" />
            <OrderForm order={null} customers={customers} products={products} nextOrderCode={nextOrderCode} />
        </AdminLayout>
    );
}
