"""
Mint Finance — combined data pipeline
Runs all four stages in dependency order:
  1. Stock returns backfill   → stock_returns_c
  2. Strategy returns         → strategies_returns_c
  3. Client returns           → client_strategy_returns_c
  4. Intraday prices          → stock_intraday_c

Usage:
  # Direct Neon connection (default — works from any machine):
  python3 scripts/mint_run_all.py

  # Requires:  pip install psycopg2-binary python-dateutil

  # Override the Neon URL at runtime:
  NEON_DATABASE_URL=postgresql://... python3 scripts/mint_run_all.py

  # Against the local Replit REST server instead of direct Neon:
  USE_REST=1 python3 scripts/mint_run_all.py

  # Against production Supabase:
  USE_REST=1 SUPABASE_URL=https://xxx.supabase.co SUPABASE_KEY=<key> python3 scripts/mint_run_all.py

  # Re-compute and overwrite ALL existing strategy/client rows:
  FORCE_RECOMPUTE=1 python3 scripts/mint_run_all.py
"""

import os
import urllib.request
import urllib.parse
import json
from decimal import Decimal
from datetime import datetime, timezone, date, timedelta
from dateutil.relativedelta import relativedelta

# ── Configuration ─────────────────────────────────────────────────────────────

# Direct PostgreSQL connection string for Neon.
# Used by default — works from any machine without needing the local REST server.
NEON_DATABASE_URL = os.environ.get(
    "NEON_DATABASE_URL",
    "postgresql://neondb_owner:npg_letB70dsgDSf@ep-soft-thunder-ap1jl6w6-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
)

# Fallback REST API settings (used when USE_REST=1 or psycopg2 is not installed).
SUPABASE_URL = os.environ.get("SUPABASE_URL", "http://localhost:3002")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "neon-test-anon-key")

# Set FORCE_RECOMPUTE=1 to overwrite ALL existing strategy/client rows.
FORCE_RECOMPUTE = os.environ.get("FORCE_RECOMPUTE", "0") == "1"

# ── psycopg2 direct-connect setup ─────────────────────────────────────────────
_USE_REST = os.environ.get("USE_REST", "0") == "1"
_pg_conn  = None

try:
    import psycopg2
    import psycopg2.extras
    USE_DIRECT = not _USE_REST
except ImportError:
    USE_DIRECT = False
    print("[warn] psycopg2 not found — using REST API (http://localhost:3002)")
    print("[warn] Install with: pip install psycopg2-binary")

# Conflict keys for upsert per table
_UPSERT_KEYS = {
    "stock_returns_c"           : ["symbol", "as_of_date"],
    "strategies_returns_c"      : ["strategy_id", "as_of_date"],
    "client_strategy_returns_c" : ["user_id", "strategy_id", "as_of_date"],
    "stock_intraday_c"          : ["symbol", "timestamp"],
}

# FK column on the parent table that references the embedded table's id
_FK_COL = {
    "securities_c": "security_id",
}


def _get_conn():
    global _pg_conn
    if _pg_conn is None or _pg_conn.closed:
        _pg_conn = psycopg2.connect(NEON_DATABASE_URL)
        _pg_conn.autocommit = True
    return _pg_conn


def _q(name):
    return f'"{name}"'


def _serialize(v):
    """Convert psycopg2 native types to JSON-compatible Python types."""
    if isinstance(v, datetime):
        return v.isoformat()
    if isinstance(v, date):
        return v.isoformat()
    if isinstance(v, Decimal):
        return float(v)
    return v


def _parse_endpoint(endpoint):
    """Split 'table?key=val&...' into (table_name, params_dict)."""
    table_part, _, qs = endpoint.partition("?")
    params = {}
    for part in qs.split("&"):
        if "=" not in part:
            continue
        k, _, v = part.partition("=")
        k = urllib.parse.unquote(k)
        v = urllib.parse.unquote_plus(v)
        if k in params:
            existing = params[k]
            params[k] = existing if isinstance(existing, list) else [existing]
            params[k].append(v)
        else:
            params[k] = v
    return table_part.strip("/"), params


