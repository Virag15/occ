import { Sheet, SheetContent } from '@/Components/ui/sheet';
import { ReactNode } from 'react';
import { closePeek } from '@/Components/notion/DatabaseTable';
import { PropertyCell, PropertyType, PropertyValue } from '@/Components/notion/PropertyCell';
import type { BadgeColor } from '@/Components/ui/badge';
import { cn } from '@/lib/utils';

export type PeekProperty = {
    key: string;
    label: string;
    type: PropertyType;
    value: PropertyValue;
    badgeColor?: BadgeColor;
};

type SidePeekProps = {
    open: boolean;
    title: string;
    subtitle?: string;
    icon?: ReactNode;
    properties: PeekProperty[];
    actions?: ReactNode;
    readOnly?: boolean;
};

export function SidePeek({
    open,
    title,
    subtitle,
    icon,
    properties,
    actions,
    readOnly,
}: SidePeekProps) {
    return (
        <Sheet open={open} onOpenChange={(o) => { if (!o) closePeek(); }}>
            <SheetContent>
                <div className="border-b px-6 py-5">
                    <div className="flex items-start gap-3">
                        {icon && <div className="mt-1 text-xl">{icon}</div>}
                        <div className="flex-1">
                            <h2 className="leading-tight">{title}</h2>
                            {subtitle && (
                                <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {readOnly && (
                        <div className="mb-4 rounded-md border bg-[var(--color-muted)]/40 px-3 py-2 text-xs text-[var(--color-muted-foreground)]">
                            Read-only — data syncs from Tally.
                        </div>
                    )}

                    <dl className="space-y-2">
                        {properties.map((p) => (
                            <div
                                key={p.key}
                                className={cn(
                                    'grid grid-cols-[160px_1fr] items-start gap-3 rounded-md px-2 py-1.5 hover:bg-[var(--color-accent)]/40',
                                )}
                            >
                                <dt className="text-xs text-[var(--color-muted-foreground)]">{p.label}</dt>
                                <dd className="text-sm">
                                    <PropertyCell type={p.type} value={p.value} badgeColor={p.badgeColor} />
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>

                {actions && (
                    <div className="border-t px-6 py-3">
                        {actions}
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
