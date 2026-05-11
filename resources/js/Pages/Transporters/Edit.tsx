import { Head } from '@inertiajs/react';
import AdminLayout from '@/components/admin/AdminLayout';
import TransporterForm from '@/Pages/Transporters/Form';
import type { Transporter } from '@/types/entities';

export default function TransporterEdit({ transporter }: { transporter: Transporter }) {
    return (
        <AdminLayout breadcrumbs={[{ label: 'Transporters', href: '/transporters' }, { label: transporter.name }]}>
            <Head title={`Edit ${transporter.name}`} />
            <TransporterForm transporter={transporter} />
        </AdminLayout>
    );
}
