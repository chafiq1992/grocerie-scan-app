importScripts('https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js');

const CACHE = 'app-cache-v1';
const ASSETS = ['/', '/index.html'];

const queueStore = localforage.createInstance({ name: 'queue' });

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((res) => {
      return (
        res ||
        fetch(event.request).then((fetchRes) => {
          const copy = fetchRes.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return fetchRes;
        })
      );
    })
  );
});

async function processQueue() {
  const keys = await queueStore.keys();
  for (const key of keys) {
    const { path, opts } = await queueStore.getItem(key);
    try {
      await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
      await queueStore.removeItem(key);
    } catch (e) {
      break;
    }
  }
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-queue') {
    event.waitUntil(processQueue());
  }
});
