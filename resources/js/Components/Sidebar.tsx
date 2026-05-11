import { Link, usePage } from '@inertiajs/react';
import {
    LayoutDashboard,
    ListChecks,
    Users,
    Package,
    Truck,
    AlertOctagon,
    Settings,
    Database,
    ChevronRight,
    type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItem = {
    label: string;
    href: string;
    icon: LucideIcon;
    badge?: number;
};

type NavSection = {
    title: string;
    items: NavItem[];
};

const sections: NavSection[] = [
    {
        title: 'Workspace',
        items: [
            { label: 'Operations Dashboard', href: '/', icon: LayoutDashboard },
            { label: "Today's Tasks", href: '/tasks', icon: ListChecks },
        ],
    },
    {
        title: 'Databases',
        items: [
            { label: 'Customers', href: '/customers', icon: Users },
            { label: 'Products', href: '/products', icon: Package },
            { label: 'Orders', href: '/orders', icon: Database },
            { label: 'Transporters', href: '/transporters', icon: Truck },
            { label: 'Returns', href: '/returns', icon: AlertOctagon },
        ],
    },
    {
        title: 'Settings',
        items: [
            { label: 'Settings', href: '/settings/profile', icon: Settings },
        ],
    },
];

export default function Sidebar() {
    const { url } = usePage();

    return (
        <aside className="flex h-screen w-60 shrink-0 flex-col border-r bg-[var(--color-muted)]/40">
            <div className="flex h-14 items-center gap-2 px-4">
                <span className="text-xl">⚡</span>
                <span className="font-semibold tracking-tight">GC Communication</span>
            </div>

            <nav className="flex-1 overflow-y-auto px-2 pb-4">
                {sections.map((section) => (
                    <div key={section.title} className="mb-4">
                        <div className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
                            {section.title}
                        </div>
                        <ul className="space-y-px">
                            {section.items.map((item) => {
                                const Icon = item.icon;
                                const active = url === item.href || (item.href !== '/' && url.startsWith(item.href));
                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            className={cn(
                                                'group flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                                                active
                                                    ? 'bg-[var(--color-accent)] text-[var(--color-foreground)]'
                                                    : 'text-[var(--color-foreground)]/80 hover:bg-[var(--color-accent)]/60'
                                            )}
                                        >
                                            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                                            <span className="flex-1 truncate">{item.label}</span>
                                            {item.badge !== undefined && (
                                                <span className="text-[11px] tabular-nums text-[var(--color-muted-foreground)]">
                                                    {item.badge}
                                                </span>
                                            )}
                                            <ChevronRight className="hidden h-3.5 w-3.5 text-[var(--color-muted-foreground)] group-hover:block" strokeWidth={1.5} />
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>
        </aside>
    );
}
