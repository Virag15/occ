import { Head } from '@inertiajs/react';
import AdminLayout from '@/components/admin/AdminLayout';
import OrderForm from '@/Pages/Orders/Form';
import type { CustomerLite, TransporterLite } from '@/types/entities';

export default function OrderCreate({
    customers,
    transporters,
    nextOrderCode,
}: {
    customers: CustomerLite[];
    transporters: TransporterLite[];
    nextOrderCode: string;
}) {
    return (
        <AdminLayout breadcrumbs={[{ label: 'Orders', href: '/orders' }, { label: 'New' }]}>
            <Head title="New order" />
            <OrderForm order={null} customers={customers} transporters={transporters} nextOrderCode={nextOrderCode} />
        </AdminLayout>
    );
}
