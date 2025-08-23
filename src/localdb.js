import localforage from 'localforage';

export const productsStore = localforage.createInstance({ name: 'products' });
export const salesStore = localforage.createInstance({ name: 'sales' });
export const queueStore = localforage.createInstance({ name: 'queue' });