def _direct_select(endpoint):
    """Execute a REST-style GET as a direct SQL SELECT via psycopg2."""
    table, params = _parse_endpoint(endpoint)

    # -- Parse select columns (handle embedded resources like securities_c(symbol))
    select_raw  = params.pop("select", "*")
    simple_cols = []
    embedded    = []  # list of (rel_table, [col, ...])

    for part in select_raw.split(","):
        part = part.strip()
        if "(" in part:
            rel_table, rest = part.split("(", 1)
            rel_cols = [c.strip() for c in rest.rstrip(")").split(",")]
            embedded.append((rel_table.strip(), rel_cols))
        elif part:
            simple_cols.append(part)

    # -- SELECT clause
    sel = ["t.*"] if (not simple_cols or simple_cols == ["*"]) else [f"t.{_q(c)}" for c in simple_cols]
    join_sql = []
    for rel_table, rel_cols in embedded:
        for col in rel_cols:
            alias = f"__emb_{rel_table}__{col}"
            sel.append(f'j_{rel_table}.{_q(col)} AS {_q(alias)}')
        fk_col = _FK_COL.get(rel_table, "id")
        join_sql.append(
            f'LEFT JOIN {_q(rel_table)} j_{rel_table} ON t.{_q(fk_col)} = j_{rel_table}.{_q("id")}'
        )

    # -- WHERE clause
    op_map      = {"eq": "=", "gte": ">=", "gt": ">", "lte": "<=", "lt": "<", "neq": "!="}
    reserved    = {"order", "limit", "offset"}
    where_parts = []
    args        = []

    order_raw  = params.pop("order",  None)
    limit_raw  = int(params.pop("limit",  1000))
    offset_raw = int(params.pop("offset", 0))

    for col, val_raw in params.items():
        for v in (val_raw if isinstance(val_raw, list) else [val_raw]):
            dot = v.find(".")
            if dot == -1:
                continue
            op_str, val_str = v[:dot], v[dot + 1:]
            sql_op = op_map.get(op_str)
            if sql_op:
                where_parts.append(f't.{_q(col)} {sql_op} %s')
                args.append(val_str)

    # -- ORDER BY
    order_parts = []
    if order_raw:
        for item in (order_raw if isinstance(order_raw, list) else [order_raw]):
            for o in item.split(","):
                o = o.strip()
                if "." in o:
                    col_o, dir_o = o.rsplit(".", 1)
                    order_parts.append(f't.{_q(col_o)} {"DESC" if dir_o.lower() == "desc" else "ASC"}')
                else:
                    order_parts.append(f't.{_q(o)}')

    sql = f'SELECT {", ".join(sel)} FROM {_q(table)} t'
    if join_sql:
        sql += " " + " ".join(join_sql)
    if where_parts:
        sql += " WHERE " + " AND ".join(where_parts)
    if order_parts:
        sql += " ORDER BY " + ", ".join(order_parts)
    sql += f" LIMIT {limit_raw} OFFSET {offset_raw}"

    conn   = _get_conn()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        cursor.execute(sql, args or None)
        raw_rows = cursor.fetchall()
    except Exception as e:
        print(f"  [direct error] {e}")
        print(f"  [direct sql]   {sql}")
        cursor.close()
        return None
    finally:
        cursor.close()

    # -- Re-assemble embedded resources and serialize types
    result = []
    for row in raw_rows:
        record   = {}
        emb_data = {rt: {} for rt, _ in embedded}
        for key, val in row.items():
            val = _serialize(val)
            matched = False
            for rel_table, rel_cols in embedded:
                prefix = f"__emb_{rel_table}__"
                if key.startswith(prefix):
                    emb_data[rel_table][key[len(prefix):]] = val
                    matched = True
                    break
            if not matched:
                record[key] = val
        for rel_table, rel_dict in emb_data.items():
            record[rel_table] = rel_dict
        result.append(record)

    return result


def _direct_upsert(table, rows, upsert):
    """Execute a REST-style POST as a direct SQL INSERT via psycopg2."""
    if not rows:
        return []

    cols          = list(rows[0].keys())
    conflict_cols = _UPSERT_KEYS.get(table, [])
    col_list      = ", ".join(_q(c) for c in cols)
    val_tmpl      = ", ".join(["%s"] * len(cols))

    if upsert and conflict_cols:
        conflict_str = ", ".join(_q(c) for c in conflict_cols)
        update_cols  = [c for c in cols if c not in conflict_cols]
        if update_cols:
            update_str  = ", ".join(f'{_q(c)} = EXCLUDED.{_q(c)}' for c in update_cols)
            on_conflict = f"ON CONFLICT ({conflict_str}) DO UPDATE SET {update_str}"
        else:
            on_conflict = f"ON CONFLICT ({conflict_str}) DO NOTHING"
    else:
        on_conflict = ""

    sql    = f'INSERT INTO {_q(table)} ({col_list}) VALUES ({val_tmpl}) {on_conflict}'
    values = [[r.get(c) for c in cols] for r in rows]

    conn   = _get_conn()
    cursor = conn.cursor()
    try:
        psycopg2.extras.execute_batch(cursor, sql, values, page_size=500)
    except Exception as e:
        print(f"  [direct error] {e}")
        print(f"  [direct sql]   {sql[:300]}")
        cursor.close()
        return None
    finally:
        cursor.close()

    return []


