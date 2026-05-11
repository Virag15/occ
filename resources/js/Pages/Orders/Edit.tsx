import { Head } from '@inertiajs/react';
import AdminLayout from '@/components/admin/AdminLayout';
import OrderForm from '@/Pages/Orders/Form';
import type { CustomerLite, Order, ProductLite } from '@/types/entities';

export default function OrderEdit({
    order,
    customers,
    products,
}: {
    order: Order;
    customers: CustomerLite[];
    products: ProductLite[];
}) {
    return (
        <AdminLayout breadcrumbs={[{ label: 'Orders', href: '/orders' }, { label: order.order_code }]}>
            <Head title={`Edit ${order.order_code}`} />
            <OrderForm order={order} customers={customers} products={products} />
        </AdminLayout>
    );
}
