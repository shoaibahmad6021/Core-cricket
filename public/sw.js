const CACHE = "core-cricket-v3";
const STATIC_ASSETS = ["/manifest.webmanifest", "/core-cricket-180.png", "/core-cricket-192.png", "/core-cricket-512.png", "/core-cricket-icon.svg"];
self.addEventListener("install", (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())));
self.addEventListener("activate", (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const pathname = new URL(event.request.url).pathname;
  if (!STATIC_ASSETS.includes(pathname)) return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
