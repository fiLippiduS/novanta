/* Service worker: serve a due cose sole.
   La prima è che il gioco si possa aggiungere alla schermata Home e si apra
   come un'app, senza la barra del browser. La seconda è che, se la rete cade
   a metà partita, la pagina ci sia lo stesso.

   Strategia: prima la rete, la cache solo come rete di sicurezza. Senza
   bundler i nomi dei file non cambiano mai, e una cache aggressiva
   significherebbe servire la versione di ieri a chi ricarica. */

const CACHE = 'novanta-v2';
const CORE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/assets/favicon.svg',
  '/assets/icon-192.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;   // annunci e font restano fuori

  e.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(request).then((hit) => hit || caches.match('/index.html'))),
  );
});
