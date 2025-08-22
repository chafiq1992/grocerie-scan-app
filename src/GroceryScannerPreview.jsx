import React, { useMemo, useState, useEffect } from "react";
import LiveScanner from "./LiveScanner.jsx";
import { ProductsAPI, SalesAPI } from "./api.js";

// Canvas visual mockup with HOME -> (Sale | Inventory) navigation
// Includes: success beep + vibration on valid scan, manual entry with suggestions,
// Paid button that archives the order, and back-to-home header.

export default function GroceryScannerPreview() {
  const [screen, setScreen] = useState("home"); // 'home' | 'sale' | 'inventory'
  const [archived, setArchived] = useState([]); // archived receipts

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      <div className="max-w-5xl mx-auto">
        <Header screen={screen} onBack={() => setScreen("home")} />
        {screen === "home" && <Home onOpen={(s)=>setScreen(s)} archived={archived} />}
        {screen === "sale" && <SaleMode onPaid={(receipt)=>setArchived(a=>[receipt,...a])} />}
        {screen === "inventory" && <InventoryMode />}
        <FooterNote />
      </div>
    </div>
  );
}

function Header({ screen, onBack }) {
  return (
    <div className="flex items-center justify-between mb-4">
      {screen !== "home" ? (
        <button className="btn-back flex items-center gap-2" onClick={onBack}>
          <span>←</span>
          <span>Home</span>
        </button>
      ) : <span />}
      <h1 className="text-2xl font-extrabold tracking-tight">Groceries Scanner</h1>
      <span />
    </div>
  );
}

  function Home({ onOpen, archived }) {
    return (
      <div className="grid gap-8 md:grid-cols-2">
        <button
          onClick={() => onOpen("sale")}
          className="group flex items-center p-8 bg-slate-800/70 border border-slate-700 rounded-2xl transition-colors hover:bg-slate-700/40"
        >
          <div className="flex items-center justify-center w-24 h-24 text-5xl bg-emerald-500/20 border border-emerald-500 rounded-xl">
            🛒
          </div>
          <div className="ml-6 text-left">
            <div className="text-2xl font-extrabold mb-1">Sale</div>
            <div className="text-slate-400 text-sm">
              Scan items, see total, mark as paid
            </div>
          </div>
        </button>
        <button
          onClick={() => onOpen("inventory")}
          className="group flex items-center p-8 bg-slate-800/70 border border-slate-700 rounded-2xl transition-colors hover:bg-slate-700/40"
        >
          <div className="flex items-center justify-center w-24 h-24 text-5xl bg-sky-500/20 border border-sky-500 rounded-xl">
            📦
          </div>
          <div className="ml-6 text-left">
            <div className="text-2xl font-extrabold mb-1">Inventory</div>
            <div className="text-slate-400 text-sm">
              Add or update products & prices
            </div>
          </div>
        </button>

        <div className="md:col-span-2 bg-slate-800/70 border border-slate-700 rounded-2xl p-4">
          <div className="font-extrabold mb-2">Archived receipts</div>
          {archived.length === 0 ? (
            <div className="text-slate-400">No archived orders yet.</div>
          ) : (
            <ul className="space-y-2">
            {archived.map((r,idx)=> (
              <li key={idx} className="flex items-center justify-between bg-slate-900/60 border border-slate-700 rounded-xl p-3">
                <div className="text-sm text-slate-300">{r.timestamp}</div>
                <div className="font-black">{formatMoney(r.total)}</div>
                <div className="text-xs text-slate-400">{r.items.length} items</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ---------------------- INVENTORY MODE ---------------------- */
function InventoryMode() {
  const [barcode, setBarcode] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [toast, setToast] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [scanning,setScanning]=useState(true);

  useEffect(()=>{ if(!toast) return; const t=setTimeout(()=>setToast(""),1500); return ()=>clearTimeout(t);},[toast]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) => i.barcode.includes(q) || (i.name || "").toLowerCase().includes(q)
    );
  }, [items, query]);

  const suggestions = useMemo(()=>{
    if (!barcode) return [];
    return items.filter(i=> i.barcode.startsWith(barcode) || (i.name||"").toLowerCase().includes(barcode.toLowerCase())).slice(0,6);
  },[barcode, items]);

  async function handleMockScan() {
    if (!barcode) return;
    let existing = items.find((i) => i.barcode === barcode);
    if (!existing) {
      try{
        const r = await ProductsAPI.get(barcode);
        existing = r || null;
      }catch{}
    }
    if (existing) {
      setName(existing.name||"");
      setPrice(String(Number(existing.price).toFixed(2)));
      setStock(String(existing.stock ?? 0));
      successFeedback();
    } else {
      setName("");
      setPrice("");
      setStock("");
    }
  }

  async function save() {
    const p = Number(price);
    const s = stock === "" ? 0 : Number(stock);
    if (!barcode || !p || p <= 0) return;
    try{
      setIsSaving(true);
      await ProductsAPI.upsert({ barcode, name, price: p, stock: s });
      const fresh = await ProductsAPI.list();
      setItems(fresh.items || []);
      setToast("Product saved");
    }catch(e){
      console.error(e);
      setToast("Save failed: "+(e?.message||"error"));
    }finally{
      setIsSaving(false);
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Left: Scanner + Form */}
      <div className="space-y-4">
        <SectionTitle>Inventory Mode</SectionTitle>

        {/* Desktop mock */}
        <div className="hidden sm:block">
          <ScannerMock
            hint="Scan or type code to load product…"
            value={barcode}
            onChange={setBarcode}
            onScan={handleMockScan}
          />
        </div>

        {/* Mobile live scanner */}
        <div className="sm:hidden">
          {scanning && (
            <LiveScanner zoom={2} onScan={(code)=>{ setBarcode(code); handleMockScan(); setScanning(false);} } />
          )}
          <div className="text-center text-xs text-slate-400 mt-2">Camera active – point at barcode</div>
        </div>

        {barcode && (
          <SuggestionList
            items={suggestions}
            onPick={(it)=>{ setBarcode(it.barcode); setName(it.name); setPrice(String(it.price.toFixed(2))); setStock(String(it.stock??0)); }}
          />
        )}

        {/* Form */}
        <div className="bg-white border border-slate-300 rounded-2xl p-4 space-y-4">
          <Label>Barcode</Label>
          <input
            className="input w-full p-3 border border-slate-300 rounded-lg text-slate-900 text-lg placeholder-slate-500"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Scan a barcode…"
          />

          <Label>Name (optional)</Label>
          <input
            className="input w-full p-3 border border-slate-300 rounded-lg text-slate-900 text-lg placeholder-slate-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Milk 1L"
          />

          <Label>Price</Label>
          <input
            className="input w-full p-3 border border-slate-300 rounded-lg text-slate-900 text-lg placeholder-slate-500"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g., 12.50"
          />

          <Label>Stock (optional)</Label>
          <input
            className="input w-full p-3 border border-slate-300 rounded-lg text-slate-900 text-lg placeholder-slate-500"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="e.g., 20"
          />
        </div>

        <div className="mt-4 bg-white border rounded-2xl p-4">
          <div className="flex gap-4">
            <button
              className="btn-primary text-lg px-6 py-3"
              disabled={isSaving}
              onClick={save}
            >
              {isSaving ? "Saving…" : "Save Product"}
            </button>
            <button
              className="btn-secondary text-lg px-6 py-3"
              onClick={() => {
                setBarcode("");
                setName("");
                setPrice("");
                setStock("");
                setScanning(true);
              }}
            >
              Clear
            </button>
          </div>
          {toast && (
            <div className="text-emerald-400 text-sm font-bold mt-2">{toast}</div>
          )}
        </div>
      </div>

      {/* Right: Quick Search */}
      <div className="space-y-4">
        <SectionTitle>Quick Search</SectionTitle>
        {/* load from backend on mount */}
        <Loader setItems={setItems} />
        <input
          className="input w-full p-3 border border-slate-300 rounded-lg text-slate-900 text-lg placeholder-slate-500"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or barcode…"
        />
        <div className="bg-white border border-slate-300 rounded-2xl divide-y divide-slate-200">
          {filtered.length === 0 && (
            <div className="p-4 text-slate-400">No results</div>
          )}
          {filtered.map((item) => (
            <div key={item.barcode} className="p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="font-extrabold text-slate-900">{item.name || "(No name)"}</div>
                <div className="text-slate-500 text-sm">#{item.barcode}</div>
              </div>
              <div className="font-extrabold text-slate-900">{formatMoney(item.price)}</div>
              <span className="px-3 py-1 text-xs rounded-full bg-slate-100 border border-slate-300 text-slate-700">Stock: {item.stock ?? 0}</span>
              <button
                className="btn-ghost"
                onClick={() => {
                  setBarcode(item.barcode);
                  setName(item.name || "");
                  setPrice(String(item.price.toFixed(2)));
                  setStock(String(item.stock ?? 0));
                }}
              >
                Load
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Loader({ setItems }){
  useEffect(()=>{
    (async ()=>{
      try{
        const res = await ProductsAPI.list();
        setItems(res.items||[]);
      }catch(e){ console.error(e); }
    })();
  },[setItems]);
  return null;
}

/* ------------------------ SALE MODE ------------------------ */
function SaleMode({ onPaid }) {
  const [cart, setCart] = useState([]); // {barcode, name, price, qty}
  const [scan, setScan] = useState("");
  const [toast, setToast] = useState("");
  const [catalog, setCatalog] = useState([]);
  const [amountPaid, setAmountPaid] = useState("");
  const [scanning,setScanning]=useState(true);

  useEffect(()=>{ if(!toast) return; const t=setTimeout(()=>setToast(""),1500); return ()=>clearTimeout(t);},[toast]);

  // Load product catalog for suggestions/lookups
  useEffect(()=>{
    (async ()=>{
      try{ const res = await ProductsAPI.list(); setCatalog(res.items||[]); }catch(e){ console.error(e); }
    })();
  },[]);

  async function mockScan(codeIn) {
    const code = codeIn ?? scan;
    if (!code) return;
    let product = catalog.find((i) => String(i.barcode) === String(code));
    if (!product) {
      try { const r = await ProductsAPI.get(code); product = r || null; } catch {}
    }
    if (!product) { setToast(`Unknown barcode ${code}`); return; }

    successFeedback();

    const prodName = product.name || "(No name)";
    const prodPrice = Number(product.price);
    setCart((prev) => {
      const idx = prev.findIndex((x) => String(x.barcode) === String(code));
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
        return copy;
      }
      return [...prev, { barcode: String(code), name: prodName, price: prodPrice, qty: 1 }];
    });
  }

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const change = Math.max(0, Number(amountPaid||0) - total);

  async function paidAndArchive() {
    if (cart.length === 0) return;

    try {
      await SalesAPI.paid({
        items: cart.map(({ barcode, qty }) => ({ barcode, qty })),
        total,
      });

      const receipt = {
        timestamp: new Date().toLocaleString(),
        items: cart,
        total,
      };
      onPaid?.(receipt);
      setCart([]);
      setToast("Order marked as PAID and archived");
    } catch (e) {
      console.error(e);
      setToast("Payment failed: " + (e?.message || "error"));
    }
  }

  const suggestions = useMemo(()=>{
    if (!scan) return [];
    return catalog.filter(i=> i.barcode.startsWith(scan) || (i.name||"").toLowerCase().includes(scan.toLowerCase())).slice(0,6);
  },[scan, catalog]);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <SectionTitle>Sale Mode</SectionTitle>
        {/* Desktop fallback scanner */}
        <div className="hidden sm:block">
          <ScannerMock
            hint="Scan items or type code…"
            value={scan}
            onChange={setScan}
            onScan={()=>{ mockScan(); setScanning(false); }}
          />
          {scan && (
            <SuggestionList
              items={suggestions}
              onPick={(it)=>{ setScan(it.barcode); }}
            />
          )}
        </div>
        {/* Mobile live scanner */}
        <div className="sm:hidden">
          {scanning && (
            <LiveScanner zoom={2} onScan={async (code)=>{ await mockScan(code); setScan(code); setScanning(false);} } />
          )}
          {!scanning && (
            <button className="btn-secondary w-full mt-2" onClick={()=>{ setScan(""); setScanning(true); }}>Scan another</button>
          )}
        </div>
        <div className="text-slate-400 text-sm">Tip: Use a hardware scanner or type a barcode and press Scan.</div>
      </div>

      <div className="space-y-4">
        <SectionTitle>Cart</SectionTitle>
        <div className="bg-slate-800/70 border border-slate-700 rounded-2xl divide-y divide-slate-700 max-h-[26rem] overflow-auto">
          {cart.length === 0 && (
            <div className="p-4 text-slate-400">Scan to start adding items…</div>
          )}
          {cart.map((item) => (
            <div key={item.barcode} className="p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="font-extrabold">{item.name}</div>
                <div className="text-slate-400 text-sm">#{item.barcode}</div>
              </div>
              <div className="w-20 text-right font-extrabold">{formatMoney(item.price)}</div>
              <div className="flex items-center gap-2">
                <button className="pill" onClick={() => setCart((prev)=>prev.map(i=> i.barcode===item.barcode?{...i, qty: Math.max(1,i.qty-1)}:i))}>−</button>
                <div className="w-8 text-center font-extrabold">{item.qty}</div>
                <button className="pill" onClick={() => setCart((prev)=>prev.map(i=> i.barcode===item.barcode?{...i, qty: i.qty+1}:i))}>+</button>
              </div>
              <button className="pill" onClick={() => setCart((prev)=>prev.filter(i=>i.barcode!==item.barcode))}>✕</button>
            </div>
          ))}
        </div>

        {/* Payment section */}
        <div className="space-y-3">
          <div className="text-slate-700 font-extrabold">Payment</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-slate-300 rounded-2xl p-4">
              <input
                className="input w-full text-black text-2xl p-4"
                value={amountPaid}
                onChange={(e)=>setAmountPaid(e.target.value)}
                placeholder="Amount paid (e.g., 100.00)"
                inputMode="decimal"
              />
            </div>
            <div className="rounded-xl p-3 border border-emerald-300 bg-emerald-50">
              <div className="text-emerald-700 text-sm font-bold">Total</div>
              <div className="text-2xl font-black text-emerald-700">{formatMoney(total)}</div>
            </div>
            <div className="rounded-xl p-3 border border-blue-300 bg-blue-50">
              <div className="text-blue-700 text-sm font-bold">Change to return</div>
              <div className="text-2xl font-black text-blue-700">{formatMoney(change)}</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-4 flex items-center justify-between">
          <div className="text-slate-300 font-bold">Total</div>
          <div className="text-2xl font-black">{formatMoney(total)}</div>
        </div>

        <div className="flex gap-3">
          <button className="btn-secondary" onClick={()=>{setCart([]); setAmountPaid(""); setScanning(true); setScan("");}}>Clear</button>
          <button className="btn-primary" onClick={paidAndArchive}>Paid</button>
        </div>
        {toast && <div className="text-emerald-400 text-sm font-bold">{toast}</div>}
      </div>
    </div>
  );
}

/* -------------------------- UI PARTS -------------------------- */
function SectionTitle({ children }) {
  return <h2 className="text-lg font-extrabold">{children}</h2>;
}

function Label({ children }) {
  return <div className="text-slate-900 font-extrabold text-base">{children}</div>;
}

function ScannerMock({ hint, value, onChange, onScan }) {
  return (
    <div className="relative bg-slate-950/40 border border-slate-800 rounded-2xl overflow-hidden h-56 flex flex-col">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15),transparent_60%)]" />
      <div className="flex-1 grid place-items-center">
        <div className="text-slate-300 text-sm bg-black/40 px-3 py-1 rounded-full border border-slate-700">
          {hint}
        </div>
      </div>
      <div className="p-3 border-t border-slate-800 bg-slate-900/60 flex gap-2">
        <input
          className="flex-1 input p-3 border border-slate-300 rounded-lg text-slate-900 text-lg placeholder-slate-500"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type barcode here to simulate scan…"
        />
        <button className="btn-primary" onClick={onScan}>Scan</button>
      </div>
    </div>
  );
}

// (SuggestionList, FooterNote, successFeedback, etc. stay as added below)

/* -------------------------- REMAINING HELPERS -------------------------- */
function SuggestionList({ items, onPick }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="bg-slate-800/70 border border-slate-700 rounded-2xl overflow-hidden">
      {items.map(it=> (
        <button key={it.barcode} className="w-full text-left px-4 py-2 hover:bg-slate-700/40 flex items-center gap-3" onClick={()=>onPick(it)}>
          <div className="flex-1">
            <div className="font-bold">{it.name}</div>
            <div className="text-xs text-slate-400">#{it.barcode}</div>
          </div>
          <div className="font-extrabold">{formatMoney(it.price)}</div>
        </button>
      ))}
    </div>
  );
}

function FooterNote() {
  return (
    <div className="mt-6 text-center text-slate-400 text-sm">
      Tip: Add items in Inventory first, then switch to Sale.
    </div>
  );
}

function successFeedback() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.value = 0.05;
    o.connect(g); g.connect(ctx.destination);
    o.start();
    setTimeout(()=>{ o.stop(); ctx.close(); }, 120);
  } catch(e) {}
  try { navigator.vibrate && navigator.vibrate(80); } catch(e) {}
}

const formatMoney = (n) => (isFinite(n) ? Number(n).toFixed(2) : "0.00");

// demoInventory removed; data now comes from backend
