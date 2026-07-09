/*
 * Service Worker — Bosch Car Service PWA
 * ---------------------------------------
 * This is the modern, dependency-free service worker recommended by the Next.js
 * team for the App Router (see https://nextjs.org/docs/app/guides/progressive-web-apps).
 * It is served from /public so it is available at the site root (`/sw.js`),
 * which gives it the root scope required to control the whole app.
 *
 * Design goals for this INTERNAL, AUTHENTICATED app:
 *  - Make the app installable and give it an offline fallback (Lighthouse PWA).
 *  - Cache only public, static assets (icons, fonts, Next.js build output).
 *  - NEVER cache authenticated HTML or API responses, so no user's private data
 *    can leak to another user on a shared device or go stale after login/logout.
 */

// Bump this version string whenever the precache list changes to force clients
// to fetch a fresh service worker and drop stale caches.
const CACHE_VERSION = "bosch-car-service-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;

// Public assets that are safe to precache on install. The dashboard itself is
// auth-gated, so we intentionally do NOT precache it — only the offline shell.
const PRECACHE_URLS = [
  "/offline.html",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/maskable-icon-512x512.png",
  "/apple-touch-icon.png",
];

// On install, precache the offline shell + static icons, then activate ASAP.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// On activate, drop any caches from previous versions and take control of open
// clients immediately.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(CACHE_VERSION))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Decide whether a request targets a safe-to-cache static asset.
function isCacheableStatic(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname === "/manifest.json" ||
    url.pathname === "/apple-touch-icon.png" ||
    /\.(png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle same-origin GET requests. Auth flows, POSTs, and third-party
  // requests always go straight to the network.
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Static assets: cache-first for instant loads, updating the cache in the
  // background when a network response is available.
  if (isCacheableStatic(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches
                .open(STATIC_CACHE)
                .then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Page navigations: network-first so users always get live, authenticated
  // data. If the network is unavailable, fall back to the offline shell. We do
  // NOT cache the HTML responses themselves (they are user-specific).
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html"))
    );
    return;
  }

  // Everything else (e.g. /api requests): pass through to the network untouched.
});