# ── Shared request dispatcher ─────────────────────────────────────────────────
def supabase_request(method, endpoint, body=None, upsert=False, extra_headers=None):
    if USE_DIRECT:
        if method == "GET":
            return _direct_select(endpoint)
        if method in ("POST", "PATCH", "PUT"):
            table    = endpoint.split("?")[0]
            rows     = body if isinstance(body, list) else ([body] if body else [])
            is_upsert = upsert or "merge-duplicates" in (extra_headers or {}).get("Prefer", "")
            return _direct_upsert(table, rows, is_upsert)
        return []

    # ── REST API fallback ──────────────────────────────────────────────────────
    url    = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    prefer = "resolution=merge-duplicates,return=minimal" if upsert else "return=minimal"
    headers = {
        "apikey"       : SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type" : "application/json",
        "Prefer"       : prefer,
    }
    if extra_headers:
        headers.update(extra_headers)

    data = json.dumps(body).encode() if body else None
    req  = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read().decode()
            return json.loads(raw) if raw else []
    except urllib.error.HTTPError as e:
        print(f"  [error] {e.code}: {e.read().decode()}")
        return None
    except Exception as e:
        print(f"  [error] {e}")
        return None


# ═══════════════════════════════════════════════════════════════════════════════
# STAGE 1 — Stock returns backfill  →  stock_returns_c
# ═══════════════════════════════════════════════════════════════════════════════
PERIOD_DAYS = {
    "1d" : 1,
    "5d" : 5,
    "1m" : 21,
    "6m" : 126,
    "ytd": None,
    "1y" : 252,
    "5y" : 1260,
    "all": None,
}


def s1_get_latest_stored_date(symbol):
    result = supabase_request(
        "GET",
        f"stock_returns_c?select=as_of_date&symbol=eq.{symbol}&order=as_of_date.desc&limit=1"
    )
    return result[0]["as_of_date"] if result else None


def s1_fetch_yahoo_history(ticker, days=1300):
    today    = date.today()
    start_ts = int((datetime.combine(today, datetime.min.time()) - timedelta(days=days)).timestamp())
    end_ts   = int(datetime.combine(today, datetime.min.time()).timestamp())

    url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
        f"?period1={start_ts}&period2={end_ts}&interval=1d&includeAdjustedClose=true"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.loads(r.read().decode())
        result     = data["chart"]["result"][0]
        timestamps = result["timestamp"]
        closes     = result["indicators"]["quote"][0]["close"]
        rows = [(datetime.utcfromtimestamp(ts).date(), c) for ts, c in zip(timestamps, closes) if c is not None]
        seen, cleaned = set(), []
        for d, c in sorted(rows):
            if d not in seen:
                seen.add(d)
                cleaned.append((d, c))
        if cleaned and cleaned[-1][0] >= date.today():
            cleaned = cleaned[:-1]
        return cleaned
    except Exception as e:
        print(f"    [yahoo error] {ticker}: {e}")
        return []


def s1_compute_returns(history, i):
    as_of_date    = history[i][0]
    current_price = history[i][1]
    row           = {"current_price": current_price}

    def get_base_n(n):
        j = i - n
        return history[j][1] if j >= 0 else None

    def get_base_ytd(year):
        for j in range(i - 1, -1, -1):
            if history[j][0].year < year:
                return history[j][1]
        return None

    for label, n in PERIOD_DAYS.items():
        if label == "ytd":
            base = get_base_ytd(as_of_date.year)
        elif label == "all":
            base = history[0][1] if i > 0 else None
        else:
            base = get_base_n(n)

        if base and base != 0:
            row[f"{label}_pct"] = ((current_price - base) / base) * 100
            row[f"{label}_abs"] = current_price - base
        else:
            row[f"{label}_pct"] = None
            row[f"{label}_abs"] = None
    return row


