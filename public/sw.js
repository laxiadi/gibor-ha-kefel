const CACHE = "spider-titui-v7";
const SHELL = ["./index.html", "./manifest.webmanifest", "./icons/icon.svg", "./icons/favicon.svg", "./icons/icon-192.png", "./icons/icon-512.png"];

async function precache() {
  const cache = await caches.open(CACHE);
  await cache.addAll(SHELL);
  const response = await fetch("./index.html");
  if (!response.ok) return;
  const html = await response.clone().text();
  await cache.put("./index.html", response);
  const urls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((url) => url && !url.startsWith("http") && !url.startsWith("data:"));
  await Promise.all(urls.map((url) => cache.add(url).catch(() => undefined)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const request = event.request;
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(CACHE).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(async () => (await caches.match(request)) ?? caches.match("./index.html") ?? caches.match("./")),
    );
    return;
  }
  event.respondWith(
    caches.match(request).then((cached) => cached ?? fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        void caches.open(CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    })),
  );
});
