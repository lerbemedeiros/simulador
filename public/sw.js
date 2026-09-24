// ============================================================
// Service Worker: stale-while-revalidate + LRU quota
// - Núcleo pré-cacheado (cache-first)
// - Texturas/diffuse: stale-while-revalidate com limite 80 entradas
// - Versão bumpada a cada build (simulador-v2) — caches antigos purgados
// ============================================================
const VERSAO = 'simulador-v9';
const NUCLEO = [
  './',
  './index.html',
  './manifest.webmanifest',
  // css/js com hash no build (ex: assets/index-*.js) não entram aqui — são cacheados dinamicamente no fetch
  './assets/ambientes/quarto_01/mascaras/mask_127_63_191.png',
  './assets/ambientes/quarto_01/mascaras/mask_159_64_64.png',
  './assets/ambientes/quarto_01/mascaras/mask_191_64_0.png',
  './assets/images/logo.svg',
  './assets/images/logo-branco.svg',
  './assets/images/icon-192.png',
  './assets/images/icon-512.png',
];

const MAX_TEXTURA_ENTRIES = 80;
const TEXTURA_RE = /\/assets\/texturas\/(diffuse|thumbs)\//;

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    const toDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(toDelete.map(k => cache.delete(k)));
  }
}

self.addEventListener('install', e => {
  e.waitUntil(
    caches
      .open(VERSAO)
      .then(c =>
        // tolerante: em prod vite gera assets com hash (css/style.css e js/main.js não existem) — não pode falhar install
        Promise.allSettled(NUCLEO.map(u => c.add(u).catch(() => {})))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches
      .keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;

  // Navegação / index.html: network-first — evita preloader infinito com index.html stale que aponta para hash antigo (vite)
  if (
    e.request.mode === 'navigate' ||
    u.pathname === '/' ||
    u.pathname.endsWith('/index.html') ||
    u.searchParams.has('t')
  ) {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          if (r.ok) {
            const copia = r.clone();
            caches.open(VERSAO).then(c => c.put(e.request, copia));
          }
          return r;
        })
        .catch(() => caches.match(e.request).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // Config e main: network-first para troca de ambiente refletir sem cache stale
  if (
    u.pathname.endsWith('/config.js') ||
    u.pathname.endsWith('/main.js') ||
    u.pathname.endsWith('/interaction.js')
  ) {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          if (r.ok) {
            const copia = r.clone();
            caches.open(VERSAO).then(c => c.put(e.request, copia));
          }
          return r;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Texturas: stale-while-revalidate com quota
  if (TEXTURA_RE.test(u.pathname)) {
    e.respondWith(
      (async () => {
        const cache = await caches.open(VERSAO);
        const cached = await cache.match(e.request);
        const fetchPromise = fetch(e.request)
          .then(async r => {
            if (r.ok) {
              cache.put(e.request, r.clone());
              // trim async sem bloquear resposta
              trimCache(VERSAO, MAX_TEXTURA_ENTRIES + NUCLEO.length).catch(() => {});
            }
            return r;
          })
          .catch(() => cached || caches.match('./index.html'));
        return cached || fetchPromise;
      })()
    );
    return;
  }

  // Demais assets: stale-while-revalidate genérico (cache-first com fallback)
  e.respondWith(
    caches.match(e.request).then(
      hit =>
        hit ||
        fetch(e.request)
          .then(r => {
            if (r.ok) {
              const copia = r.clone();
              caches.open(VERSAO).then(c => c.put(e.request, copia));
            }
            return r;
          })
          .catch(() => caches.match('./index.html'))
    )
  );
});