def s1_update_symbol(sec_id, symbol):
    latest_stored = s1_get_latest_stored_date(symbol)
    history       = s1_fetch_yahoo_history(symbol)

    if not history:
        print(f"  [{symbol}] No data from Yahoo, skipping.")
        return

    last_trading_day = history[-1][0]

    if latest_stored and latest_stored >= last_trading_day.isoformat():
        print(f"  [{symbol}] Up to date ({latest_stored}), skipping.")
        return

    if latest_stored:
        missing = [(d, idx) for idx, (d, _) in enumerate(history) if d.isoformat() > latest_stored]
        print(f"  [{symbol}] Latest stored: {latest_stored} | Gap: {len(missing)} day(s)")
    else:
        missing = [(d, idx) for idx, (d, _) in enumerate(history)]
        print(f"  [{symbol}] No data in DB. Inserting all {len(missing)} available day(s).")

    if not missing:
        print(f"  [{symbol}] Nothing to insert.")
        return

    rows_to_upsert = []
    for d, i in sorted(missing, key=lambda x: x[0]):
        returns = s1_compute_returns(history, i)
        rows_to_upsert.append({
            "security_id": sec_id,
            "symbol"     : symbol,
            "as_of_date" : d.isoformat(),
            "fetched_at" : datetime.now(timezone.utc).isoformat(),
            **returns,
        })

    for i in range(0, len(rows_to_upsert), 100):
        batch = rows_to_upsert[i:i + 100]
        ok = supabase_request("POST", "stock_returns_c", batch, upsert=True)
        if ok is None:
            print(f"  [{symbol}] Upsert failed for batch {i // 100 + 1}.")
        else:
            print(f"  [{symbol}] Upserted {len(batch)} row(s) (batch {i // 100 + 1}).")

    print(f"  [{symbol}] Done. {len(rows_to_upsert)} row(s) inserted.")


def run_stage1():
    print(f"\n{'='*60}")
    print(f"STAGE 1 — Stock returns backfill  ({date.today()})")
    print(f"{'='*60}")

    securities = supabase_request("GET", "securities_c?select=id,symbol")
    if not securities:
        print("No securities found. Skipping.")
        return

    print(f"Found {len(securities)} securities.\n")
    for sec in securities:
        sec_id = sec.get("id")
        symbol = sec.get("symbol")
        if symbol:
            s1_update_symbol(sec_id, symbol)

    print("\nStage 1 complete.")


# ═══════════════════════════════════════════════════════════════════════════════
# STAGE 2 — Strategy returns  →  strategies_returns_c
# ═══════════════════════════════════════════════════════════════════════════════
PERIODS = ["1d", "5d", "1m", "6m", "ytd", "1y", "5y", "all"]


def s2_fetch_existing_dates(strategy_id):
    if FORCE_RECOMPUTE:
        return set()
    all_dates, offset, limit = set(), 0, 1000
    while True:
        batch = supabase_request(
            "GET",
            f"strategies_returns_c?select=as_of_date"
            f"&strategy_id=eq.{strategy_id}&limit={limit}&offset={offset}"
        )
        if not batch:
            break
        for row in batch:
            all_dates.add(row["as_of_date"])
        if len(batch) < limit:
            break
        offset += limit
    return all_dates


def s2_fetch_stock_returns(symbol):
    today           = date.today()
    three_years_ago = (today - relativedelta(years=3)).isoformat()
    all_rows, offset, limit = [], 0, 1000
    while True:
        batch = supabase_request(
            "GET",
            f"stock_returns_c?select=as_of_date,current_price,"
            f"1d_abs,5d_abs,1m_abs,6m_abs,ytd_abs,1y_abs,5y_abs,all_abs"
            f"&symbol=eq.{symbol}"
            f"&as_of_date=gte.{three_years_ago}"
            f"&as_of_date=lt.{today.isoformat()}"
            f"&order=as_of_date.asc&limit={limit}&offset={offset}"
        )
        if not batch:
            break
        all_rows.extend(batch)
        if len(batch) < limit:
            break
        offset += limit
    return {row["as_of_date"]: row for row in all_rows}


