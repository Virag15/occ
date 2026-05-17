import { Link } from '@inertiajs/react';
import {
    Building2, Plug, Tag, Receipt,
    type LucideIcon,
} from '@/lib/icons';
import { cn } from '@/lib/utils';

type SettingsItemId = 'company' | 'branding' | 'integrations' | 'tally-mapping';

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
    { id: 'branding', label: 'Branding', icon: Tag, iconBg: 'bg-amber-500/15', iconColor: 'text-amber-600', href: '/settings/branding' },
    { id: 'integrations', label: 'Integrations', icon: Plug, iconBg: 'bg-purple-500/15', iconColor: 'text-purple-600', href: '/settings/integrations' },
    { id: 'tally-mapping', label: 'Tally mapping', icon: Receipt, iconBg: 'bg-emerald-500/15', iconColor: 'text-emerald-600', href: '/settings/tally-mapping' },
];

export function SettingsShell({ active, children }: { active: SettingsItemId | null; children: React.ReactNode }) {
    return (
        // items-start lets the aside become a sticky positioning context within the grid
        // without stretching to the right column's height.
        <div className="grid items-start gap-5 md:grid-cols-[220px_1fr]">
            {/* Left rail — macOS System Settings vibe; sticky so it stays in view while
                a long Company or Integrations panel scrolls on the right. */}
            <aside className="space-y-0.5 md:sticky md:top-4">
                {ITEMS.map((it) => {
                    const Icon = it.icon;
                    const isActive = it.id === active;
                    return (
                        <Link
                            key={it.id}
                            href={it.href}
                            className={cn(
                                'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                                isActive
                                    ? 'font-medium text-foreground'
                                    : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                            )}
                        >
                            {/* Sidebar-style dot — coloured when active, faded otherwise */}
                            <span className={cn(
                                'h-1.5 w-1.5 shrink-0 rounded-full',
                                isActive ? 'bg-primary' : 'bg-muted-foreground/40',
                            )} />
                            <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', it.iconBg)}>
                                <Icon className={cn('h-3.5 w-3.5', it.iconColor)} />
                            </span>
                            <span className="flex flex-1 items-center gap-1.5">
                                {it.label}
                                {it.soon && (
                                    <span className="rounded bg-muted px-1 py-px text-[9px] uppercase tracking-wider text-muted-foreground">
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
