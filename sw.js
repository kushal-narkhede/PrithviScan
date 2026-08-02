/* PrithviScan offline shell — caches app pages + last-used static assets */
const CACHE = "prithviscan-shell-v1";
const SHELL = [
  "/",
  "/index.html",
  "/app.html",
  "/field.html",
  "/auth.html",
  "/profile.html",
  "/org.html",
  "/styles.css",
  "/app.css",
  "/auth.css",
  "/assets/logo-mark.png",
  "/assets/favicon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL).catch(() => undefined))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Don't cache API / cloud functions
  if (url.hostname.includes("cloudfunctions.net")) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok && (url.pathname.endsWith(".html") || url.pathname.endsWith(".css") || url.pathname.endsWith(".js") || url.pathname.startsWith("/assets/"))) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
