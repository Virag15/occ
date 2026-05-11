import AdminLayout from '@/components/admin/AdminLayout';
import { Head } from '@inertiajs/react';
import { Card, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';

type Props = { title: string; description: string };

export default function Placeholder({ title, description }: Props) {
    return (
        <AdminLayout breadcrumbs={[{ label: title }]}>
            <Head title={title} />

            <div className="mx-auto max-w-3xl py-12">
                <Card>
                    <CardContent className="p-10 text-center">
                        <Construction
                            className="mx-auto h-10 w-10 text-muted-foreground"
                            strokeWidth={1.25}
                        />
                        <h1 className="mt-4 text-xl font-bold tracking-tight">{title}</h1>
                        <p className="mt-3 text-sm text-muted-foreground">{description}</p>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
