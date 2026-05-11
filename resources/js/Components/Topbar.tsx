import { Search } from 'lucide-react';
import { usePage, Link } from '@inertiajs/react';
import Breadcrumb, { Crumb } from '@/Components/Breadcrumb';
import type { PageProps } from '@/types';

export default function Topbar({ crumbs }: { crumbs: Crumb[] }) {
    const { props } = usePage<PageProps>();
    const user = props.auth?.user;
    const initials = user?.name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';

    return (
        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-[var(--color-background)] px-4">
            <Breadcrumb items={crumbs} />

            <div className="flex items-center gap-3">
                <button
                    type="button"
                    className="flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]"
                    aria-label="Search"
                >
                    <Search className="h-3.5 w-3.5" strokeWidth={1.75} />
                    <span>Search</span>
                    <kbd className="rounded border bg-[var(--color-muted)] px-1 py-px text-[10px]">⌘K</kbd>
                </button>

                {user && (
                    <Link
                        href="/profile"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-medium text-[var(--color-primary-foreground)]"
                        title={user.name}
                    >
                        {initials}
                    </Link>
                )}
            </div>
        </header>
    );
}
