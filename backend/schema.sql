-- Products
CREATE TABLE IF NOT EXISTS products (
barcode TEXT PRIMARY KEY,
name TEXT,
price NUMERIC(10,2) NOT NULL DEFAULT 0,
stock INTEGER NOT NULL DEFAULT 0,
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- Sales header
CREATE TABLE IF NOT EXISTS sales (
id BIGSERIAL PRIMARY KEY,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
total NUMERIC(10,2) NOT NULL DEFAULT 0
);


-- Sales items
CREATE TABLE IF NOT EXISTS sale_items (
sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
barcode TEXT NOT NULL REFERENCES products(barcode),
qty INTEGER NOT NULL,
price NUMERIC(10,2) NOT NULL,
PRIMARY KEY (sale_id, barcode)
);


-- Inventory changes archive
CREATE TABLE IF NOT EXISTS inventory_changes (
id BIGSERIAL PRIMARY KEY,
timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
barcode TEXT,
details TEXT,
delta_stock INTEGER
);


CREATE INDEX IF NOT EXISTS idx_products_name ON products((lower(name)));
CREATE INDEX IF NOT EXISTS idx_inventory_changes_ts ON inventory_changes(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);