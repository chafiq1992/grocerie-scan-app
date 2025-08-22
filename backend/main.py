from fastapi import FastAPI, HTTPException
rows = [{**r, "price": to_float(r["price"]) } for r in rows]
return {"items": rows}


@app.get("/api/products/{barcode}")
def get_product(barcode: str):
with get_conn() as conn:
row = conn.execute(
"SELECT barcode, name, price, stock FROM products WHERE barcode = %s LIMIT 1",
[barcode]
).fetchone()
if not row:
raise HTTPException(404, "Product not found")
row["price"] = to_float(row["price"])
return row


@app.post("/api/products/upsert")
def upsert_product(p: ProductUpsert):
with get_conn() as conn:
conn.execute(
"""
INSERT INTO products (barcode, name, price, stock)
VALUES (%s, %s, %s, %s)
ON CONFLICT (barcode) DO UPDATE SET
name = excluded.name,
price = excluded.price,
stock = excluded.stock,
updated_at = NOW()
""",
[p.barcode, p.name or "", p.price, p.stock]
)
conn.execute(
"""
INSERT INTO inventory_changes (barcode, details, delta_stock)
VALUES (%s, %s, %s)
""",
[p.barcode, f"Upsert {p.barcode} → {p.name} price {p.price:.2f} stock {p.stock}", None]
)
return {"ok": True}


# --------- Inventory archive ---------
@app.get("/api/inventory_changes")
def inventory_changes(limit: int = 50):
with get_conn() as conn:
rows = conn.execute(
"SELECT id, timestamp, barcode, details, delta_stock FROM inventory_changes ORDER BY timestamp DESC LIMIT %s",
[limit]
).fetchall()
return {"items": rows}


# --------- Sales ---------
@app.get("/api/sales")
def list_sales(limit: int = 50):
with get_conn() as conn:
rows = conn.execute(
"SELECT id, created_at, total FROM sales ORDER BY created_at DESC LIMIT %s",
[limit]
).fetchall()
# convert decimals
rows = [{**r, "total": to_float(r["total"])} for r in rows]
return {"items": rows}


@app.post("/api/sale/paid")
def sale_paid(payload: SalePaid):
if not payload.items:
raise HTTPException(400, "No items provided")
with get_conn() as conn:
# Create sale
sale_row = conn.execute(
"INSERT INTO sales (total) VALUES (%s) RETURNING id, created_at, total",
[payload.total]
).fetchone()
sale_id = sale_row["id"]


# Insert items and decrement stock
for it in payload.items:
prod = conn.execute(
"SELECT price, stock FROM products WHERE barcode=%s",
[it.barcode]
).fetchone()
if not prod:
raise HTTPException(400, f"Unknown barcode {it.barcode}")
price = prod["price"]
conn.execute(
"INSERT INTO sale_items (sale_id, barcode, qty, price) VALUES (%s, %s, %s, %s)",
[sale_id, it.barcode, it.qty, price]
)
conn.execute(
"UPDATE products SET stock = GREATEST(0, stock - %s), updated_at=NOW() WHERE barcode=%s",
[it.qty, it.barcode]
)
conn.execute(
"INSERT INTO inventory_changes (barcode, details, delta_stock) VALUES (%s, %s, %s)",
[it.barcode, f"Sale {sale_id}: -{it.qty}", -it.qty]
)


return {"ok": True, "sale_id": sale_id}