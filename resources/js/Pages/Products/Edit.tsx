import { Head } from '@inertiajs/react';
import AdminLayout from '@/components/admin/AdminLayout';
import ProductForm from '@/Pages/Products/Form';
import type { Product } from '@/types/entities';

export default function ProductEdit({ product }: { product: Product }) {
    return (
        <AdminLayout breadcrumbs={[{ label: 'Products', href: '/products' }, { label: product.name }]}>
            <Head title={`Edit ${product.name}`} />
            <ProductForm product={product} />
        </AdminLayout>
    );
}
