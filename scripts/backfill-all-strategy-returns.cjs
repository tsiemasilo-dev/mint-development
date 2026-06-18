/**
 * Backfill strategies_returns_c for all active strategies.
 *
 * For each strategy, for each missing trading day (Jan 1, 2026 → today):
 *   - Fetches daily closing prices from Yahoo Finance (7-month window)
 *   - YTD : implied Jan 1 price from securities_c.ytd_performance (stable anchor)
 *   - 5d / 1m / 6m : Yahoo Finance closing prices at the respective anchor dates
 *
 * Also patches today's row with the correct 6m_pct from Yahoo Finance history.
 *
 * Run: node scripts/backfill-all-strategy-returns.cjs
 */

const https = require('https');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// ── helpers ────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function httpsGetJSON(url, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MintApp/1.0)',
        'Accept': 'application/json',
        ...extraHeaders,
      },
      timeout: 20000,
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { reject(new Error(`JSON parse for ${url.slice(0, 80)}: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout: ${url.slice(0, 80)}`)); });
  });
}

// Supabase REST helpers
const supa = {
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
  },

  async get(path, rangeHeader = '0-9999') {
    const url = `${SUPABASE_URL}/rest/v1/${path}`;
    const { body } = await httpsGetJSON(url, {
      ...this.headers,
      'Range': rangeHeader,
    });
    return body;
  },

  async post(path, payload) {
    return new Promise((resolve, reject) => {
      const bodyStr = JSON.stringify(payload);
      const u       = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
      const options = {
        hostname: u.hostname,
        path:     u.pathname + u.search,
        method:   'POST',
        headers:  { ...this.headers, 'Content-Length': Buffer.byteLength(bodyStr) },
        timeout:  20000,
      };
      const req = https.request(options, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve({ status: res.statusCode, body: d ? JSON.parse(d) : null }));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('POST timeout')); });
      req.write(bodyStr);
      req.end();
    });
  },

  async patch(path, payload) {
    return new Promise((resolve, reject) => {
      const bodyStr = JSON.stringify(payload);
      const u       = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
      const options = {
        hostname: u.hostname,
        path:     u.pathname + u.search,
        method:   'PATCH',
        headers:  { ...this.headers, 'Content-Length': Buffer.byteLength(bodyStr) },
        timeout:  20000,
      };
      const req = https.request(options, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve({ status: res.statusCode, body: d ? JSON.parse(d) : null }));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('PATCH timeout')); });
      req.write(bodyStr);
      req.end();
    });
  },
};

// ── JSE calendar ──────────────────────────────────────────────────────────

const JSE_HOLIDAYS = new Set([
  '2025-01-01','2025-03-21','2025-04-18','2025-04-21','2025-04-28',
  '2025-05-01','2025-06-16','2025-08-09','2025-09-24','2025-12-16',
  '2025-12-25','2025-12-26',
  '2026-01-01','2026-03-21','2026-04-03','2026-04-06','2026-04-27',
  '2026-05-01','2026-06-16','2026-08-10','2026-09-24','2026-12-16',
  '2026-12-25','2026-12-26',
  '2027-01-01','2027-03-21','2027-03-26','2027-03-29','2027-04-27',
  '2027-05-01','2027-06-16','2027-08-09','2027-09-24','2027-12-16',
  '2027-12-25','2027-12-27',
]);

function isJseTradingDay(dateStr) {
  const dow = new Date(dateStr + 'T12:00:00Z').getUTCDay();
  return dow !== 0 && dow !== 6 && !JSE_HOLIDAYS.has(dateStr);
}

function dateRange(startStr, endStr) {
  const dates = [];
  const cur = new Date(startStr + 'T12:00:00Z');
  const end = new Date(endStr   + 'T12:00:00Z');
  while (cur <= end) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split('T')[0];
}

const toBase = (sym) => sym.split('.')[0].toUpperCase();

// ── Yahoo Finance ──────────────────────────────────────────────────────────
// Returns sorted Map<YYYY-MM-DD, closePrice_in_cents>

