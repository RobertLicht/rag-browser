// sw.js — Service Worker for offline caching of static assets

const CACHE_NAME = 'rag-browser-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/state.js',
  '/js/hardware.js',
  '/js/embedding.js',
  '/js/llm.js',
  '/js/chunker.js',
  '/js/orama-db.js',
  '/js/rag-pipeline.js',
  '/js/ui.js',
  '/js/utils.js',
];

// Install event: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  // Activate immediately without waiting for tabs to close
  self.skipWaiting();
});

// Activate event: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  // Take control of all open pages immediately
  self.clients.claim();
});

// Fetch event: serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
