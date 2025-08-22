export async function api(path, opts={}){
const res = await fetch(path, {headers: {'Content-Type':'application/json'}, ...opts});
if(!res.ok){
let msg = await res.text();
throw new Error(msg || res.statusText);
}
if (res.headers.get('content-type')?.includes('application/json')) return res.json();
return res.text();
}


export const ProductsAPI = {
list: (q='') => api(`/api/products${q?`?query=${encodeURIComponent(q)}`:''}`),
get: (barcode) => api(`/api/products/${barcode}`),
upsert: (p)=> api('/api/products/upsert', {method:'POST', body: JSON.stringify(p)}),
changes: (limit=50)=> api(`/api/inventory_changes?limit=${limit}`)
}


export const SalesAPI = {
list: (limit=50)=> api(`/api/sales?limit=${limit}`),
paid: (payload)=> api('/api/sale/paid', {method:'POST', body: JSON.stringify(payload)})
}