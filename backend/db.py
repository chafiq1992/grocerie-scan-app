import os
import decimal
import psycopg
from psycopg.rows import dict_row


DB_URL = os.environ.get("SUPABASE_DB_URL")
if not DB_URL:
raise RuntimeError("SUPABASE_DB_URL is required. Set it via env vars.")


def get_conn():
# psycopg3 autocommit connection with sslmode=require in URL
return psycopg.connect(DB_URL, autocommit=True, row_factory=dict_row)


def run_schema():
from pathlib import Path
schema_path = Path(__file__).resolve().parent / "schema.sql"
sql = schema_path.read_text(encoding="utf-8")
with get_conn() as conn:
with conn.cursor() as cur:
cur.execute(sql)


def to_float(val):
if isinstance(val, decimal.Decimal):
return float(val)
return val