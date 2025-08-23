import os
import decimal

USE_LOCAL_DB = os.environ.get("USE_LOCAL_DB")

if USE_LOCAL_DB:
    import sqlite3

    DB_PATH = os.environ.get(
        "LOCAL_DB_PATH", os.path.join(os.path.dirname(__file__), "local.db")
    )

    class SQLiteConn(sqlite3.Connection):
        def execute(self, sql, params=()):  # type: ignore[override]
            sql = sql.replace("%s", "?")
            return super().execute(sql, params)

    def get_conn():
        """Return a sqlite3 connection with row access by name."""
        conn = sqlite3.connect(DB_PATH, factory=SQLiteConn)
        conn.row_factory = sqlite3.Row
        return conn

    def run_schema():
        """Execute schema.sql against the current database (idempotent)."""
        from pathlib import Path

        schema_path = Path(__file__).resolve().parent / "schema.sql"
        sql = schema_path.read_text(encoding="utf-8")

        with get_conn() as conn:
            conn.executescript(sql)
else:
    from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
    import psycopg
    from psycopg.rows import dict_row

    # --- Connection string ---
    raw_url = os.environ.get("SUPABASE_DB_URL")
    if not raw_url:
        raise RuntimeError("SUPABASE_DB_URL is required. Set it via env vars.")

    # Normalize URL and enforce sslmode=require
    def _normalize_db_url(url: str) -> str:
        parts = urlsplit(url.strip())
        scheme = parts.scheme or "postgresql"
        # Accept postgres / postgresql schemes; strip any SQLAlchemy driver suffix
        if "+" in scheme:
            scheme = scheme.split("+", 1)[0]
        query = dict(parse_qsl(parts.query, keep_blank_values=True))
        query["sslmode"] = query.get("sslmode") or "require"
        new_query = urlencode(query)
        return urlunsplit((scheme, parts.netloc, parts.path, new_query, parts.fragment))

    DB_URL = _normalize_db_url(raw_url)

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
