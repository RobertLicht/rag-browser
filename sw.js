// sw.js — Service Worker for offline caching of static assets

const CACHE_NAME = "rag-browser-v3";
const ASSETS = [
  "/",
  "/index.html",
  "/css/styles.css",
  "/js/app.js",
  "/js/state.js",
  "/js/hardware.js",
  "/js/embedding.js",
  "/js/llm.js",
  "/js/chunker.js",
  "/js/orama-db.js",
  "/js/rag-pipeline.js",
  "/js/fileParser.js",
  "/js/ui.js",
  "/js/utils.js",
  "/js/i18n.js",
  "/js/renderer.js",
  "/js/inference.js",
  "/js/wasmWorker.js",
  "/js/wasmWorkerProxy.js",
];

// CDN assets to cache for offline use
const CDN_ASSETS = [
  "https://cdn.jsdelivr.net/npm/officeparser@7.2.0/dist/officeparser.browser.iife.js",
];

// Install event: cache static assets and CDN libraries
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll([...ASSETS, ...CDN_ASSETS])),
  );
  // Activate immediately without waiting for tabs to close
  self.skipWaiting();
});

// Activate event: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  // Take control of all open pages immediately
  self.clients.claim();
});

// Fetch event: serve same-origin GET requests from cache, fall back to network.
// Also cache cross-origin CDN assets (e.g., jsDelivr) on first network fetch.
self.addEventListener("fetch", (event) => {
  // Only intercept GET requests for same-origin or known CDN URLs
  if (
    event.request.method !== "GET" ||
    (!event.request.url.startsWith(self.location.origin) &&
      !CDN_ASSETS.includes(event.request.url))
  ) {
    return;
  }

  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        if (response) {
          return response; // Serve from cache
        }
        // Fetch from network and cache the response for future requests
        return fetch(event.request).then((networkResponse) => {
          // Cache same-origin responses (type: "basic") and known CDN assets
          const shouldCache =
            networkResponse.ok &&
            (networkResponse.type === "basic" ||
              CDN_ASSETS.includes(event.request.url));

          if (shouldCache) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        });
      })
      .catch(() => {
        // Never let the promise reject — that would cause a network error.
        return Response.error();
      }),
  );
});
