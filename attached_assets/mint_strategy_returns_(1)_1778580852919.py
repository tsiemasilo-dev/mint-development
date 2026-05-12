import urllib.request
import json
from datetime import datetime, timezone, date
from dateutil.relativedelta import relativedelta

SUPABASE_URL = "https://mfxnghmuccevsxwcetej.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1meG5naG11Y2NldnN4d2NldGVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg1MjU4MCwiZXhwIjoyMDg0NDI4NTgwfQ.0gsEFLa3PtZ82Oams9qbbdx6MFHCMCSlL-aa_ZcHHsY"

PERIODS = ["1d", "5d", "1m", "6m", "ytd", "1y", "5y", "all"]


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


def fetch_existing_dates(strategy_id):
    """Fetch all as_of_dates already stored for this strategy."""
    all_dates = set()
    offset    = 0
    limit     = 1000

    while True:
        batch = supabase_request(
            "GET",
            f"strategies_returns_c?select=as_of_date"
            f"&strategy_id=eq.{strategy_id}"
            f"&limit={limit}&offset={offset}"
        )
        if not batch:
            break
        for row in batch:
            all_dates.add(row["as_of_date"])
        if len(batch) < limit:
            break
        offset += limit

    return all_dates


def fetch_stock_returns_for_symbol(symbol):
    today           = date.today()
    three_years_ago = (today - relativedelta(years=3)).isoformat()
    today_str       = today.isoformat()

    all_rows = []
    offset   = 0
    limit    = 1000

    while True:
        batch = supabase_request(
            "GET",
            f"stock_returns_c?select=as_of_date,current_price,"
            f"1d_abs,5d_abs,1m_abs,6m_abs,ytd_abs,1y_abs,5y_abs,all_abs"
            f"&symbol=eq.{symbol}"
            f"&as_of_date=gte.{three_years_ago}"
            f"&as_of_date=lt.{today_str}"
            f"&order=as_of_date.asc"
            f"&limit={limit}&offset={offset}"
        )
        if not batch:
            break
        all_rows.extend(batch)
        if len(batch) < limit:
            break
        offset += limit

    return {row["as_of_date"]: row for row in all_rows}


def process_strategy(strategy_id, holdings):
    print(f"\n  Strategy {strategy_id}")
    print(f"  Holdings: {[h['symbol'] for h in holdings]}")

    # Step 1 — fetch existing dates to skip
    existing_dates = fetch_existing_dates(strategy_id)
    print(f"  {len(existing_dates)} dates already exist, will skip these.")
    if existing_dates:
        print(f"  Latest existing date: {max(existing_dates)}")

    # Step 2 — fetch stock returns per holding
    holding_data = {}
    for h in holdings:
        symbol = h["symbol"]
        shares = h["shares"]
        print(f"    Fetching data for {symbol}...")
        rows = fetch_stock_returns_for_symbol(symbol)
        print(f"    {symbol}: {len(rows)} days loaded")
        holding_data[symbol] = {"shares": shares, "rows": rows}

    # DEBUG — show latest available date per holding
    print(f"\n  [DEBUG] Latest date per holding in stock_returns_c:")
    for symbol, data in holding_data.items():
        latest = max(data["rows"].keys()) if data["rows"] else "NO DATA"
        print(f"    {symbol}: {latest}")

    # Step 3 — get intersection of dates across all holdings, exclude existing
    date_sets    = [set(holding_data[h["symbol"]]["rows"].keys()) for h in holdings]
    common_dates = sorted(set.intersection(*date_sets)) if date_sets else []
    new_dates    = [d for d in common_dates if d not in existing_dates]

    print(f"\n  [DEBUG] Latest common date across all holdings: {common_dates[-1] if common_dates else 'NONE'}")
    print(f"  [DEBUG] New dates to insert: {len(new_dates)}")
    if new_dates:
        print(f"  [DEBUG] First new date: {new_dates[0]} | Last new date: {new_dates[-1]}")

    if not new_dates:
        print(f"  No new dates to insert.")
        return

    print(f"  {len(new_dates)} new trading days to insert. Computing...")

    # Step 4 — compute cumulative from scratch across all common dates
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

            # stock_returns_c stores Yahoo Finance prices in cents (JSE stocks) — convert to rands
            current_price_rands = current_price / 100
            basket_value += shares * current_price_rands

            for p in PERIODS:
                if not period_valid[p]:
                    continue
                abs_val = row.get(f"{p}_abs")
                if abs_val is not None:
                    # abs values are also in cents (price_now - price_base, both cents)
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
            result = {
                "strategy_id"      : strategy_id,
                "as_of_date"       : as_of_date,
                "basket_value"     : basket_value,
                "fetched_at"       : fetched_at,
                "cumulative_1d_pct": cumulative_1d_pct,
            }

            for p in PERIODS:
                if period_valid[p]:
                    pnl        = period_pnls[p]
                    base_value = basket_value - pnl
                    pct        = (pnl / base_value * 100) if base_value != 0 else None
                    result[f"{p}_pnl"] = pnl
                    result[f"{p}_pct"] = pct
                else:
                    result[f"{p}_pnl"] = None
                    result[f"{p}_pct"] = None

            rows_to_insert.append(result)

    if not rows_to_insert:
        print(f"  No rows to insert.")
        return

    # Step 5 — insert in batches of 500
    batch_size = 500
    total      = len(rows_to_insert)
    inserted   = 0

    for start in range(0, total, batch_size):
        batch  = rows_to_insert[start:start + batch_size]
        result = supabase_request("POST", "strategies_returns_c", batch)
        if result is None:
            print(f"  Batch insert failed at row {start}")
            return
        inserted += len(batch)
        print(f"  Inserted {inserted}/{total} rows...")

    print(f"  Done. {total} rows inserted.")


def main():
    print("\nFetching strategies from Supabase...")
    strategies = supabase_request("GET", "strategies_c?select=id,holdings")
    if not strategies:
        print("No strategies found.")
        return

    print(f"Found {len(strategies)} strategies.")

    for strat in strategies:
        strategy_id = strat.get("id")
        holdings    = strat.get("holdings")

        if not holdings or not isinstance(holdings, list):
            print(f"\n  [{strategy_id}] No valid holdings, skipping.")
            continue

        process_strategy(strategy_id, holdings)

    print("\nStrategy backfill complete.")


if __name__ == "__main__":
    main()