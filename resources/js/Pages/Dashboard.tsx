import { Head } from '@inertiajs/react';
import { useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, Truck, FileWarning, IndianRupee, LucideIcon } from 'lucide-react';

interface StatCard {
    title: string;
    value: string | number;
    sub: string;
    icon: LucideIcon;
}

export default function Dashboard() {
    useEffect(() => {
        document.title = 'Dashboard — OCC';
    }, []);

    const statCards: StatCard[] = [
        { title: 'Orders today', value: 0, sub: '0 dispatched', icon: ShoppingCart },
        { title: 'Pending dispatch', value: 0, sub: 'Awaiting LR', icon: Truck },
        { title: 'Triplicates awaited', value: 0, sub: 'Delivered, no triplicate', icon: FileWarning },
        { title: 'Overdue payments', value: '₹0', sub: 'Across all customers', icon: IndianRupee },
    ];

    return (
        <AdminLayout breadcrumbs={[{ label: 'Dashboard' }]}>
            <Head title="Operations Dashboard" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Operations Dashboard</h1>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
                    {statCards.map((stat) => (
                        <Card key={stat.title}>
                            <CardContent className="p-3">
                                <div className="flex items-start justify-between gap-1">
                                    <div className="space-y-0.5 min-w-0">
                                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground truncate">{stat.title}</p>
                                        <span className="text-xl font-bold tabular-nums tracking-tight block">{stat.value}</span>
                                        <p className="text-[10px] text-muted-foreground">{stat.sub}</p>
                                    </div>
                                    <div className="flex size-7 items-center justify-center rounded-md bg-muted shrink-0">
                                        <stat.icon className="size-3.5 text-muted-foreground" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Card>
                    <CardContent className="p-8 text-center text-sm text-muted-foreground">
                        Charts and action queues land in Phase 3. Numbers above are placeholders until Phase 2 (Orders core) is shipped.
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
