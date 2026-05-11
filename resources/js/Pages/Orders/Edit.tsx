import { Head } from '@inertiajs/react';
import AdminLayout from '@/components/admin/AdminLayout';
import OrderForm from '@/Pages/Orders/Form';
import type { CustomerLite, Order, TransporterLite } from '@/types/entities';

export default function OrderEdit({
    order,
    customers,
    transporters,
}: {
    order: Order;
    customers: CustomerLite[];
    transporters: TransporterLite[];
}) {
    return (
        <AdminLayout breadcrumbs={[{ label: 'Orders', href: '/orders' }, { label: order.order_code }]}>
            <Head title={`Edit ${order.order_code}`} />
            <OrderForm order={order} customers={customers} transporters={transporters} />
        </AdminLayout>
    );
}
