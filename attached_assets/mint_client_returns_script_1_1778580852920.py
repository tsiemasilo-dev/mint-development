import urllib.request
import json
from datetime import datetime, timezone, date, timedelta
from dateutil.relativedelta import relativedelta

SUPABASE_URL = "https://mfxnghmuccevsxwcetej.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1meG5naG11Y2NldnN4d2NldGVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg1MjU4MCwiZXhwIjoyMDg0NDI4NTgwfQ.0gsEFLa3PtZ82Oams9qbbdx6MFHCMCSlL-aa_ZcHHsY"

PERIOD_LOOKBACK = {
    "1d" : 1,
    "5d" : 5,
    "1m" : 21,
    "6m" : 126,
    "ytd": None,
    "1y" : 252,
    "5y" : 1260,
}

DEBUG_USER = "38f15178-c388-4488-8f11-f71a1ecaa3f6"


def supabase_request(method, endpoint, body=None, upsert=False):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    headers = {
        "apikey"       : SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type" : "application/json",
        "Prefer"       : "resolution=merge-duplicates,return=minimal" if upsert else "return=minimal"
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


def fetch_all_holdings():
    all_rows = []
    offset   = 0
    limit    = 1000

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


def fetch_stock_returns_for_symbols(symbols, start_date):
    index           = {}
    today           = date.today().isoformat()
    three_years_ago = (date.today() - relativedelta(years=3)).isoformat()
    from_date       = max(start_date, three_years_ago)

    for symbol in symbols:
        offset = 0
        limit  = 1000

        while True:
            batch = supabase_request(
                "GET",
                f"stock_returns_c?select=symbol,as_of_date,current_price"
                f"&symbol=eq.{symbol}"
                f"&as_of_date=gte.{from_date}"
                f"&as_of_date=lt.{today}"
                f"&order=as_of_date.asc"
                f"&limit={limit}&offset={offset}"
            )
            if not batch:
                break
            for row in batch:
                key = (row["symbol"], row["as_of_date"])
                # stock_returns_c stores Yahoo Finance prices in cents (JSE stocks) — convert to rands
                index[key] = float(row["current_price"]) / 100 if row.get("current_price") else None
            if len(batch) < limit:
                break
            offset += limit

        count = sum(1 for (s, _) in index if s == symbol)
        print(f"    Loaded {symbol}: {count} rows")

    return index


def get_price_n_days_back(symbol, as_of_date_str, n, stock_index):
    as_of    = date.fromisoformat(as_of_date_str)
    count    = 0
    max_back = n + 30

    for i in range(1, max_back + 1):
        candidate = (as_of - timedelta(days=i)).isoformat()
        if (symbol, candidate) in stock_index:
            count += 1
            if count == n:
                return stock_index[(symbol, candidate)], candidate
    return None, None


def get_price_ytd_base(symbol, as_of_date_str, stock_index):
    as_of = date.fromisoformat(as_of_date_str)
    jan1  = date(as_of.year, 1, 1)

    for i in range(1, 30):
        candidate = (jan1 - timedelta(days=i)).isoformat()
        if (symbol, candidate) in stock_index:
            return stock_index[(symbol, candidate)], candidate
    return None, None


def get_period_window_start(period, as_of_date_str, stock_index, symbol):
    if period == "ytd":
        as_of = date.fromisoformat(as_of_date_str)
        jan1  = date(as_of.year, 1, 1)
        for i in range(1, 30):
            candidate = (jan1 - timedelta(days=i)).isoformat()
            if (symbol, candidate) in stock_index:
                return candidate
        return jan1.isoformat()
    else:
        n = PERIOD_LOOKBACK[period]
        _, period_start = get_price_n_days_back(symbol, as_of_date_str, n, stock_index)
        return period_start


def get_period_base(symbol, as_of_date, fill_date, avg_fill, period, stock_index):
    # avg_fill is stored in cents in stock_holdings_c — convert to rands
    avg_fill_f = float(avg_fill) / 100 if avg_fill else None

    if period == "1d":
        if as_of_date == fill_date:
            return avg_fill_f
        price, _ = get_price_n_days_back(symbol, as_of_date, 1, stock_index)
        return price

    elif period == "ytd":
        as_of_d = date.fromisoformat(as_of_date)
        fill_d  = date.fromisoformat(fill_date)
        if fill_d.year == as_of_d.year:
            return avg_fill_f
        price, _ = get_price_ytd_base(symbol, as_of_date, stock_index)
        return price if price is not None else avg_fill_f

    else:
        n = PERIOD_LOOKBACK[period]
        price, period_start = get_price_n_days_back(symbol, as_of_date, n, stock_index)
        if period_start is None:
            return None
        if period_start < fill_date:
            return avg_fill_f
        return price


def fetch_existing_dates(user_id, strategy_id):
    existing = set()
    offset   = 0
    limit    = 1000

    while True:
        batch = supabase_request(
            "GET",
            f"client_strategy_returns_c?select=as_of_date"
            f"&user_id=eq.{user_id}"
            f"&strategy_id=eq.{strategy_id}"
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


def get_active_holdings_for_date(holdings, as_of_date):
    relevant = []
    for h in holdings:
        fill_date = h.get("Fill_date")
        exit_date = h.get("Exit_date")
        if not fill_date:
            continue
        if fill_date > as_of_date:
            continue
        if exit_date and exit_date < as_of_date:
            continue
        relevant.append(h)
    return relevant


def process_client_strategy(user_id, strategy_id, holdings, debug=False):
    symbols = set()
    for h in holdings:
        sym = h.get("securities_c", {}).get("symbol")
        if sym:
            symbols.add(sym)

    if not symbols:
        return

    fill_dates = [h.get("Fill_date") for h in holdings if h.get("Fill_date")]
    if not fill_dates:
        return
    start_date = min(fill_dates)

    print(f"    Loading stock returns for {len(symbols)} symbols from {start_date}...")
    stock_index = fetch_stock_returns_for_symbols(symbols, start_date)

    all_dates = sorted(set(
        dt for (sym, dt) in stock_index.keys()
        if sym in symbols and dt >= start_date
    ))

    if not all_dates:
        print(f"    No trading dates found.")
        return

    existing_dates = fetch_existing_dates(user_id, strategy_id)
    fetched_at     = datetime.now(timezone.utc).isoformat()
    rows_to_insert = []

    # inception_pnl = running sum of 1d_pnl across all days
    inception_pnl = 0.0

    # closed_trades for period realised PnL filtering
    closed_trades = []

    print(f"    Start date: {start_date} | {len(all_dates)} trading days to process")

    for as_of_date in all_dates:
        active_holdings = get_active_holdings_for_date(holdings, as_of_date)
        if not active_holdings:
            continue

        basket_value      = 0.0
        period_pnls       = {p: 0.0 for p in PERIOD_LOOKBACK}
        period_valid      = {p: True for p in PERIOD_LOOKBACK}
        holdings_snapshot = []
        skip_day          = False
        skip_reason       = ""
        day_1d_pnl        = 0.0
        day_realised_pnl  = 0.0

        # inception_cost = cost of current open positions only (changes with rebalances)
        # avg_fill is in cents — divide by 100 to get rands
        inception_cost = sum(
            (float(h.get("avg_fill") or 0) / 100) * float(h.get("quantity") or 0)
            for h in active_holdings
            if h.get("avg_fill")
            and not (h.get("Exit_date") == as_of_date and not h.get("is_active"))
        )

        for h in active_holdings:
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
                skip_day    = True
                skip_reason = f"{sym} missing from stock_returns_c for {as_of_date}"
                break

            if is_exit_day:
                # avg_exit is in cents — divide by 100 to get rands
                eod_price = float(avg_exit) / 100 if avg_exit else None
                if eod_price is None:
                    skip_day    = True
                    skip_reason = f"{sym} null avg_exit on exit day {as_of_date}"
                    break
                if avg_fill:
                    # avg_fill is in cents — divide by 100 to get rands
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

            # Period open PnL — exited positions excluded
            for p in PERIOD_LOOKBACK:
                if not period_valid[p]:
                    continue
                base = get_period_base(sym, as_of_date, fill_date, avg_fill, p, stock_index)
                if base is None:
                    period_valid[p] = False
                    continue
                if not is_exit_day:
                    period_pnls[p] += qty * (eod_price - float(base))

        if debug and skip_day:
            print(f"    [{as_of_date}] SKIP — {skip_reason}")

        if skip_day or basket_value == 0:
            continue

        # 1d_pnl for this day = open position moves + realised from exits today
        day_1d_pnl = period_pnls["1d"] + day_realised_pnl

        # inception_pnl = running sum of every day's 1d_pnl
        inception_pnl += day_1d_pnl

        # inception_pct = inception_pnl / cost of current open positions
        inception_pct = (inception_pnl / inception_cost * 100) if inception_cost != 0 else None

        # Store closed trades for period window filtering
        if day_realised_pnl != 0:
            closed_trades.append({
                "exit_date": as_of_date,
                "pnl"      : day_realised_pnl
            })

        if as_of_date in existing_dates:
            continue

        first_sym = next(
            (h.get("securities_c", {}).get("symbol") for h in active_holdings
             if h.get("securities_c", {}).get("symbol")),
            None
        )

        result = {
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
                result[f"{p}_pnl"] = None
                result[f"{p}_pct"] = None
                continue

            # Add realised PnL from exits within this period's window
            period_realised = 0.0
            if first_sym and closed_trades:
                window_start = get_period_window_start(p, as_of_date, stock_index, first_sym)
                if window_start:
                    for trade in closed_trades:
                        if trade["exit_date"] > window_start and trade["exit_date"] <= as_of_date:
                            period_realised += trade["pnl"]

            pnl        = period_pnls[p] + period_realised
            base_value = basket_value - period_pnls[p]
            pct        = (pnl / base_value * 100) if base_value != 0 else None

            result[f"{p}_pnl"] = pnl
            result[f"{p}_pct"] = pct

        rows_to_insert.append(result)

    if not rows_to_insert:
        print(f"    No new rows to insert.")
        return

    batch_size = 500
    total      = len(rows_to_insert)
    inserted   = 0

    for start in range(0, total, batch_size):
        batch  = rows_to_insert[start:start + batch_size]
        result = supabase_request("POST", "client_strategy_returns_c", batch, upsert=True)
        if result is None:
            print(f"    Batch insert failed at row {start}")
            return
        inserted += len(batch)

    print(f"    Inserted {inserted} rows.")


def main():
    print("\nFetching all client holdings...")
    holdings = fetch_all_holdings()
    if not holdings:
        print("No holdings found.")
        return

    print(f"Found {len(holdings)} holding rows.")

    groups = {}
    for h in holdings:
        user_id     = h.get("user_id")
        strategy_id = h.get("strategy_id")
        if not user_id or not strategy_id:
            continue
        key = (user_id, strategy_id)
        if key not in groups:
            groups[key] = []
        groups[key].append(h)

    print(f"Found {len(groups)} client+strategy combinations.\n")

    for (user_id, strategy_id), group_holdings in groups.items():
        debug = (user_id == DEBUG_USER)
        print(f"  Processing client {user_id[:8]}... strategy {strategy_id[:8]}...")
        process_client_strategy(user_id, strategy_id, group_holdings, debug=debug)

    print("\nClient strategy returns backfill complete.")


if __name__ == "__main__":
    main()