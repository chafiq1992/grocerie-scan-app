import React, { useMemo, useState, useEffect } from "react";
import LiveScanner from "./LiveScanner.jsx";

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
        <button className="btn-ghost flex items-center gap-2" onClick={onBack}>
          <span>←</span>
          <span>Home</span>
        </button>
      ) : <span />}
      <h1 className="text-2xl font-extrabold tracking-tight">Groceries Scanner</h1>
      <div className="text-xs text-slate-400">Preview UI (no camera)</div>
    </div>
  );
}

function Home({ onOpen, archived }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <button onClick={()=>onOpen("sale")} className="homeCard group">
        <div className="homeIcon bg-emerald-500/20 border-emerald-500">🛒</div>
        <div className="homeText">
          <div className="homeTitle">Sale</div>
          <div className="homeHint">Scan items, see total, mark as paid</div>
        </div>
      </button>
      <button onClick={()=>onOpen("inventory")} className="homeCard group">
        <div className="homeIcon bg-sky-500/20 border-sky-500">📦</div>
        <div className="homeText">
          <div className="homeTitle">Inventory</div>
          <div className="homeHint">Add or update products & prices</div>
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
  const [items, setItems] = useState(() => demoInventory);
  const [toast, setToast] = useState("");

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

  function handleMockScan() {
    if (!barcode) return;
    const existing = items.find((i) => i.barcode === barcode);
    if (existing) {
      setName(existing.name);
      setPrice(String(existing.price.toFixed(2)));
      setStock(String(existing.stock ?? 0));
      successFeedback(); // beep + vibrate on valid match
    } else {
      setName("");
      setPrice("");
      setStock("");
    }
  }

  function save() {
    const p = Number(price);
    const s = stock === "" ? 0 : Number(stock);
    if (!barcode || !p || p <= 0) return;
    const idx = items.findIndex((x) => x.barcode === barcode);
    const next = [...items];
    if (idx >= 0) next[idx] = { barcode, name, price: p, stock: s };
    else next.unshift({ barcode, name, price: p, stock: s });
    setItems(next);
    setToast("Product saved");
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Left: Scanner + Form */}
      <div className="space-y-4">
        <SectionTitle>Inventory Mode</SectionTitle>

        {/* Scanner Mock with manual entry + suggestions */}
        <ScannerMock
          hint="Scan or type code to load product…"
          value={barcode}
          onChange={setBarcode}
          onScan={handleMockScan}
        />
        {barcode && (
          <SuggestionList
            items={suggestions}
            onPick={(it)=>{ setBarcode(it.barcode); setName(it.name); setPrice(String(it.price.toFixed(2))); setStock(String(it.stock??0)); }}
          />
        )}

        {/* Form */}
        <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-4 space-y-3">
          <Label>Barcode</Label>
          <input
            className="input"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Scan a barcode…"
          />

          <Label>Name (optional)</Label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Milk 1L"
          />

          <Label>Price</Label>
          <input
            className="input"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g., 12.50"
          />

          <Label>Stock (optional)</Label>
          <input
            className="input"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="e.g., 20"
          />

          <div className="flex gap-3 pt-2">
            <button className="btn-primary" onClick={save}>Save Product</button>
            <button className="btn-secondary" onClick={() => {
              setBarcode(""); setName(""); setPrice(""); setStock("");
            }}>Clear</button>
          </div>
          {toast && <div className="text-emerald-400 text-sm font-bold">{toast}</div>}
        </div>
      </div>

      {/* Right: Quick Search */}
      <div className="space-y-4">
        <SectionTitle>Quick Search</SectionTitle>
        <input
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or barcode…"
        />
        <div className="bg-slate-800/70 border border-slate-700 rounded-2xl divide-y divide-slate-700">
          {filtered.length === 0 && (
            <div className="p-4 text-slate-400">No results</div>
          )}
          {filtered.map((item) => (
            <div key={item.barcode} className="p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="font-extrabold text-slate-100">{item.name || "(No name)"}</div>
                <div className="text-slate-400 text-sm">#{item.barcode}</div>
              </div>
              <div className="font-extrabold">{formatMoney(item.price)}</div>
              <span className="px-3 py-1 text-xs rounded-full bg-slate-700 border border-slate-600">Stock: {item.stock ?? 0}</span>
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

/* ------------------------ SALE MODE ------------------------ */
function SaleMode({ onPaid }) {
  const [cart, setCart] = useState([]); // {barcode, name, price, qty}
  const [scan, setScan] = useState("");
  const [toast, setToast] = useState("");

  useEffect(()=>{ if(!toast) return; const t=setTimeout(()=>setToast(""),1500); return ()=>clearTimeout(t);},[toast]);

  function mockScan() {
    if (!scan) return;
    const product = demoInventory.find((i) => i.barcode === scan);
    if (!product) return; // no beep/vibration for invalid

    successFeedback(); // beep + vibrate on valid match

    setCart((prev) => {
      const idx = prev.findIndex((x) => x.barcode === product.barcode);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
        return copy;
      }
      return [...prev, { barcode: product.barcode, name: product.name, price: product.price, qty: 1 }];
    });
  }

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  function paidAndArchive() {
    if (cart.length === 0) return;
    const receipt = {
      timestamp: new Date().toLocaleString(),
      items: cart,
      total
    };
    onPaid?.(receipt);
    setCart([]);
    setToast("Order marked as PAID and archived");
  }

  const suggestions = useMemo(()=>{
    if (!scan) return [];
    return demoInventory.filter(i=> i.barcode.startsWith(scan) || (i.name||"").toLowerCase().includes(scan.toLowerCase())).slice(0,6);
  },[scan]);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <SectionTitle>Sale Mode</SectionTitle>
        {/* Prefer live camera on small screens */}
        <div className="hidden sm:block">
          <ScannerMock
            hint="Scan items or type code…"
            value={scan}
            onChange={setScan}
            onScan={mockScan}
          />
        </div>
        <div className="sm:hidden">
          <LiveScanner onScan={(code)=>{ setScan(code); mockScan(); }} />
          <div className="text-center text-xs text-slate-400 mt-2">Camera active – point at barcode</div>
        </div>
        {scan && (
          <SuggestionList
            items={suggestions}
            onPick={(it)=>{ setScan(it.barcode); }}
          />
        )}
        <div className="text-slate-400 text-sm">Tip: Use a hardware scanner or type a barcode and press Scan.</div>
      </div>

      {/* Right: Cart & total */}
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

        <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-4 flex items-center justify-between">
          <div className="text-slate-300 font-bold">Total</div>
          <div className="text-2xl font-black">{formatMoney(total)}</div>
        </div>

        <div className="flex gap-3">
          <button className="btn-secondary" onClick={()=>setCart([])}>Clear</button>
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
  return <div className="text-slate-300 font-bold text-sm">{children}</div>;
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
          className="flex-1 input"
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

const demoInventory = [
  { barcode: "611001", name: "Milk 1L", price: 12.5, stock: 24 },
  { barcode: "611002", name: "Eggs 12pcs", price: 22.9, stock: 18 },
  { barcode: "611003", name: "Flour 1kg", price: 9.9, stock: 30 },
  { barcode: "611004", name: "Sugar 1kg", price: 8.5, stock: 50 },
  { barcode: "611005", name: "Apples 1kg", price: 14.0, stock: 12 },
];
