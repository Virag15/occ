import AppLayout from '@/Layouts/AppLayout';
import { Head } from '@inertiajs/react';

export default function Dashboard() {
    return (
        <AppLayout crumbs={[{ label: 'Workspace' }, { label: 'Operations Dashboard' }]}>
            <Head title="Operations Dashboard" />

            <div className="mx-auto max-w-7xl px-6 py-8">
                <h1 className="mb-2">Operations Dashboard</h1>
                <p className="text-[var(--color-muted-foreground)]">
                    Action queues, dispatch metrics, and overdue payments will land here in Phase 3.
                </p>

                <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {['Orders today', 'Pending dispatch', 'Triplicates awaited', 'Overdue payments'].map((label) => (
                        <div key={label} className="rounded-md border bg-[var(--color-card)] p-4">
                            <div className="text-xs uppercase tracking-wider text-[var(--color-muted-foreground)]">
                                {label}
                            </div>
                            <div className="mt-2 text-2xl font-semibold tabular-nums">—</div>
                        </div>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
