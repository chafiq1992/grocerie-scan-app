importScripts('https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js');

// Offline request queue
const queueStore = localforage.createInstance({ name: 'queue' });

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-queue') {
    event.waitUntil(processQueue());
  }
});

async function processQueue() {
  const keys = await queueStore.keys();
  for (const key of keys) {
    const { path, opts } = await queueStore.getItem(key);
    try {
      await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
      await queueStore.removeItem(key);
    } catch (err) {
      // stop processing on failure; we'll retry on next sync
      break;
    }
  }
}
