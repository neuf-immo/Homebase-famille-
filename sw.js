// ═══════════════════════════════════════════════════════════════
// Famille Abiome — Service Worker
// Permet d'ouvrir l'application même sans connexion internet.
// Stratégie "stale-while-revalidate" : sert le cache instantanément,
// puis va chercher la nouvelle version en arrière-plan pour la
// prochaine visite (jamais bloqué sur une vieille version).
// ═══════════════════════════════════════════════════════════════

// ⚠️ Change ce numéro à chaque fois que tu republies index.html
// pour forcer les appareils à récupérer la nouvelle version.
const CACHE_NAME = 'homebase-abiome-v1';
const APP_SHELL = ['./', './index.html'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Seules les requêtes GET du même site (l'app elle-même) passent par le cache.
  // Les appels vers Firebase (données) partent toujours directement sur le réseau :
  // l'app gère déjà elle-même sa file d'attente hors-ligne pour les données.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached); // pas de réseau → on retombe sur le cache

      // Sert le cache immédiatement s'il existe, sinon attend le réseau
      return cached || network;
    })
  );
});
