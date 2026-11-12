/* MONTE offline shell — GitHub Pages compatible */
const CACHE_NAME = 'monte-pwa-v2';
const SCOPE_URL = self.registration.scope;
const CORE_FILES = [
  './', './index.html', './tryon.html', './privacy.html', './consent.html', './checkout.html',
  './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png',
  './hero-youth.jpg', './hero-minimal.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(CORE_FILES.map(async path => {
      try { await cache.add(new Request(new URL(path, SCOPE_URL), { cache: 'reload' })); }
      catch (error) { /* An optional image must not block installation. */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('monte-pwa-') && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      // Network-first prevents old HTML, icons and scripts from sticking after a GitHub Pages update.
      const response = await fetch(request, { cache: 'no-cache' });
      if (response && response.ok) await cache.put(request, response.clone());
      return response;
    } catch (error) {
      const cached = await cache.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') {
        return (await cache.match(new URL('./index.html', SCOPE_URL))) || Response.error();
      }
      return Response.error();
    }
  })());
});
