import { productsStore, salesStore, queueStore } from './localdb';

export async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    let msg = await res.text();
    throw new Error(msg || res.statusText);
  }
  if (res.headers.get('content-type')?.includes('application/json')) return res.json();
  return res.text();
}

async function queueRequest(path, opts) {
  const key = Date.now().toString();
  await queueStore.setItem(key, { path, opts });
  const reg = await navigator.serviceWorker?.ready;
  if (reg && 'sync' in reg) {
    try {
      await reg.sync.register('sync-queue');
    } catch (e) {}
  }
}

export const ProductsAPI = {
  list: async (q = '') => {
    if (navigator.onLine) {
      const data = await api(`/api/products${q ? `?query=${encodeURIComponent(q)}` : ''}`);
      const items = data.items || [];
      items.forEach((p) => productsStore.setItem(p.barcode, p));
      return { items };
    }
    const all = [];
    await productsStore.iterate((v) => all.push(v));
    let items = all;
    if (q) items = items.filter((p) => p.name?.toLowerCase().includes(q.toLowerCase()));
    return { items };
  },
  get: async (barcode) => {
    if (navigator.onLine) {
      const p = await api(`/api/products/${barcode}`);
      await productsStore.setItem(barcode, p);
      return p;
    }
    return productsStore.getItem(barcode);
  },
  upsert: async (p) => {
    if (navigator.onLine) {
      const res = await api('/api/products/upsert', {
        method: 'POST',
        body: JSON.stringify(p),
      });
      await productsStore.setItem(p.barcode, res);
      return res;
    }
    await productsStore.setItem(p.barcode, p);
    await queueRequest('/api/products/upsert', {
      method: 'POST',
      body: JSON.stringify(p),
    });
    return p;
  },
  changes: (limit = 50) => api(`/api/inventory_changes?limit=${limit}`),
};

export const SalesAPI = {
  list: async (limit = 50) => {
    if (navigator.onLine) {
      const data = await api(`/api/sales?limit=${limit}`);
      data.forEach((s) => salesStore.setItem(s.id, s));
      return data;
    }
    const all = [];
    await salesStore.iterate((v) => all.push(v));
    return all.slice(-limit);
  },
  paid: async (payload) => {
    if (navigator.onLine) {
      const res = await api('/api/sale/paid', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await salesStore.setItem(res.id, res);
      return res;
    }
    const offlineSale = { id: Date.now(), ...payload };
    await salesStore.setItem(offlineSale.id, offlineSale);
    await queueRequest('/api/sale/paid', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return offlineSale;
  },
};