def s2_process_strategy(strategy_id, holdings):
    print(f"\n  Strategy {strategy_id}")
    print(f"  Holdings: {[h['symbol'] for h in holdings]}")

    existing_dates = s2_fetch_existing_dates(strategy_id)
    if existing_dates and not FORCE_RECOMPUTE:
        print(f"  {len(existing_dates)} dates already exist (latest: {max(existing_dates)}). "
              f"Only new dates will be inserted. Use FORCE_RECOMPUTE=1 to overwrite all.")

    holding_data = {}
    for h in holdings:
        symbol = h["symbol"]
        shares = h["shares"]
        print(f"    Fetching stock returns for {symbol}...")
        rows = s2_fetch_stock_returns(symbol)
        print(f"    {symbol}: {len(rows)} days loaded")
        holding_data[symbol] = {"shares": shares, "rows": rows}

    date_sets    = [set(holding_data[h["symbol"]]["rows"].keys()) for h in holdings]
    common_dates = sorted(set.intersection(*date_sets)) if date_sets else []
    new_dates    = [d for d in common_dates if d not in existing_dates]

    print(f"  Latest common date: {common_dates[-1] if common_dates else 'NONE'}")
    print(f"  Dates to process: {len(new_dates)}")

    if not new_dates:
        print(f"  No new dates to insert.")
        return

    fetched_at        = datetime.now(timezone.utc).isoformat()
    cumulative_1d_pct = 0.0
    rows_to_insert    = []

    for as_of_date in common_dates:
        basket_value = 0
        period_pnls  = {p: 0.0 for p in PERIODS}
        period_valid = {p: True for p in PERIODS}
        skip         = False

        for h in holdings:
            symbol = h["symbol"]
            shares = holding_data[symbol]["shares"]
            row    = holding_data[symbol]["rows"].get(as_of_date)
            if not row:
                skip = True
                break
            current_price = row.get("current_price")
            if current_price is None:
                skip = True
                break
            # stock_returns_c stores Yahoo Finance prices in cents — divide by 100 for rands
            current_price_rands = current_price / 100
            basket_value += shares * current_price_rands
            for p in PERIODS:
                if not period_valid[p]:
                    continue
                abs_val = row.get(f"{p}_abs")
                if abs_val is not None:
                    # abs values are also in cents — divide by 100 for rands
                    period_pnls[p] += shares * (abs_val / 100)
                else:
                    period_valid[p] = False

        if skip or basket_value == 0:
            continue

        one_d_pct = None
        if period_valid["1d"]:
            pnl       = period_pnls["1d"]
            base_val  = basket_value - pnl
            one_d_pct = (pnl / base_val * 100) if base_val != 0 else None

        if one_d_pct is not None:
            cumulative_1d_pct += one_d_pct

        if as_of_date not in existing_dates:
            record = {
                "strategy_id"      : strategy_id,
                "as_of_date"       : as_of_date,
                "basket_value"     : basket_value,
                "fetched_at"       : fetched_at,
                "cumulative_1d_pct": cumulative_1d_pct,
            }
            for p in PERIODS:
                if period_valid[p]:
                    pnl   = period_pnls[p]
                    base  = basket_value - pnl
                    pct   = (pnl / base * 100) if base != 0 else None
                    record[f"{p}_pnl"] = pnl
                    record[f"{p}_pct"] = pct
                else:
                    record[f"{p}_pnl"] = None
                    record[f"{p}_pct"] = None
            rows_to_insert.append(record)

    if not rows_to_insert:
        print(f"  No rows to insert.")
        return

    total, inserted = len(rows_to_insert), 0
    for start in range(0, total, 500):
        batch = rows_to_insert[start:start + 500]
        # Use upsert so re-runs overwrite corrupted rows instead of failing
        ok = supabase_request("POST", "strategies_returns_c", batch, upsert=True)
        if ok is None:
            print(f"  Batch insert failed at row {start}")
            return
        inserted += len(batch)
        print(f"  Inserted {inserted}/{total} rows...")

    print(f"  Done. {total} rows inserted.")


def run_stage2():
    print(f"\n{'='*60}")
    print(f"STAGE 2 — Strategy returns")
    print(f"{'='*60}")
    if FORCE_RECOMPUTE:
        print("  FORCE_RECOMPUTE=1 — will overwrite all existing rows.\n")

    strategies = supabase_request("GET", "strategies_c?select=id,holdings")
    if not strategies:
        print("No strategies found. Skipping.")
        return

    print(f"Found {len(strategies)} strategies.")
    for strat in strategies:
        strategy_id = strat.get("id")
        holdings    = strat.get("holdings")
        if not holdings or not isinstance(holdings, list):
            print(f"\n  [{strategy_id}] No valid holdings, skipping.")
            continue
        s2_process_strategy(strategy_id, holdings)

    print("\nStage 2 complete.")


# ═══════════════════════════════════════════════════════════════════════════════
# STAGE 3 — Client returns  →  client_strategy_returns_c
# ═══════════════════════════════════════════════════════════════════════════════
PERIOD_LOOKBACK = {
    "1d" : 1,
    "5d" : 5,
    "1m" : 21,
    "6m" : 126,
    "ytd": None,
    "1y" : 252,
    "5y" : 1260,
}


def s3_fetch_all_holdings():
    all_rows, offset, limit = [], 0, 1000
    while True:
        batch = supabase_request(
            "GET",
            f"stock_holdings_c?select=id,user_id,strategy_id,quantity,avg_fill,avg_exit,"
            f"Fill_date,Exit_date,is_active,Status,security_id,"
            f"securities_c(symbol)"
            f"&limit={limit}&offset={offset}"
        )
        if not batch:
            break
        all_rows.extend(batch)
        if len(batch) < limit:
            break
        offset += limit
    return all_rows


