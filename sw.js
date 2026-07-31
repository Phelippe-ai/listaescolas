/* Service Worker — Fala Tio · Prospecção (PWA)
   Estratégia: network-first (sempre busca a versão mais nova online;
   usa o cache só como reserva quando estiver offline). */
const CACHE = 'falatio-v4';
const SHELL = [
  './', './index.html', './css/styles.css',
  './js/config.js', './js/cloud.js', './js/data.js', './js/app.js',
  './assets/falatio-logo.png', './assets/header-bg.jpg',
  './assets/icon-192.png', './assets/icon-512.png', './assets/apple-touch-icon.png',
  './manifest.webmanifest',
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Só cuida do próprio site; Supabase/CDN sempre vão direto à rede.
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
