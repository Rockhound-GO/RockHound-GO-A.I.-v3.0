

const CACHE_NAME = 'rockhound-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/audio/optimal_ping.mp3', // New audio asset
  '/audio/capture_shutter.mp3', // New audio asset
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Cache-first strategy for static assets and CDN libraries
  // Expanded to cover react-three-fiber, drei, and potential GLTF/texture CDNs
  if (
    url.hostname.includes('cdn') || 
    url.hostname.includes('googleapis') || 
    url.hostname.includes('gstatic') ||
    url.hostname.includes('aistudiocdn') ||
    url.hostname.includes('unpkg') || // For Leaflet, three, etc.
    url.hostname.includes('res.cloudinary.com') || // Common image CDN
    url.hostname.includes('framerusercontent.com') || // For Clover's current video placeholder
    url.hostname.includes('videos.pexels.com') || // For Splash screen video
    url.pathname.endsWith('.glb') || // GLTF models
    url.pathname.endsWith('.bin') || // GLTF binary data
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.mp4') ||
    url.pathname.endsWith('.webm') ||
    url.pathname.endsWith('.mp3') // New: Audio files
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        try {
          const networkResponse = await fetch(event.request);
          // Only cache valid responses
          if (networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          // Fallback for offline if network fails and nothing in cache
          if (event.request.mode === 'navigate') {
              return caches.match('/index.html') || new Response('Offline', { status: 503, statusText: 'Offline' });
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        }
      })
    );
    return;
  }

  // Network-first for everything else
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});