import { Head } from '@inertiajs/react';
import AdminLayout from '@/components/admin/AdminLayout';
import CustomerForm from '@/Pages/Customers/Form';
import type { Customer } from '@/types/entities';

export default function CustomerEdit({ customer }: { customer: Customer }) {
    return (
        <AdminLayout breadcrumbs={[{ label: 'Customers', href: '/customers' }, { label: customer.name }]}>
            <Head title={`Edit ${customer.name}`} />
            <CustomerForm customer={customer} />
        </AdminLayout>
    );
}
