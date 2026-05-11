import { Link } from '@inertiajs/react';
import {
    Building2, Plug, Users, History, UserCog, Palette, Shield,
    type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SettingsItemId =
    | 'company' | 'branding'
    | 'integrations'
    | 'team' | 'audit'
    | 'profile';

type SettingsItem = {
    id: SettingsItemId;
    label: string;
    description: string;
    href: string;
    icon: LucideIcon;
    soon?: boolean;
};

type SettingsGroup = {
    label: string;
    items: SettingsItem[];
};

const GROUPS: SettingsGroup[] = [
    {
        label: 'Organization',
        items: [
            { id: 'company', label: 'Company', icon: Building2, href: '/settings/company', description: 'Logo, signature, address, GSTIN, bank, signatory, T&C' },
            { id: 'branding', label: 'Branding', icon: Palette, href: '/settings/company', description: 'Theme colours, dark mode (coming)', soon: true },
        ],
    },
    {
        label: 'Connections',
        items: [
            { id: 'integrations', label: 'Integrations', icon: Plug, href: '/settings/integrations', description: 'Tally bridge, WhatsApp, webhooks' },
        ],
    },
    {
        label: 'Workspace',
        items: [
            { id: 'team', label: 'Users & roles', icon: Users, href: '/users', description: 'Add team members, assign roles' },
            { id: 'audit', label: 'Activity log', icon: History, href: '/audit-logs', description: 'Every change recorded, searchable' },
        ],
    },
    {
        label: 'You',
        items: [
            { id: 'profile', label: 'Profile', icon: UserCog, href: '/profile', description: 'Your account, password, display density' },
        ],
    },
];

export function SettingsShell({ active, children }: { active: SettingsItemId | null; children: React.ReactNode }) {
    return (
        <div className="grid gap-5 md:grid-cols-[240px_1fr]">
            {/* Left rail */}
            <aside className="space-y-5">
                {GROUPS.map((group) => (
                    <div key={group.label}>
                        <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</p>
                        <nav className="space-y-0.5">
                            {group.items.map((it) => {
                                const Icon = it.icon;
                                const isActive = it.id === active;
                                return (
                                    <Link
                                        key={it.id}
                                        href={it.href}
                                        className={cn(
                                            'flex items-start gap-2.5 rounded-md px-2 py-2 text-sm transition-colors',
                                            isActive
                                                ? 'bg-primary/10 text-foreground'
                                                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                                        )}
                                    >
                                        <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', isActive && 'text-primary')} />
                                        <span className="min-w-0">
                                            <span className={cn('flex items-center gap-1.5 font-medium', isActive && 'text-foreground')}>
                                                {it.label}
                                                {it.soon && <span className="rounded bg-muted px-1 py-px text-[9px] uppercase tracking-wider text-muted-foreground">Soon</span>}
                                            </span>
                                            <span className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground/80">{it.description}</span>
                                        </span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                ))}
            </aside>

            {/* Right column */}
            <div className="min-w-0">{children}</div>
        </div>
    );
}
