import urllib.request
import urllib.parse
import json
from datetime import datetime, timezone

SUPABASE_URL = ""  # Set via SUPABASE_URL environment variable
SUPABASE_KEY = ""  # Set via SUPABASE_SERVICE_ROLE_KEY environment variable


def supabase_request(method, endpoint, body=None):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    headers = {
        "apikey"       : SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type" : "application/json",
        "Prefer"       : "return=minimal"
    }
    data = json.dumps(body).encode() if body else None
    req  = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            raw = r.read().decode()
            return json.loads(raw) if raw else []
    except urllib.error.HTTPError as e:
        print(f"  [supabase error] {e.code}: {e.read().decode()}")
        return None
    except Exception as e:
        print(f"  [supabase error] {e}")
        return None


def fetch_intraday(ticker):
    """Fetch 1m candles for today from Yahoo Finance."""
    url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
        f"?range=1d&interval=1m&includeAdjustedClose=true"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.loads(r.read().decode())

        result = data["chart"]["result"][0]
        meta   = result["meta"]

        # Some symbols return no intraday timestamps (illiquid / market closed)
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
            ts_iso     = datetime.utcfromtimestamp(ts).replace(tzinfo=timezone.utc).isoformat()
            pct        = ((c - prev_close) / prev_close) * 100
            abs_change = c - prev_close
            rows.append((ts_iso, c, pct, abs_change))

        return rows

    except Exception as e:
        print(f"  [{ticker}] Yahoo error: {e}")
        return []


def fetch_existing_timestamps(symbol):
    """Fetch all timestamps already stored for this symbol today."""
    existing = set()
    offset   = 0
    limit    = 1000

    today     = datetime.now(timezone.utc).date().isoformat()
    # URL encode the + sign to avoid space issue
    gte_param = urllib.parse.quote(f"{today}T00:00:00+00:00", safe="")

    while True:
        batch = supabase_request(
            "GET",
            f"stock_intraday_c?select=timestamp"
            f"&symbol=eq.{symbol}"
            f"&timestamp=gte.{gte_param}"
            f"&limit={limit}&offset={offset}"
        )
        if not batch:
            break
        for row in batch:
            existing.add(row["timestamp"])
        if len(batch) < limit:
            break
        offset += limit

    return existing


def process_symbol(sec_id, symbol):
    rows = fetch_intraday(symbol)
    if not rows:
        return  # silent skip for no intraday data

    existing = fetch_existing_timestamps(symbol)

    to_insert = []
    for ts_iso, price, pct, abs_change in rows:
        if ts_iso in existing:
            continue
        to_insert.append({
            "security_id"  : sec_id,
            "symbol"       : symbol,
            "timestamp"    : ts_iso,
            "current_price": price,
            "1d_pct"       : pct,
            "1d_abs"       : abs_change,
        })

    if not to_insert:
        return  # silent skip if nothing new

    result = supabase_request("POST", "stock_intraday_c", to_insert)
    if result is None:
        print(f"  [{symbol}] Insert failed.")
    else:
        print(f"  [{symbol}] Inserted {len(to_insert)} rows.")


def main():
    print("\nFetching securities from Supabase...")
    securities = supabase_request("GET", "securities_c?select=id,symbol")
    if not securities:
        print("No securities found.")
        return

    print(f"Found {len(securities)} securities.\n")

    for sec in securities:
        sec_id = sec.get("id")
        symbol = sec.get("symbol")
        if not symbol:
            continue
        process_symbol(sec_id, symbol)

    print("\nIntraday update complete.")


if __name__ == "__main__":
    main()