async function fetchYahooHistory(symbol, startDate, endDate) {
  const p1  = Math.floor(new Date(startDate + 'T00:00:00Z').getTime() / 1000);
  const p2  = Math.floor(new Date(endDate   + 'T23:59:59Z').getTime() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&period1=${p1}&period2=${p2}`;

  try {
    const { body } = await httpsGetJSON(url);
    const result   = body?.chart?.result?.[0];
    if (!result) return new Map();

    const timestamps = result.timestamp || [];
    const closes     = result.indicators?.quote?.[0]?.close || [];
    const entries    = [];

    for (let i = 0; i < timestamps.length; i++) {
      const c = closes[i];
      if (c == null || isNaN(c) || c <= 0) continue;
      const dateStr = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
      entries.push([dateStr, Math.round(c)]); // Yahoo JSE prices are already in ZAp (cents)
    }
    entries.sort((a, b) => a[0].localeCompare(b[0]));
    return new Map(entries);
  } catch (err) {
    console.warn(`  [yahoo] ${symbol}: ${err.message}`);
    return new Map();
  }
}

/** Latest price on or before targetDate from a sorted Map<date, price> */
function priceBefore(priceMap, targetDate) {
  let best = null;
  for (const [d, p] of priceMap) {
    if (d <= targetDate) best = p;
    else break;
  }
  return best;
}

// ── main ───────────────────────────────────────────────────────────────────

async function main() {
  const today = new Date().toISOString().split('T')[0];
  console.log(`Backfill run — today: ${today}\n`);

  // 1. Active strategies
  const strategies = await supa.get(
    'strategies_c?status=eq.active&select=id,name,holdings'
  );
  if (!Array.isArray(strategies) || !strategies.length) {
    console.error('No active strategies found'); process.exit(1);
  }
  console.log(`${strategies.length} active strategies\n`);

  // 2. Parse holdings, collect all symbols
  const allBaseSymbols    = new Set();
  const strategyHoldingsMap = {};

  for (const s of strategies) {
    const parsed = [];
    for (const h of (s.holdings || [])) {
      const raw  = (h.symbol || h.ticker || '').trim().toUpperCase();
      const base = raw.split('.')[0];
      if (!base) continue;
      allBaseSymbols.add(base);
      parsed.push({ symbol: base, shares: Number(h.shares || h.quantity || 1) });
    }
    strategyHoldingsMap[s.id] = parsed;
  }

  const baseList  = [...allBaseSymbols];
  const joList    = baseList.map(b => `${b}.JO`);
  const allSymStr = [...baseList, ...joList].map(s => `"${s}"`).join(',');

  // 3. Implied Jan 1 prices from securities_c
  const secRows = await supa.get(
    `securities_c?symbol=in.(${[...baseList,...joList].join(',')})&select=symbol,last_price,ytd_performance`
  );
  const jan1PriceMap = {}; // base → cents
  for (const row of (Array.isArray(secRows) ? secRows : [])) {
    const base = toBase(row.symbol);
    if (!jan1PriceMap[base] && row.last_price > 0) {
      const ytdPerf = Number(row.ytd_performance ?? 0);
      if (!isNaN(ytdPerf) && ytdPerf > -99) {
        jan1PriceMap[base] = row.last_price / (1 + ytdPerf / 100);
      }
    }
  }
  console.log('Implied Jan 1 prices (R):');
  for (const [sym, p] of Object.entries(jan1PriceMap)) {
    console.log(`  ${sym}: R${(p / 100).toFixed(2)}`);
  }

  // 4. Fetch Yahoo Finance history — Dec 1, 2025 → today (covers YTD + 6m lookback)
  const histStart = '2025-12-01';
  console.log(`\nFetching Yahoo history (${histStart} → ${today})...`);
  const yahooMap = {}; // base → sorted Map<date, cents>

  for (const sym of joList) {
    const base = toBase(sym);
    process.stdout.write(`  ${sym}... `);
    const priceMap = await fetchYahooHistory(sym, histStart, today);
    yahooMap[base] = priceMap;
    const dates = [...priceMap.keys()];
    console.log(`${priceMap.size} days (${dates[0] || 'none'} → ${dates.at(-1) || 'none'})`);
    await sleep(350);
  }

  // 5. For each strategy: compute missing dates
  let totalInserted = 0, totalSkipped = 0, totalFailed = 0;

  for (const strategy of strategies) {
    const holdings = strategyHoldingsMap[strategy.id];
    if (!holdings?.length) continue;

    console.log(`\n[${strategy.name}]`);

    // Existing dates
    const existingRows = await supa.get(
      `strategies_returns_c?strategy_id=eq.${strategy.id}&select=as_of_date`
    );
    const existingDates = new Set(
      (Array.isArray(existingRows) ? existingRows : []).map(r => r.as_of_date)
    );

    // All trading days from Jan 2, 2026 → today that are missing
    const missing = dateRange('2026-01-02', today)
      .filter(d => isJseTradingDay(d) && !existingDates.has(d));

    if (!missing.length) {
      console.log('  All dates present — nothing to insert');
      continue;
    }
    console.log(`  ${missing.length} missing days: ${missing[0]} → ${missing.at(-1)}`);

    let ins = 0, skip = 0, fail = 0;

    for (const dateStr of missing) {
      // Basket value on this date + Jan 1 basket value
      let todayVal = 0, jan1Val = 0, nYtd = 0;
      for (const { symbol, shares } of holdings) {
        const jan1Price = jan1PriceMap[symbol];
        const histPrice = priceBefore(yahooMap[symbol], dateStr);
        if (!jan1Price || !histPrice) continue;
        todayVal += shares * histPrice;
        jan1Val  += shares * jan1Price;
        nYtd++;
      }

      if (!nYtd || !jan1Val) { skip++; continue; }

      const ytd = ((todayVal / jan1Val) - 1) * 100;

      // Period returns — use Yahoo historical prices for anchor
      const periodReturn = (nominalDays) => {
        const anchorDate = addDays(dateStr, -(nominalDays + 2)); // +2 day buffer for weekends
        let sv = 0, ev = 0, n = 0;
        for (const { symbol, shares } of holdings) {
          const ap = priceBefore(yahooMap[symbol], anchorDate);
          const cp = priceBefore(yahooMap[symbol], dateStr);
          if (!ap || !cp) continue;
          sv += shares * ap;
          ev += shares * cp;
          n++;
        }
        return (n && sv) ? ((ev / sv) - 1) * 100 : null;
      };

      const r5d = periodReturn(5);
      const r1m = periodReturn(30);
      const r6m = periodReturn(180);

      const fmt = (v) => v !== null ? parseFloat(v.toFixed(4)) : null;

      const { status } = await supa.post('strategies_returns_c', {
        strategy_id: strategy.id,
        as_of_date:  dateStr,
        ytd_pct:     fmt(ytd),
        '5d_pct':    fmt(r5d),
        '1m_pct':    fmt(r1m),
        '6m_pct':    fmt(r6m),
      });

      if (status === 201) {
        console.log(
          `  ${dateStr}: YTD=${ytd.toFixed(2)}%` +
          `  5d=${r5d != null ? r5d.toFixed(2)+'%' : 'n/a'}` +
          `  1m=${r1m != null ? r1m.toFixed(2)+'%' : 'n/a'}` +
          `  6m=${r6m != null ? r6m.toFixed(2)+'%' : 'n/a'}`
        );
        ins++;
      } else if (status === 409) {
        skip++;
      } else {
        console.warn(`  ${dateStr}: HTTP ${status}`);
        fail++;
      }
    }

    console.log(`  → inserted=${ins} skipped=${skip} failed=${fail}`);
    totalInserted += ins; totalSkipped += skip; totalFailed += fail;
  }

  // 6. Patch today's 6m_pct on all strategies (the server's compute didn't have Dec data)
  console.log('\n── Patching today\'s 6m_pct (Yahoo Finance 6m anchor) ──');
  const anchorDate6m = addDays(today, -182);

  for (const strategy of strategies) {
    const holdings = strategyHoldingsMap[strategy.id];
    if (!holdings?.length) continue;

    let sv = 0, ev = 0, n = 0;
    for (const { symbol, shares } of holdings) {
      const ap = priceBefore(yahooMap[symbol], anchorDate6m);
      const cp = priceBefore(yahooMap[symbol], today);
      if (!ap || !cp) continue;
      sv += shares * ap;
      ev += shares * cp;
      n++;
    }

    if (!n || !sv) {
      console.log(`  [${strategy.name}]: no 6m anchor data`);
      continue;
    }

    const r6m = ((ev / sv) - 1) * 100;

    const { status } = await supa.patch(
      `strategies_returns_c?strategy_id=eq.${strategy.id}&as_of_date=eq.${today}`,
      { '6m_pct': parseFloat(r6m.toFixed(4)) }
    );

    console.log(`  [${strategy.name}]: 6m=${r6m.toFixed(2)}% (HTTP ${status})`);
  }

  console.log(`\n✅ Done — inserted: ${totalInserted}, skipped: ${totalSkipped}, failed: ${totalFailed}`);
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
