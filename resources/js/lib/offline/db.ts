/**
 * Minimal IndexedDB wrapper for the offline write queue (M7-C).
 *
 * No dependency: native IndexedDB, one object store `queue` keyed by an
 * autoincrement id. Each row is a mutation the user performed while the
 * server was unreachable; it is replayed verbatim (with its stable
 * Idempotency-Key) once connectivity returns, and the server-side
 * IdempotencyMiddleware (M7-B) guarantees a replay can't double-write.
 */

export type QueuedRequest = {
    id?: number;
    idempotencyKey: string;
    method: string;
    url: string;
    body: unknown;
    label: string; // human text for the sync UI ("New order — Acme")
    createdAt: number;
    attempts: number;
    status: 'pending' | 'failed';
    lastError?: string;
};

const DB_NAME = 'occ-offline';
const DB_VERSION = 1;
const STORE = 'queue';

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB unavailable'));
            return;
        }
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
    return dbPromise;
}

function tx(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
    return db.transaction(STORE, mode).objectStore(STORE);
}

export async function dbAdd(row: QueuedRequest): Promise<number> {
    const db = await open();
    return new Promise((resolve, reject) => {
        const req = tx(db, 'readwrite').add(row);
        req.onsuccess = () => resolve(req.result as number);
        req.onerror = () => reject(req.error);
    });
}

export async function dbAll(): Promise<QueuedRequest[]> {
    const db = await open();
    return new Promise((resolve, reject) => {
        const req = tx(db, 'readonly').getAll();
        req.onsuccess = () => resolve((req.result as QueuedRequest[]) ?? []);
        req.onerror = () => reject(req.error);
    });
}

export async function dbPut(row: QueuedRequest): Promise<void> {
    const db = await open();
    return new Promise((resolve, reject) => {
        const req = tx(db, 'readwrite').put(row);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

export async function dbDelete(id: number): Promise<void> {
    const db = await open();
    return new Promise((resolve, reject) => {
        const req = tx(db, 'readwrite').delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}
