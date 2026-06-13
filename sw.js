// sw.js — Service Worker for offline caching of static assets

const CACHE_NAME = "rag-browser-v1";
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
  "/js/ui.js",
  "/js/utils.js",
];

// Install event: cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)),
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
// Cross-origin requests (e.g., HuggingFace CDN) are passed through naturally
// by NOT calling respondWith(), so the browser handles them directly.
self.addEventListener("fetch", (event) => {
  // Only intercept same-origin GET requests. Everything else bypasses the SW.
  if (
    event.request.method !== "GET" ||
    !event.request.url.startsWith(self.location.origin)
  ) {
    return;
  }

  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
      .catch(() => {
        // Never let the promise reject — that would cause a network error.
        return Response.error();
      }),
  );
});
