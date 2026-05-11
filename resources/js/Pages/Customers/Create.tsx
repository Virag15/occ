import { Head } from '@inertiajs/react';
import AdminLayout from '@/components/admin/AdminLayout';
import CustomerForm from '@/Pages/Customers/Form';

export default function CustomerCreate() {
    return (
        <AdminLayout breadcrumbs={[{ label: 'Customers', href: '/customers' }, { label: 'New' }]}>
            <Head title="New customer" />
            <CustomerForm customer={null} />
        </AdminLayout>
    );
}
