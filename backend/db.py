import os
import decimal
import psycopg
from psycopg.rows import dict_row


# --- Connection string ---
DB_URL = os.environ.get("SUPABASE_DB_URL")

if not DB_URL:
    raise RuntimeError("SUPABASE_DB_URL is required. Set it via env vars.")

# Ensure TLS param for Supabase; handle case where user supplied '?sslmode' without '=require'
if "sslmode" not in DB_URL:
    sep = "&" if "?" in DB_URL else "?"
    DB_URL = f"{DB_URL}{sep}sslmode=require"
elif "sslmode=" not in DB_URL:
    # replace bare 'sslmode' with 'sslmode=require'
    DB_URL = DB_URL.replace("sslmode", "sslmode=require")


def get_conn():
    """Return an autocommit psycopg3 connection using dict rows."""
    return psycopg.connect(DB_URL, autocommit=True, row_factory=dict_row)


def run_schema():
    """Execute schema.sql against the current database (idempotent)."""
    from pathlib import Path

    schema_path = Path(__file__).resolve().parent / "schema.sql"
    sql = schema_path.read_text(encoding="utf-8")

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql)


def to_float(val):
    """Helper to convert Decimal to float for JSON serialization."""
    if isinstance(val, decimal.Decimal):
        return float(val)
    return val