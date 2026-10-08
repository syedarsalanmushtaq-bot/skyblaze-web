/* Sky Blaze service worker.
 * Caches static assets (code, fonts, icons) so the app opens fast and installs as a PWA.
 * Never caches HTML pages or /api responses. Offline navigation shows offline.html.
 * It works out its own URL prefix from its scope, so it behaves under /skyblaze/ or at the root,
 * and ignores every request outside that prefix (other apps on the same host). */
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, '');
const CACHE_PREFIX = 'sky-blaze-static';
const CACHE = CACHE_PREFIX + '-v2-' + (BASE || 'root');
const PRECACHE = ['/offline.html', '/icons/icon-192.png', '/fonts/ChakraPetch-600.woff2', '/fonts/ChakraPetch-700.woff2', '/fonts/IBMPlexSans-400.woff2'].map((p) => BASE + p);

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname !== BASE && !url.pathname.startsWith(BASE + '/')) return;

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match(BASE + '/offline.html')));
    return;
  }
  const isStatic = url.pathname.startsWith(BASE + '/_next/static/') || url.pathname.startsWith(BASE + '/fonts/') || url.pathname.startsWith(BASE + '/icons/');
  if (!isStatic) return;
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
