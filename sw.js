// Service worker MONTE. При изменении файлов сайта увеличьте номер версии.
const VERSION = 'monte-v1';
const SHELL = VERSION + '-shell';
const RUNTIME = VERSION + '-runtime';
const MAX_RUNTIME_ENTRIES = 120;

const PRECACHE = [
  './', 'index.html', 'tryon.html', 'pwa.js', 'manifest.webmanifest',
  'vendor/tailwindcss-3.4.17.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'
];
// Хосты, чьи файлы (шрифты, фото товаров) безопасно кешировать
const RUNTIME_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'images.unsplash.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Страница оплаты — всегда из сети, в кеш не кладём
  if (url.origin === location.origin && url.pathname.endsWith('/checkout.html')) return;

  // Страницы: сначала сеть, при отсутствии сети — кеш
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          if (res.ok) caches.open(SHELL).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
    );
    return;
  }

  // Свои файлы: из кеша, в фоне обновляем
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then((cached) => {
        const net = fetch(req).then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(SHELL).then((c) => c.put(req, copy)); }
          return res;
        }).catch(() => cached);
        return cached || net;
      })
    );
    return;
  }

  // Шрифты и фото товаров: из кеша, иначе сеть и запоминаем
  if (RUNTIME_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        if (res.ok || res.type === 'opaque') {
          const copy = res.clone();
          caches.open(RUNTIME).then((c) => c.put(req, copy)).then(() => trim(RUNTIME, MAX_RUNTIME_ENTRIES));
        }
        return res;
      }))
    );
  }
  // Остальное (камера, модели MediaPipe) — напрямую из сети
});
