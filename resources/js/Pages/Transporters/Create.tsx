import { Head } from '@inertiajs/react';
import AdminLayout from '@/components/admin/AdminLayout';
import TransporterForm from '@/Pages/Transporters/Form';

export default function TransporterCreate() {
    return (
        <AdminLayout breadcrumbs={[{ label: 'Transporters', href: '/transporters' }, { label: 'New' }]}>
            <Head title="New transporter" />
            <TransporterForm transporter={null} />
        </AdminLayout>
    );
}
