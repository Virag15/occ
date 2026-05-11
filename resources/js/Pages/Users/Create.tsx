import { Head } from '@inertiajs/react';
import AdminLayout from '@/components/admin/AdminLayout';
import UserForm from '@/Pages/Users/Form';

export default function UsersCreate() {
    return (
        <AdminLayout breadcrumbs={[{ label: 'Users', href: '/users' }, { label: 'New' }]}>
            <Head title="New user" />
            <UserForm user={null} />
        </AdminLayout>
    );
}
