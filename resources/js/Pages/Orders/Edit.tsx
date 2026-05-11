import { Head } from '@inertiajs/react';
import AdminLayout from '@/components/admin/AdminLayout';
import OrderForm from '@/Pages/Orders/Form';
import type { CustomerLite, Order, ProductLite, TransporterLite } from '@/types/entities';

export default function OrderEdit({
    order,
    customers,
    transporters,
    products,
}: {
    order: Order;
    customers: CustomerLite[];
    transporters: TransporterLite[];
    products: ProductLite[];
}) {
    return (
        <AdminLayout breadcrumbs={[{ label: 'Orders', href: '/orders' }, { label: order.order_code }]}>
            <Head title={`Edit ${order.order_code}`} />
            <OrderForm order={order} customers={customers} transporters={transporters} products={products} />
        </AdminLayout>
    );
}
