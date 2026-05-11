import * as React from 'react';
import { cn } from '@/lib/utils';

const colorMap = {
    blue: 'bg-[var(--color-notion-blue)]/10 text-[var(--color-notion-blue)]',
    green: 'bg-[var(--color-notion-green)]/10 text-[var(--color-notion-green)]',
    yellow: 'bg-[var(--color-notion-yellow)]/15 text-[var(--color-notion-yellow)]',
    orange: 'bg-[var(--color-notion-orange)]/10 text-[var(--color-notion-orange)]',
    red: 'bg-[var(--color-notion-red)]/10 text-[var(--color-notion-red)]',
    purple: 'bg-[var(--color-notion-purple)]/10 text-[var(--color-notion-purple)]',
    pink: 'bg-[var(--color-notion-pink)]/10 text-[var(--color-notion-pink)]',
    brown: 'bg-[var(--color-notion-brown)]/15 text-[var(--color-notion-brown)]',
    gray: 'bg-[var(--color-notion-gray)]/15 text-[var(--color-notion-gray)]',
    default: 'bg-[var(--color-accent)] text-[var(--color-foreground)]/80',
} as const;

export type BadgeColor = keyof typeof colorMap;

export function Badge({
    children,
    color = 'default',
    className,
}: {
    children: React.ReactNode;
    color?: BadgeColor;
    className?: string;
}) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                colorMap[color],
                className,
            )}
        >
            <span className={cn('h-1.5 w-1.5 rounded-full', `bg-current opacity-80`)} />
            {children}
        </span>
    );
}
