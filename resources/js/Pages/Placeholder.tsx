import AppLayout from '@/Layouts/AppLayout';
import { Head } from '@inertiajs/react';
import { Construction } from 'lucide-react';

type Props = { title: string; description: string };

export default function Placeholder({ title, description }: Props) {
    return (
        <AppLayout crumbs={[{ label: 'Workspace' }, { label: title }]}>
            <Head title={title} />

            <div className="mx-auto max-w-3xl px-6 py-16 text-center">
                <Construction
                    className="mx-auto h-10 w-10 text-[var(--color-muted-foreground)]"
                    strokeWidth={1.25}
                />
                <h1 className="mt-4">{title}</h1>
                <p className="mt-3 text-[var(--color-muted-foreground)]">{description}</p>
            </div>
        </AppLayout>
    );
}
