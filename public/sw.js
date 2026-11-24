/**
 * StudyCircle Secure Progressive Web App Service Worker
 * 
 * Strict Security Policy:
 * - CACHES ONLY safe static assets (HTML, JS, CSS, public icons/images, fonts).
 * - NEVER caches private API responses, user tokens, Supabase database queries, or auth payloads.
 * - Enforces network-only bypass for all supabase.co, /auth/v1, /rest/v1 requests and any request carrying Authorization or apikey headers.
 * - Provides graceful offline fallback for navigation requests when network is unavailable.
 */

const CACHE_VERSION = 'studycircle-v1.0.0';
const STATIC_CACHE_NAME = `studycircle-static-${CACHE_VERSION}`;

const SAFE_STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-icon-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
];

// Helper to determine if a request must strictly NEVER be cached
function isForbiddenFromCache(request, url) {
  // Non-GET requests (mutations, login, etc.) must NEVER be cached
  if (request.method !== 'GET') {
    return true;
  }

  // Supabase endpoints (Auth, PostgREST database queries, Realtime, Storage private endpoints)
  if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.in')) {
    return true;
  }

  // REST or Auth API path patterns
  if (
    url.pathname.startsWith('/rest/v1') ||
    url.pathname.startsWith('/auth/v1') ||
    url.pathname.startsWith('/storage/v1') ||
    url.pathname.includes('/api/')
  ) {
    return true;
  }

  // Authorization or API key headers present
  if (request.headers.has('Authorization') || request.headers.has('apikey')) {
    return true;
  }

  return false;
}

// Helper to check if asset is a safe origin static asset
function isSafeStaticAsset(url) {
  // Same origin check
  if (url.origin === self.location.origin) {
    // Only cache static file extensions
    const pathname = url.pathname;
    return (
      pathname === '/' ||
      pathname.endsWith('.html') ||
      pathname.endsWith('.js') ||
      pathname.endsWith('.css') ||
      pathname.endsWith('.svg') ||
      pathname.endsWith('.png') ||
      pathname.endsWith('.jpg') ||
      pathname.endsWith('.ico') ||
      pathname.endsWith('.json') ||
      pathname.endsWith('.woff2') ||
      pathname.startsWith('/assets/') ||
      pathname.startsWith('/icons/')
    );
  }

  // Allow trusted external static CDN assets (e.g., Google Fonts stylesheets and font files)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    return true;
  }

  return false;
}

// Install Event — precache safe static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then(async (cache) => {
      // Precache individual items resiliently
      for (const asset of SAFE_STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('[SW] Could not precache:', asset, err);
        }
      }
    })
  );
  self.skipWaiting();
});

// Activate Event — cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE_NAME) {
            console.log('[SW] Deleting legacy cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event — Security & Cache routing
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Mandatory Security Rule: bypass all private API and auth requests directly to network
  if (isForbiddenFromCache(request, url)) {
    // Do NOT cache, do NOT intercept with CacheStorage
    event.respondWith(fetch(request));
    return;
  }

  // 2. Navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If valid response, update root cache clone
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Offline fallback
          const cache = await caches.open(STATIC_CACHE_NAME);
          const cachedIndex = await cache.match('/index.html');
          if (cachedIndex) return cachedIndex;

          const cachedOffline = await cache.match('/offline.html');
          if (cachedOffline) return cachedOffline;

          return new Response('Network offline', { status: 503, statusText: 'Service Unavailable' });
        })
    );
    return;
  }

  // 3. Safe static assets: Stale-While-Revalidate
  if (isSafeStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);

        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch((err) => {
            // Return cached response if network fails
            if (cachedResponse) return cachedResponse;
            throw err;
          });

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 4. Default: pass-through to network
  event.respondWith(fetch(request));
});
