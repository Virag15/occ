import { Link } from '@inertiajs/react';
import { Building2, Plug } from 'lucide-react';
import { cn } from '@/lib/utils';

type TabId = 'company' | 'integrations';

const TABS: { id: TabId; label: string; href: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'company', label: 'Company', href: '/settings/company', icon: Building2 },
    { id: 'integrations', label: 'Integrations', href: '/settings/integrations', icon: Plug },
];

export function SettingsShell({ active, children }: { active: TabId; children: React.ReactNode }) {
    return (
        <div className="space-y-4">
            {/* Tab strip */}
            <div className="flex flex-wrap items-center gap-1 border-b">
                {TABS.map((t) => {
                    const Icon = t.icon;
                    const isActive = t.id === active;
                    return (
                        <Link
                            key={t.id}
                            href={t.href}
                            className={cn(
                                'inline-flex items-center gap-2 border-b-2 px-3 py-2 -mb-px text-sm transition-colors',
                                isActive
                                    ? 'border-primary text-foreground font-medium'
                                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                            )}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {t.label}
                        </Link>
                    );
                })}
            </div>

            {children}
        </div>
    );
}
