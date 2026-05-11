import { Head } from '@inertiajs/react';
import AdminLayout from '@/components/admin/AdminLayout';
import UserForm from '@/Pages/Users/Form';

type Existing = { id: number; name: string; email: string; role: string };

export default function UsersEdit({ user }: { user: Existing }) {
    return (
        <AdminLayout breadcrumbs={[{ label: 'Users', href: '/users' }, { label: user.name }]}>
            <Head title={`Edit ${user.name}`} />
            <UserForm user={user} />
        </AdminLayout>
    );
}
