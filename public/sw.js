/*
 * AlsatPort service worker: makes the site installable and shows an offline page when the network is down.
 * It caches ONLY immutable build assets, brand icons and /offline.html. HTML pages, /api/*, account, messages
 * and admin responses are never stored. Non-GET and cross-origin requests are not touched.
 * Kill switch: replace this file with one that calls self.registration.unregister() and deploy.
 */
const VERSION = "ap-sw-v1";
const STATIC_CACHE = VERSION + "-static";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icon-192.png", "/favicon-32x32.png"];
const MAX_STATIC_ENTRIES = 160;
const ICON_RE = /^\/(icon-192|icon-512|icon-maskable-512|apple-touch-icon|favicon-(16x16|32x32|48x48))\.png$/;

function isCacheableStatic(url) {
  if (url.origin !== self.location.origin || url.search) return false;
  return url.pathname.startsWith("/_next/static/") || ICON_RE.test(url.pathname) || url.pathname === OFFLINE_URL;
}

function bypassNavigation(url) {
  return url.pathname.startsWith("/api/") || url.pathname === "/admin" || url.pathname.startsWith("/admin/");
}

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_STATIC_ENTRIES; i++) await cache.delete(keys[i]);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("ap-sw-") && !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    if (bypassNavigation(url)) return;
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL).then((res) => res || Response.error())),
    );
    return;
  }

  if (!isCacheableStatic(url)) return;
  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok && res.type === "basic") {
        await cache.put(req, res.clone());
        trim(cache);
      }
      return res;
    }),
  );
});
