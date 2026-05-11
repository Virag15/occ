import { Link } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';

export type Crumb = { label: string; href?: string };

export default function Breadcrumb({ items }: { items: Crumb[] }) {
    return (
        <nav className="flex items-center gap-1 text-sm text-[var(--color-muted-foreground)]">
            {items.map((crumb, i) => {
                const isLast = i === items.length - 1;
                return (
                    <span key={`${crumb.label}-${i}`} className="flex items-center gap-1">
                        {crumb.href && !isLast ? (
                            <Link
                                href={crumb.href}
                                className="rounded px-1 py-0.5 hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]"
                            >
                                {crumb.label}
                            </Link>
                        ) : (
                            <span className={isLast ? 'font-medium text-[var(--color-foreground)]' : ''}>
                                {crumb.label}
                            </span>
                        )}
                        {!isLast && <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />}
                    </span>
                );
            })}
        </nav>
    );
}
