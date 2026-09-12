const CACHE_VERSION = "v1";
const CACHE_NAME = `cookbook-${CACHE_VERSION}`;
const APP_SHELL = ["/", "/recipe/", "/recipe/new/", "/recipe/edit/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(precache());
});

// A page's very first-ever load isn't controlled by this service worker yet
// (the browser fetches it before the SW exists), so its script/style/font
// requests never pass through our fetch handler and would otherwise never
// get cached. To make "works offline after the first visit" actually true,
// install fetches each app shell page itself, scans the HTML for the
// _next/static assets it references, and caches those directly.
async function precache() {
  const cache = await caches.open(CACHE_NAME);
  const assetUrls = new Set();

  await Promise.all(
    APP_SHELL.map(async (url) => {
      try {
        const response = await fetch(url);
        await cache.put(url, response.clone());
        if (response.headers.get("content-type")?.includes("text/html")) {
          const html = await response.text();
          for (const match of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)) {
            assetUrls.add(match[1]);
          }
        }
      } catch {
        // Ignore; the app still works online and this can be cached later at runtime.
      }
    }),
  );

  await Promise.all(
    Array.from(assetUrls).map(async (url) => {
      try {
        const response = await fetch(url);
        await cache.put(url, response.clone());
      } catch {
        // Ignore; runtime cache-first handling will pick it up on next request.
      }
    }),
  );
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const fallback = await cache.match("/");
    if (fallback) return fallback;
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);
  return cached || (await networkPromise) || Response.error();
}
