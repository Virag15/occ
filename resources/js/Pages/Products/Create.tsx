import { Head } from '@inertiajs/react';
import AdminLayout from '@/components/admin/AdminLayout';
import ProductForm from '@/Pages/Products/Form';

export default function ProductCreate() {
    return (
        <AdminLayout breadcrumbs={[{ label: 'Products', href: '/products' }, { label: 'New' }]}>
            <Head title="New product" />
            <ProductForm product={null} />
        </AdminLayout>
    );
}