def s3_fetch_stock_returns(symbols, start_date):
    index           = {}
    today           = date.today().isoformat()
    three_years_ago = (date.today() - relativedelta(years=3)).isoformat()
    from_date       = max(start_date, three_years_ago)

    for symbol in symbols:
        offset, limit = 0, 1000
        while True:
            batch = supabase_request(
                "GET",
                f"stock_returns_c?select=symbol,as_of_date,current_price"
                f"&symbol=eq.{symbol}"
                f"&as_of_date=gte.{from_date}"
                f"&as_of_date=lt.{today}"
                f"&order=as_of_date.asc&limit={limit}&offset={offset}"
            )
            if not batch:
                break
            for row in batch:
                key = (row["symbol"], row["as_of_date"])
                # stock_returns_c stores Yahoo Finance prices in cents — divide by 100 for rands
                index[key] = float(row["current_price"]) / 100 if row.get("current_price") else None
            if len(batch) < limit:
                break
            offset += limit

        count = sum(1 for (s, _) in index if s == symbol)
        print(f"    Loaded {symbol}: {count} rows")

    return index


def s3_get_price_n_days_back(symbol, as_of_date_str, n, stock_index):
    as_of = date.fromisoformat(as_of_date_str)
    count = 0
    for i in range(1, n + 30 + 1):
        candidate = (as_of - timedelta(days=i)).isoformat()
        if (symbol, candidate) in stock_index:
            count += 1
            if count == n:
                return stock_index[(symbol, candidate)], candidate
    return None, None


def s3_get_price_ytd_base(symbol, as_of_date_str, stock_index):
    as_of = date.fromisoformat(as_of_date_str)
    jan1  = date(as_of.year, 1, 1)
    for i in range(1, 30):
        candidate = (jan1 - timedelta(days=i)).isoformat()
        if (symbol, candidate) in stock_index:
            return stock_index[(symbol, candidate)], candidate
    return None, None


def s3_get_period_window_start(period, as_of_date_str, stock_index, symbol):
    if period == "ytd":
        as_of = date.fromisoformat(as_of_date_str)
        jan1  = date(as_of.year, 1, 1)
        for i in range(1, 30):
            candidate = (jan1 - timedelta(days=i)).isoformat()
            if (symbol, candidate) in stock_index:
                return candidate
        return jan1.isoformat()
    else:
        _, period_start = s3_get_price_n_days_back(symbol, as_of_date_str, PERIOD_LOOKBACK[period], stock_index)
        return period_start


def s3_get_period_base(symbol, as_of_date, fill_date, avg_fill, period, stock_index):
    # avg_fill is stored in cents — divide by 100 for rands
    avg_fill_f = float(avg_fill) / 100 if avg_fill else None

    if period == "1d":
        if as_of_date == fill_date:
            return avg_fill_f
        price, _ = s3_get_price_n_days_back(symbol, as_of_date, 1, stock_index)
        return price
    elif period == "ytd":
        if date.fromisoformat(fill_date).year == date.fromisoformat(as_of_date).year:
            return avg_fill_f
        price, _ = s3_get_price_ytd_base(symbol, as_of_date, stock_index)
        return price if price is not None else avg_fill_f
    else:
        n = PERIOD_LOOKBACK[period]
        price, period_start = s3_get_price_n_days_back(symbol, as_of_date, n, stock_index)
        if period_start is None:
            return None
        if period_start < fill_date:
            return avg_fill_f
        return price


def s3_fetch_existing_dates(user_id, strategy_id):
    if FORCE_RECOMPUTE:
        return set()
    existing, offset, limit = set(), 0, 1000
    while True:
        batch = supabase_request(
            "GET",
            f"client_strategy_returns_c?select=as_of_date"
            f"&user_id=eq.{user_id}&strategy_id=eq.{strategy_id}"
            f"&limit={limit}&offset={offset}"
        )
        if not batch:
            break
        for row in batch:
            existing.add(row["as_of_date"])
        if len(batch) < limit:
            break
        offset += limit
    return existing


def s3_get_active_holdings(holdings, as_of_date):
    return [
        h for h in holdings
        if h.get("Fill_date")
        and h["Fill_date"] <= as_of_date
        and not (h.get("Exit_date") and h["Exit_date"] < as_of_date)
    ]


