/* OCC service worker — offline shell (M7-A).
 *
 * Scope: the whole app. Strategy:
 *   - Precache the offline fallback + app icons.
 *   - Hashed build assets (/build/*) are immutable → cache-first.
 *   - Navigations (full document loads) → network-first, fall back to
 *     the last good document, then to /offline.html. Inertia XHR
 *     navigations and writes are NOT handled here — the client offline
 *     queue (M7-C) owns write durability; the SW only keeps the shell
 *     openable with no network.
 *
 * Bump CACHE_VERSION to force every client onto a fresh cache.
 */
const CACHE_VERSION = 'occ-v1';
const PRECACHE = `${CACHE_VERSION}-precache`;
const RUNTIME = `${CACHE_VERSION}-runtime`;

const PRECACHE_URLS = ['/offline.html', '/icon.svg', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(PRECACHE).then((c) => c.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((k) => !k.startsWith(CACHE_VERSION))
                        .map((k) => caches.delete(k)),
                ),
            )
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Only GET is cacheable. Never intercept mutations — the offline
    // queue handles those so we don't accidentally serve a stale write.
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    // Immutable hashed build assets → cache-first.
    if (url.pathname.startsWith('/build/')) {
        event.respondWith(
            caches.open(RUNTIME).then(async (cache) => {
                const hit = await cache.match(request);
                if (hit) return hit;
                const res = await fetch(request);
                if (res.ok) cache.put(request, res.clone());
                return res;
            }),
        );
        return;
    }

    // Document navigations → network-first with offline fallback.
    if (request.mode === 'navigate') {
        event.respondWith(
            (async () => {
                try {
                    const res = await fetch(request);
                    const cache = await caches.open(RUNTIME);
                    cache.put(request, res.clone());
                    return res;
                } catch {
                    const cache = await caches.open(RUNTIME);
                    return (
                        (await cache.match(request)) ||
                        (await caches.match('/offline.html'))
                    );
                }
            })(),
        );
    }
});
