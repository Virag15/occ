/**
 * Offline write queue (M7-C).
 *
 * enqueue() persists a mutation in IndexedDB with a stable
 * Idempotency-Key. flush() replays every pending row, in insertion
 * order, against the server. Replay safety is the server's job
 * (IdempotencyMiddleware, M7-B) — this side only guarantees the request
 * is never lost and is sent at most "once delivered", in order.
 *
 * Failure policy:
 *   - network error / 5xx  → keep queued, stop the flush (try later)
 *   - 409 (in flight)      → keep queued, stop (server still finishing)
 *   - 4xx (validation etc) → mark 'failed', keep the row for the UI to
 *                            surface, continue with the rest
 *   - 2xx / 3xx            → delivered, drop the row
 */

import { QueuedRequest, dbAdd, dbAll, dbDelete, dbPut } from './db';

export type { QueuedRequest } from './db';

type Listener = (rows: QueuedRequest[]) => void;
const listeners = new Set<Listener>();

function uuid(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    return 'occ-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

async function notify(): Promise<void> {
    const rows = await dbAll();
    listeners.forEach((l) => l(rows));
}

export function onQueueChange(l: Listener): () => void {
    listeners.add(l);
    void notify();
    return () => listeners.delete(l);
}

export async function pendingCount(): Promise<number> {
    return (await dbAll()).length;
}

/** Queue a mutation. Returns the stable idempotency key. */
export async function enqueue(
    method: string,
    url: string,
    body: unknown,
    label: string,
): Promise<string> {
    const idempotencyKey = uuid();
    await dbAdd({
        idempotencyKey,
        method: method.toUpperCase(),
        url,
        body,
        label,
        createdAt: Date.now(),
        attempts: 0,
        status: 'pending',
    });
    await notify();
    return idempotencyKey;
}

function csrfToken(): string {
    return (
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ??
        decodeURIComponent(
            document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '',
        )
    );
}

let flushing = false;

/**
 * Replay the queue. Safe to call repeatedly (re-entrancy guarded).
 * Returns the number of rows successfully delivered.
 */
export async function flush(): Promise<number> {
    if (flushing || (typeof navigator !== 'undefined' && navigator.onLine === false)) return 0;
    flushing = true;
    let delivered = 0;
    try {
        const rows = (await dbAll()).filter((r) => r.status === 'pending');
        for (const row of rows) {
            try {
                const res = await fetch(row.url, {
                    method: row.method,
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-XSRF-TOKEN': csrfToken(),
                        'Idempotency-Key': row.idempotencyKey,
                    },
                    body: row.body == null ? undefined : JSON.stringify(row.body),
                    credentials: 'same-origin',
                });

                if (res.status >= 500 || res.status === 409) {
                    break; // transient — leave the whole queue, retry later
                }
                if (res.status >= 400) {
                    row.status = 'failed';
                    row.attempts += 1;
                    row.lastError = `HTTP ${res.status}`;
                    await dbPut(row);
                    continue; // permanent for this row; keep going
                }
                if (row.id != null) await dbDelete(row.id);
                delivered += 1;
            } catch {
                break; // offline mid-flush — stop, stay queued
            }
        }
    } finally {
        flushing = false;
        await notify();
    }
    return delivered;
}

export async function discard(id: number): Promise<void> {
    await dbDelete(id);
    await notify();
}

/** Wire automatic flushing: on regained connectivity and on tab focus. */
export function startAutoFlush(): void {
    if (typeof window === 'undefined') return;
    const tryFlush = () => void flush();
    window.addEventListener('online', tryFlush);
    window.addEventListener('focus', tryFlush);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') tryFlush();
    });
    tryFlush();
}