def s3_process_client_strategy(user_id, strategy_id, holdings):
    symbols = {h.get("securities_c", {}).get("symbol") for h in holdings if h.get("securities_c", {}).get("symbol")}
    if not symbols:
        return

    fill_dates = [h.get("Fill_date") for h in holdings if h.get("Fill_date")]
    if not fill_dates:
        return
    start_date = min(fill_dates)

    print(f"    Loading stock returns for {len(symbols)} symbol(s) from {start_date}...")
    stock_index = s3_fetch_stock_returns(symbols, start_date)

    all_dates = sorted({dt for (sym, dt) in stock_index if sym in symbols and dt >= start_date})
    if not all_dates:
        print(f"    No trading dates found.")
        return

    existing_dates = s3_fetch_existing_dates(user_id, strategy_id)
    fetched_at     = datetime.now(timezone.utc).isoformat()
    rows_to_insert = []
    inception_pnl  = 0.0
    closed_trades  = []

    print(f"    Start date: {start_date} | {len(all_dates)} trading days")

    for as_of_date in all_dates:
        active = s3_get_active_holdings(holdings, as_of_date)
        if not active:
            continue

        basket_value      = 0.0
        period_pnls       = {p: 0.0 for p in PERIOD_LOOKBACK}
        period_valid      = {p: True for p in PERIOD_LOOKBACK}
        holdings_snapshot = []
        skip_day          = False
        day_realised_pnl  = 0.0

        # inception_cost = cost of current open positions (avg_fill in cents → rands)
        inception_cost = sum(
            (float(h.get("avg_fill") or 0) / 100) * float(h.get("quantity") or 0)
            for h in active
            if h.get("avg_fill")
            and not (h.get("Exit_date") == as_of_date and not h.get("is_active"))
        )

        for h in active:
            sym       = h.get("securities_c", {}).get("symbol")
            qty       = float(h.get("quantity") or 0)
            avg_fill  = h.get("avg_fill")
            avg_exit  = h.get("avg_exit")
            fill_date = h.get("Fill_date")
            exit_date = h.get("Exit_date")
            is_active = h.get("is_active")

            if not sym or qty == 0:
                continue

            is_fill_day = (fill_date == as_of_date)
            is_exit_day = (exit_date == as_of_date and not is_active)

            today_price = stock_index.get((sym, as_of_date))
            if today_price is None:
                skip_day = True
                break

            if is_exit_day:
                # avg_exit is in cents — divide by 100 for rands
                eod_price = float(avg_exit) / 100 if avg_exit else None
                if eod_price is None:
                    skip_day = True
                    break
                if avg_fill:
                    day_realised_pnl += qty * (eod_price - float(avg_fill) / 100)
            else:
                eod_price = today_price

            if not is_exit_day:
                basket_value += qty * eod_price

            holdings_snapshot.append({
                "symbol"       : sym,
                "qty"          : qty,
                "avg_fill"     : float(avg_fill) / 100 if avg_fill else None,
                "avg_exit"     : float(avg_exit) / 100 if (is_exit_day and avg_exit) else None,
                "current_price": eod_price,
                "is_fill_day"  : is_fill_day,
                "is_exit_day"  : is_exit_day,
            })

            for p in PERIOD_LOOKBACK:
                if not period_valid[p]:
                    continue
                base = s3_get_period_base(sym, as_of_date, fill_date, avg_fill, p, stock_index)
                if base is None:
                    period_valid[p] = False
                    continue
                if not is_exit_day:
                    period_pnls[p] += qty * (eod_price - float(base))

        if skip_day or basket_value == 0:
            continue

        day_1d_pnl     = period_pnls["1d"] + day_realised_pnl
        inception_pnl += day_1d_pnl
        inception_pct  = (inception_pnl / inception_cost * 100) if inception_cost != 0 else None

        if day_realised_pnl != 0:
            closed_trades.append({"exit_date": as_of_date, "pnl": day_realised_pnl})

        if as_of_date in existing_dates:
            continue

        first_sym = next(
            (h.get("securities_c", {}).get("symbol") for h in active if h.get("securities_c", {}).get("symbol")),
            None
        )

        record = {
            "user_id"          : user_id,
            "strategy_id"      : strategy_id,
            "as_of_date"       : as_of_date,
            "basket_value"     : basket_value,
            "fetched_at"       : fetched_at,
            "inception_pnl"    : inception_pnl,
            "inception_pct"    : inception_pct,
            "holdings_snapshot": json.dumps(holdings_snapshot),
        }

        for p in PERIOD_LOOKBACK:
            if not period_valid[p]:
                record[f"{p}_pnl"] = None
                record[f"{p}_pct"] = None
                continue
            period_realised = 0.0
            if first_sym and closed_trades:
                window_start = s3_get_period_window_start(p, as_of_date, stock_index, first_sym)
                if window_start:
                    for trade in closed_trades:
                        if window_start < trade["exit_date"] <= as_of_date:
                            period_realised += trade["pnl"]
            pnl  = period_pnls[p] + period_realised
            base = basket_value - period_pnls[p]
            record[f"{p}_pnl"] = pnl
            record[f"{p}_pct"] = (pnl / base * 100) if base != 0 else None

        rows_to_insert.append(record)

    if not rows_to_insert:
        print(f"    No new rows to insert.")
        return

    total, inserted = len(rows_to_insert), 0
    for start in range(0, total, 500):
        batch = rows_to_insert[start:start + 500]
        ok    = supabase_request("POST", "client_strategy_returns_c", batch, upsert=True)
        if ok is None:
            print(f"    Batch insert failed at row {start}")
            return
        inserted += len(batch)

    print(f"    Inserted {inserted} rows.")


