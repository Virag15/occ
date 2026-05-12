import { Info } from 'lucide-react';

/**
 * Shown on Index pages when the row cap has been hit — there are more matching
 * rows in the database than the controller returned. Tells the user that filters
 * still work on the visible window, and what would be needed to see everything.
 */
export function CapBanner({ shown, total, cap, entityLabel }: { shown: number; total: number; cap: number; entityLabel: string }) {
    if (shown < cap || total <= cap) return null;
    return (
        <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
                Showing the most recent <b>{cap}</b> of <b>{total.toLocaleString('en-IN')}</b> {entityLabel}.
                Use search and filters to narrow the list; the visible window updates as you refine.
            </p>
        </div>
    );
}
