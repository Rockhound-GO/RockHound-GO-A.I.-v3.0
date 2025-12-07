const CACHE_NAME = 'rockhound-neural-v1';

// Critical assets required for the "Zero-Latency" boot sequence
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/audio/optimal_ping.mp3',
  '/audio/capture_shutter.mp3',
  '/video/rockhound-loading.mp4', // The new cinematic boot sequence
];

self.addEventListener('install', (event) => {
  // "Downloading Neural Map..."
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] NEURAL GRID :: CACHING CORE ASSETS');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // "Purging obsolete data streams..."
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] NEURAL GRID :: REMOVING OBSOLETE CACHE', cacheName);
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
  
  // High-Priority Asset Strategy (Cache First -> Network Fallback)
  // This ensures 3D models, textures, and heavy media load instantly.
  if (
    url.hostname.includes('cdn') || 
    url.hostname.includes('googleapis') || 
    url.hostname.includes('gstatic') ||
    url.hostname.includes('aistudiocdn') ||
    url.hostname.includes('unpkg') || 
    url.hostname.includes('res.cloudinary.com') || 
    url.hostname.includes('framerusercontent.com') || 
    url.hostname.includes('videos.pexels.com') || 
    url.pathname.endsWith('.glb') || 
    url.pathname.endsWith('.bin') || 
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.mp4') ||
    url.pathname.endsWith('.webm') ||
    url.pathname.endsWith('.mp3')
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        try {
          const networkResponse = await fetch(event.request);
          // Only cache valid 200 OK responses to prevent caching error pages
          if (networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          // If network fails for a critical asset, we can't do much, but we handle it gracefully.
          // For navigation requests, we drop to the Offline Shell.
          if (event.request.mode === 'navigate') {
              return caches.match('/index.html') || new Response('SYSTEM OFFLINE // RECONNECT UPLINK', { status: 503, statusText: 'Offline' });
          }
          return new Response('ASSET UNAVAILABLE', { status: 503, statusText: 'Offline' });
        }
      })
    );
    return;
  }

  // API & Dynamic Data Strategy (Network First -> Cache Fallback could be added here, currently Network Only)
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});