def run_stage3():
    print(f"\n{'='*60}")
    print(f"STAGE 3 — Client returns")
    print(f"{'='*60}")
    if FORCE_RECOMPUTE:
        print("  FORCE_RECOMPUTE=1 — will overwrite all existing rows.\n")

    holdings = s3_fetch_all_holdings()
    if not holdings:
        print("No holdings found. Skipping.")
        return

    print(f"Found {len(holdings)} holding rows.")

    groups = {}
    for h in holdings:
        user_id     = h.get("user_id")
        strategy_id = h.get("strategy_id")
        if not user_id or not strategy_id:
            continue
        key = (user_id, strategy_id)
        groups.setdefault(key, []).append(h)

    print(f"Found {len(groups)} client+strategy combination(s).\n")

    for (user_id, strategy_id), group in groups.items():
        print(f"  Processing client {user_id[:8]}... strategy {strategy_id[:8]}...")
        s3_process_client_strategy(user_id, strategy_id, group)

    print("\nStage 3 complete.")


# ═══════════════════════════════════════════════════════════════════════════════
# STAGE 4 — Intraday prices  →  stock_intraday_c
# ═══════════════════════════════════════════════════════════════════════════════

def s4_fetch_intraday_yahoo(ticker):
    url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
        f"?range=1d&interval=1m&includeAdjustedClose=true"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.loads(r.read().decode())
        result     = data["chart"]["result"][0]
        meta       = result["meta"]
        timestamps = result.get("timestamp")
        if not timestamps:
            return []
        closes     = result["indicators"]["quote"][0]["close"]
        prev_close = meta.get("chartPreviousClose")
        if not prev_close:
            return []
        rows = []
        for ts, c in zip(timestamps, closes):
            if c is None:
                continue
            ts_iso = datetime.utcfromtimestamp(ts).replace(tzinfo=timezone.utc).isoformat()
            rows.append((ts_iso, c, ((c - prev_close) / prev_close) * 100, c - prev_close))
        return rows
    except Exception as e:
        print(f"  [{ticker}] Yahoo error: {e}")
        return []


def s4_fetch_existing_timestamps(symbol):
    existing = set()
    today     = datetime.now(timezone.utc).date().isoformat()
    gte_param = urllib.parse.quote(f"{today}T00:00:00+00:00", safe="")
    offset, limit = 0, 1000
    while True:
        batch = supabase_request(
            "GET",
            f"stock_intraday_c?select=timestamp&symbol=eq.{symbol}"
            f"&timestamp=gte.{gte_param}&limit={limit}&offset={offset}"
        )
        if not batch:
            break
        for row in batch:
            existing.add(row["timestamp"])
        if len(batch) < limit:
            break
        offset += limit
    return existing


def s4_process_symbol(sec_id, symbol):
    rows = s4_fetch_intraday_yahoo(symbol)
    if not rows:
        return

    existing  = s4_fetch_existing_timestamps(symbol)
    to_insert = [
        {
            "security_id"  : sec_id,
            "symbol"       : symbol,
            "timestamp"    : ts_iso,
            "current_price": price,
            "1d_pct"       : pct,
            "1d_abs"       : abs_change,
        }
        for ts_iso, price, pct, abs_change in rows
        if ts_iso not in existing
    ]

    if not to_insert:
        return

    ok = supabase_request("POST", "stock_intraday_c", to_insert, upsert=True)
    if ok is None:
        print(f"  [{symbol}] Insert failed.")
    else:
        print(f"  [{symbol}] Inserted {len(to_insert)} rows.")


def run_stage4():
    print(f"\n{'='*60}")
    print(f"STAGE 4 — Intraday prices")
    print(f"{'='*60}")

    securities = supabase_request("GET", "securities_c?select=id,symbol")
    if not securities:
        print("No securities found. Skipping.")
        return

    print(f"Found {len(securities)} securities.\n")
    for sec in securities:
        sec_id = sec.get("id")
        symbol = sec.get("symbol")
        if symbol:
            s4_process_symbol(sec_id, symbol)

    print("\nStage 4 complete.")


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print(f"\nMint Finance — Data Pipeline")
    print(f"Target: {SUPABASE_URL}")
    print(f"Force recompute: {FORCE_RECOMPUTE}")

    run_stage1()   # stock returns backfill  (feeds stages 2 + 3)
    run_stage2()   # strategy basket returns (reads stage 1 output)
    run_stage3()   # client portfolio returns (reads stage 1 output)
    run_stage4()   # intraday prices          (independent)

    print(f"\n{'='*60}")
    print("All stages complete.")
    print(f"{'='*60}\n")
