import { useEffect, useState } from 'react';
import { RefreshCw, AlertCircle } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { onQueueChange, flush, type QueuedRequest } from '@/lib/offline/queue';

/**
 * Header chip for the offline write queue (M7-C). Invisible when online
 * with an empty queue (the common case — no chrome noise). Surfaces:
 *   - offline state
 *   - "N waiting to sync" with a manual retry
 *   - failed rows that need attention
 */
export function OfflineSyncIndicator() {
    const [rows, setRows] = useState<QueuedRequest[]>([]);
    const [online, setOnline] = useState(
        typeof navigator === 'undefined' ? true : navigator.onLine,
    );

    useEffect(() => onQueueChange(setRows), []);

    useEffect(() => {
        const up = () => setOnline(true);
        const down = () => setOnline(false);
        window.addEventListener('online', up);
        window.addEventListener('offline', down);
        return () => {
            window.removeEventListener('online', up);
            window.removeEventListener('offline', down);
        };
    }, []);

    const pending = rows.filter((r) => r.status === 'pending').length;
    const failed = rows.filter((r) => r.status === 'failed').length;

    if (online && pending === 0 && failed === 0) return null;

    return (
        <button
            type="button"
            onClick={() => void flush()}
            title={
                !online
                    ? 'Offline — changes are saved on this device and will sync automatically'
                    : failed > 0
                      ? `${failed} change(s) failed to sync — tap to retry`
                      : `${pending} change(s) waiting to sync — tap to sync now`
            }
            className={cn(
                'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                !online && 'bg-muted text-muted-foreground',
                online && failed > 0 && 'bg-destructive/10 text-destructive',
                online && failed === 0 && pending > 0 && 'bg-amber-500/15 text-amber-700',
            )}
        >
            {!online ? (
                <>
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
                    Offline{pending > 0 ? ` · ${pending} queued` : ''}
                </>
            ) : failed > 0 ? (
                <>
                    <AlertCircle className="h-3 w-3" />
                    {failed} failed{pending > 0 ? ` · ${pending} queued` : ''}
                </>
            ) : (
                <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Syncing {pending}
                </>
            )}
        </button>
    );
}
