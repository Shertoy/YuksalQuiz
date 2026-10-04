/**
 * YuksalQuiz Offline PWA Service Worker (v2.1)
 * Network-First for HTML documents to guarantee users always receive the latest app updates.
 * Auto-purges all stale caches upon activation.
 */

const CACHE_NAME = 'yuksalquiz-v2.1-shell';
const OFFLINE_URL = '/offline.html';

const PRECACHE_ASSETS = [
  '/offline.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons.svg',
  '/avatars/avatar_1.png',
  '/avatars/avatar_2.png',
  '/avatars/avatar_3.png',
  '/avatars/avatar_4.png',
  '/avatars/avatar_5.png',
  '/avatars/avatar_6.png',
  '/avatars/avatar_7.png',
  '/avatars/avatar_8.png',
  '/avatars/avatar_9.png',
  '/avatars/avatar_10.png',
];

// Install: Pre-cache static assets and skip waiting immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('SW: Precache asset warning:', err);
      });
    })
  );
});

// Activate: Completely purge all older caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-First for HTML documents; cache with revalidation for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests and http/https schemes
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  // 1. Navigation requests (HTML documents): NEVER cache, ALWAYS fetch from network
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .catch(async () => {
          // If totally offline, show dedicated offline page
          const cache = await caches.open(CACHE_NAME);
          const offlineFallback = await cache.match(OFFLINE_URL);
          return offlineFallback || new Response('Internet aloqasi yo\'q', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        })
    );
    return;
  }

  // 2. Static Assets (CSS, JS, Fonts, Images)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          if (request.destination === 'image') {
            return caches.match('/favicon.svg');
          }
          return cachedResponse;
        });

      // Return cached immediately if available, while updating in background
      return cachedResponse || fetchPromise;
    })
  );
});
