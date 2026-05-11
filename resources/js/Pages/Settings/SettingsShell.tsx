import { Link } from '@inertiajs/react';
import {
    Building2, Plug, Users, History, UserCog, Palette,
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
    href: string;
    icon: LucideIcon;
    iconBg: string;     // translucent tinted background
    iconColor: string;  // matching saturated text colour for the glyph
    soon?: boolean;
};

const ITEMS: SettingsItem[] = [
    { id: 'company', label: 'Company', icon: Building2, iconBg: 'bg-blue-500/15', iconColor: 'text-blue-600', href: '/settings/company' },
    { id: 'branding', label: 'Branding', icon: Palette, iconBg: 'bg-pink-500/15', iconColor: 'text-pink-600', href: '/settings/company', soon: true },
    { id: 'integrations', label: 'Integrations', icon: Plug, iconBg: 'bg-purple-500/15', iconColor: 'text-purple-600', href: '/settings/integrations' },
    { id: 'team', label: 'Users & roles', icon: Users, iconBg: 'bg-indigo-500/15', iconColor: 'text-indigo-600', href: '/users' },
    { id: 'audit', label: 'Activity log', icon: History, iconBg: 'bg-gray-500/15', iconColor: 'text-gray-600', href: '/audit-logs' },
    { id: 'profile', label: 'Profile', icon: UserCog, iconBg: 'bg-emerald-500/15', iconColor: 'text-emerald-600', href: '/profile' },
];

export function SettingsShell({ active, children }: { active: SettingsItemId | null; children: React.ReactNode }) {
    return (
        <div className="grid gap-5 md:grid-cols-[220px_1fr]">
            {/* Left rail — macOS System Settings vibe */}
            <aside className="space-y-0.5">
                {ITEMS.map((it) => {
                    const Icon = it.icon;
                    const isActive = it.id === active;
                    return (
                        <Link
                            key={it.id}
                            href={it.href}
                            className={cn(
                                'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
                                isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-foreground hover:bg-muted/60',
                            )}
                        >
                            <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', it.iconBg)}>
                                <Icon className={cn('h-3.5 w-3.5', it.iconColor)} />
                            </span>
                            <span className="flex flex-1 items-center gap-1.5 font-medium">
                                {it.label}
                                {it.soon && (
                                    <span className={cn(
                                        'rounded px-1 py-px text-[9px] uppercase tracking-wider',
                                        isActive ? 'bg-white/20 text-white/80' : 'bg-muted text-muted-foreground',
                                    )}>
                                        Soon
                                    </span>
                                )}
                            </span>
                        </Link>
                    );
                })}
            </aside>

            {/* Right content */}
            <div className="min-w-0">{children}</div>
        </div>
    );
}

// ─── Optional: row component for sub-page navigation (matches macOS right-panel rows) ──────────

/**
 * Use inside a settings page when the content is a list of clickable sub-pages
 * (icon · label · chevron), e.g. for the Branding tab or a future Company
 * landing page that drills into Identity / Address / Tax IDs etc.
 */
export function SettingsRowGroup({ children }: { children: React.ReactNode }) {
    return (
        <div className="overflow-hidden rounded-lg border bg-card">
            {children}
        </div>
    );
}

export function SettingsRow({
    icon: Icon, iconBg = 'bg-gray-500/15', iconColor = 'text-gray-600', label, sublabel, href, onClick,
}: {
    icon: LucideIcon;
    iconBg?: string;
    iconColor?: string;
    label: string;
    sublabel?: string;
    href?: string;
    onClick?: () => void;
}) {
    const inner = (
        <>
            <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', iconBg)}>
                <Icon className={cn('h-4 w-4', iconColor)} />
            </span>
            <span className="flex flex-1 flex-col">
                <span className="text-sm font-medium">{label}</span>
                {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
            </span>
            <span className="text-muted-foreground">›</span>
        </>
    );
    const cls = 'flex w-full items-center gap-3 border-b px-3 py-2.5 last:border-0 hover:bg-muted/40 transition-colors text-left';
    if (href) {
        return <Link href={href} className={cls}>{inner}</Link>;
    }
    return <button type="button" onClick={onClick} className={cls}>{inner}</button>;
}
