import { ReactNode } from 'react';
import Sidebar from '@/Components/Sidebar';
import Topbar from '@/Components/Topbar';
import { Crumb } from '@/Components/Breadcrumb';

type Props = {
    children: ReactNode;
    crumbs?: Crumb[];
};

export default function AppLayout({ children, crumbs = [] }: Props) {
    return (
        <div className="flex h-screen overflow-hidden bg-[var(--color-background)] text-[var(--color-foreground)]">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
                <Topbar crumbs={crumbs} />
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
