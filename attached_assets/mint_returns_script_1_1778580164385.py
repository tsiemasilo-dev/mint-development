import urllib.request
import json
from datetime import datetime, timezone, date, timedelta

SUPABASE_URL = "https://mfxnghmuccevsxwcetej.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1meG5naG11Y2NldnN4d2NldGVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg1MjU4MCwiZXhwIjoyMDg0NDI4NTgwfQ.0gsEFLa3PtZ82Oams9qbbdx6MFHCMCSlL-aa_ZcHHsY"

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


def supabase_request(method, endpoint, body=None, extra_headers=None):
    url     = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    headers = {
        "apikey"       : SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type" : "application/json",
        "Prefer"       : "return=minimal"
    }
    if extra_headers:
        headers.update(extra_headers)
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


def get_latest_stored_date(symbol: str):
    """Returns the most recent as_of_date stored for this symbol, or None."""
    result = supabase_request(
        "GET",
        f"stock_returns_c?select=as_of_date&symbol=eq.{symbol}&order=as_of_date.desc&limit=1"
    )
    if result:
        return result[0]["as_of_date"]  # e.g. "2025-04-10"
    return None


def fetch_recent_history(ticker, days=1300):
    """
    Fetch enough recent history to compute all return periods (max 5y = 1260 days).
    Yahoo's returned dates are the source of truth for what's a trading day.
    """
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
        rows = []
        for ts, c in zip(timestamps, closes):
            if c is not None:
                rows.append((datetime.utcfromtimestamp(ts).date(), c))

        # Deduplicate and sort
        seen, cleaned = set(), []
        for d, c in sorted(rows, key=lambda x: x[0]):
            if d not in seen:
                seen.add(d)
                cleaned.append((d, c))

        # Drop today if present (only want completed trading days)
        if cleaned and cleaned[-1][0] >= date.today():
            cleaned = cleaned[:-1]

        return cleaned
    except Exception as e:
        print(f"    [fetch error] {ticker}: {e}")
        return []


def compute_returns(history, i):
    as_of_date    = history[i][0]
    current_price = history[i][1]
    row           = {"current_price": current_price}

    def get_base(n_days_back):
        target_i = i - n_days_back
        return history[target_i][1] if target_i >= 0 else None

    def get_base_ytd(year):
        for j in range(i - 1, -1, -1):
            if history[j][0].year < year:
                return history[j][1]
        return None

    for label, n_days in PERIOD_DAYS.items():
        if label == "ytd":
            base = get_base_ytd(as_of_date.year)
        elif label == "all":
            base = history[0][1] if i > 0 else None
        else:
            base = get_base(n_days)

        if base and base != 0:
            row[f"{label}_pct"] = ((current_price - base) / base) * 100
            row[f"{label}_abs"] = current_price - base
        else:
            row[f"{label}_pct"] = None
            row[f"{label}_abs"] = None

    return row


def update_symbol(sec_id, symbol):
    # Step 1: What's the latest date we have stored?
    latest_stored = get_latest_stored_date(symbol)

    # Step 2: Fetch history from Yahoo (source of truth for trading days)
    history = fetch_recent_history(symbol)

    if not history:
        print(f"  [{symbol}] No data from Yahoo, skipping.")
        return

    # Step 3: Last available trading day = last entry in Yahoo data
    last_trading_day = history[-1][0]

    # Step 4: Already up to date?
    if latest_stored and latest_stored >= last_trading_day.isoformat():
        print(f"  [{symbol}] Up to date ({latest_stored}), skipping.")
        return

    # Step 5: Find all Yahoo dates after latest_stored
    if latest_stored:
        missing = [(d, idx) for idx, (d, _) in enumerate(history) if d.isoformat() > latest_stored]
        print(f"  [{symbol}] Latest stored: {latest_stored} | Last trading day: {last_trading_day} | Gap: {len(missing)} day(s)")
    else:
        missing = [(d, idx) for idx, (d, _) in enumerate(history)]
        print(f"  [{symbol}] No data in DB. Inserting all {len(missing)} available day(s).")

    if not missing:
        print(f"  [{symbol}] Nothing to insert.")
        return

    # Step 6: Build rows
    rows_to_upsert = []
    for d, i in sorted(missing, key=lambda x: x[0]):
        returns = compute_returns(history, i)
        rows_to_upsert.append({
            "security_id": sec_id,
            "symbol"     : symbol,
            "as_of_date" : d.isoformat(),
            "fetched_at" : datetime.now(timezone.utc).isoformat(),
            **returns
        })

    # Step 7: Upsert in batches of 100
    batch_size = 100
    for i in range(0, len(rows_to_upsert), batch_size):
        batch = rows_to_upsert[i:i + batch_size]
        result = supabase_request(
            "POST",
            "stock_returns_c",
            batch,
            extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"}
        )
        if result is None:
            print(f"  [{symbol}] Upsert failed for batch {i // batch_size + 1}.")
        else:
            print(f"  [{symbol}] Upserted {len(batch)} row(s) (batch {i // batch_size + 1}).")

    print(f"  [{symbol}] Done. {len(rows_to_upsert)} row(s) inserted.")


def main():
    print(f"\nBackfill update — {date.today()}")
    print("Fetching securities from Supabase...")

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
        update_symbol(sec_id, symbol)

    print("\nBackfill complete.")


if __name__ == "__main__":
    main()