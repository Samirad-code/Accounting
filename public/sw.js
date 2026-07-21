const CACHE_NAME = 'plasticban-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@100..900&display=swap'
];

// Install Event - Pre-cache core shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching core shell assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up stale cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Serve from Cache, fall back to Network, and Cache dynamically
self.addEventListener('fetch', (event) => {
  const reqUrl = new URL(event.request.url);

  // Skip non-GET requests (e.g., POST, PUT, DELETE for Firebase or other APIs)
  if (event.request.method !== 'GET') {
    return;
  }

  // Bypass caching in development environments to avoid stale code
  const isDev = reqUrl.hostname === 'localhost' || 
                reqUrl.hostname === '127.0.0.1' || 
                reqUrl.hostname.includes('-dev-') ||
                reqUrl.hostname.includes('.run.app');
  if (isDev) {
    return;
  }

  // Skip Firebase Firestore sync websocket/polling or other cloud functions
  if (reqUrl.hostname.includes('firestore.googleapis.com') || reqUrl.hostname.includes('firebase')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // If it's a core asset, or an esm.sh dependency, or Google Font, use Stale-While-Revalidate:
        // Return cached response instantly, but fetch update in background to keep cache fresh.
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {
          // Ignore background fetch errors (e.g., when offline)
        });
        
        return cachedResponse;
      }

      // If not in cache, fetch from network
      return fetch(event.request).then((networkResponse) => {
        // Check if we received a valid response to cache
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error') {
          return networkResponse;
        }

        // Cache newly fetched assets dynamically (local JS/CSS assets, esm.sh sub-dependencies, images, etc.)
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch((err) => {
        // If offline and request is for a document (navigation page), return the cached index.html
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
        throw err;
      });
    })
  );
});
