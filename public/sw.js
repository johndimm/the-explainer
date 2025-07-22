const CACHE_NAME = 'explainer-v2';
const urlsToCache = [
  // Removed '/' from cache to fix root path issue
  '/library',
  '/guide',
  '/credits',
  '/profile',
  '/favicon.ico',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/apple-touch-icon.png'
];

// Install event - cache resources with error handling
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Cache resources one by one to avoid failures
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(err => {
              console.warn('Failed to cache:', url, err);
              return null;
            })
          )
        );
      })
      .catch(err => {
        console.error('Cache installation failed:', err);
      })
  );
});

// Fetch event - serve from cache when offline with error handling
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip API requests
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Skip root path - always fetch fresh
  if (event.request.url.endsWith('/') || event.request.url.endsWith('/index.html')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        return fetch(event.request).catch(err => {
          console.warn('Fetch failed:', event.request.url, err);
          // Return a basic offline page for navigation requests
          if (event.request.destination === 'document') {
            return caches.match('/home'); // Use /home instead of /
          }
          return new Response('', { status: 404 });
        });
      })
      .catch(err => {
        console.error('Cache match failed:', err);
        return fetch(event.request).catch(() => {
          if (event.request.destination === 'document') {
            return caches.match('/home'); // Use /home instead of /
          }
          return new Response('', { status: 404 });
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
}); 