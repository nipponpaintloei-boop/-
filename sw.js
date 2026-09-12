/* Paint Department Queue — offline app-shell cache.
   All queue data lives in localStorage (see index.html), never on a
   server, so this file has nothing to do with syncing data — its only
   job is making sure the page + its icons can still load with no
   internet connection.

   IMPORTANT: bump CACHE_NAME every time you upload a new index.html (or
   change any file listed in SHELL_FILES). Browsers keep serving the old
   cached copy to returning visitors until the cache name changes. */
const CACHE_NAME = 'pdq-shell-v1';

const SHELL_FILES = [
  './',
  './index.html',
  './favicon.ico',
  './manifest.webmanifest',
  './icons/favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/icon-152.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isPageLoad = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isPageLoad) {
    // Network-first for the page itself: people with internet always get
    // the latest version; people offline get whatever was last cached.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Cache-first for icons/manifest/etc. — they rarely change, and this
  // keeps the installed app snappy even on a slow connection.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      }).catch(() => cached);
    })
  );
});
