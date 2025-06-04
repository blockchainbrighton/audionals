self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  clients.claim();
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.open("v1").then((cache) =>
      cache.match(e.request).then((resp) => resp || fetch(e.request))
    )
  );
});
