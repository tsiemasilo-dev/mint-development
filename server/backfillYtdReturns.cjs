/**
 * backfillYtdReturns.cjs
 *
 * One-off script: recompute strategies_returns_c.ytd_pct for all rows that
 * were written by the old method (which back-computed Jan-1 price from
 * securities_c.ytd_performance instead of using real historical closes).
 *
 * Formula (new / correct method):
 *   YTD% = (Σ shares_i × price_i_on_date) / (Σ shares_i × price_i_on_dec31) − 1
 *
 * Prices come from Yahoo Finance (SYMBOL.JO, 1d interval).
 * The Dec-31-2025 anchor is the last available close on or before 2025-12-31.
 * A row is skipped (already correct) when |stored − recomputed| < 0.01 pp.
 *
 * Usage:  node server/backfillYtdReturns.cjs
 */

'use strict';

const path  = require('path');
const fs    = require('fs');

// ── Load env ──────────────────────────────────────────────────────────────────
function loadEnv(p) {
  try {
    if (!fs.existsSync(p)) return false;
    fs.readFileSync(p, 'utf8').split('\n').forEach(line => {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (!m) return;
      const key = m[1];
      let val = m[2] || '';
      if ((val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      if (!process.env[key]) process.env[key] = val;
    });
    return true;
  } catch { return false; }
}
const root = path.join(__dirname, '..');
loadEnv(path.join(root, '.env.local')) || loadEnv(path.join(root, '.env'));

const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[backfill] Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws },
});

// ── Constants ─────────────────────────────────────────────────────────────────
const ANCHOR_DATE = '2025-12-31';   // YTD anchor: last close on or before this date
const DELTA_THRESHOLD = 0.01;       // pp — skip rows already within this tolerance
const YAHOO_LOOKBACK_DAYS = 7;      // walk back up to this many calendar days to find a close

// ── Yahoo Finance helpers ─────────────────────────────────────────────────────

/**
 * Fetch daily closes for a JSE symbol between startDate and endDate (inclusive).
 * Returns an object: { 'YYYY-MM-DD': priceInCents, ... }
 */
async function fetchYahooHistory(baseSymbol, startDate, endDate) {
  const ticker = `${baseSymbol}.JO`;
  // Add 2-day buffers so the anchor date window is safely included
  const p1 = Math.floor(new Date(`${startDate}T00:00:00Z`).getTime() / 1000) - 2 * 86400;
  const p2 = Math.floor(new Date(`${endDate}T23:59:59Z`).getTime()   / 1000) + 2 * 86400;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&period1=${p1}&period2=${p2}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(15000),
  });
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) return {};

  const timestamps = result.timestamp || [];
  const closes     = result.indicators?.quote?.[0]?.close || [];

  const map = {};
  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i];
    if (!close || close <= 0) continue;
    const dateStr = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
    map[dateStr] = Math.round(close); // ZAp (cents) — Yahoo already delivers in cents for .JO
  }
  return map;
}

/**
 * Given a priceMap (date→cents) and a target date, return the most recent close
 * on or before targetDate, walking back up to YAHOO_LOOKBACK_DAYS.
 */
function nearestClose(priceMap, targetDate) {
  const dt = new Date(targetDate);
  for (let i = 0; i < YAHOO_LOOKBACK_DAYS; i++) {
    const d = new Date(dt);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().split('T')[0];
    if (priceMap[key] > 0) return priceMap[key];
  }
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('[backfill] Starting YTD recompute…');

  // 1. Fetch all active strategies
  const { data: strategies, error: stratErr } = await db
    .from('strategies_c')
    .select('id, name, holdings')
    .eq('status', 'active');

  if (stratErr || !strategies?.length) {
    console.error('[backfill] Could not fetch strategies:', stratErr?.message);
    process.exit(1);
  }
  console.log(`[backfill] ${strategies.length} active strategies`);

  // 2. Collect all unique base symbols
  const toBase = s => s.split('.')[0].toUpperCase();
  const allSymbols = new Set();
  const holdingsMap = {}; // strategyId → [{ symbol, shares }]

  for (const s of strategies) {
    const parsed = [];
    for (const h of (s.holdings || [])) {
      const base   = toBase((h.symbol || h.ticker || '').trim());
      const shares = Number(h.shares || h.quantity || 1);
      if (!base) continue;
      allSymbols.add(base);
      parsed.push({ symbol: base, shares });
    }
    holdingsMap[s.id] = parsed;
  }

  const symbolList = Array.from(allSymbols);
  console.log(`[backfill] ${symbolList.length} unique symbols: ${symbolList.join(', ')}`);

  // 3. Determine the full date range we need
  //    From ANCHOR_DATE (Dec 28 start gives us Dec 31 close) to today
  const today = new Date().toISOString().split('T')[0];

  // 4. Fetch Yahoo history for every symbol (parallel, but rate-limit to 5 at a time)
  console.log(`[backfill] Fetching Yahoo Finance history (${ANCHOR_DATE} → ${today})…`);
  const priceMaps = {}; // baseSymbol → { date → cents }

  const CONCURRENCY = 5;
  for (let i = 0; i < symbolList.length; i += CONCURRENCY) {
    const batch = symbolList.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (base) => {
      try {
        priceMaps[base] = await fetchYahooHistory(base, ANCHOR_DATE, today);
        const dates = Object.keys(priceMaps[base]).length;
        console.log(`  ${base}: ${dates} closes fetched`);
      } catch (e) {
        console.warn(`  ${base}: fetch failed — ${e.message}`);
        priceMaps[base] = {};
      }
    }));
  }

  // 5. Compute the Dec-31-2025 anchor price for every symbol
  const anchorPrices = {}; // baseSymbol → cents
  for (const base of symbolList) {
    const price = nearestClose(priceMaps[base], ANCHOR_DATE);
    if (price) anchorPrices[base] = price;
    else console.warn(`  [backfill] No anchor price for ${base} — will skip in basket calcs`);
  }

  // 6. Fetch 2026 rows only — pre-2026 rows used a different methodology
  //    and are not part of this backfill (the analysis covers Jan 2 → Jun 2 2026).
  const { data: allRows, error: rowsErr } = await db
    .from('strategies_returns_c')
    .select('id, strategy_id, as_of_date, ytd_pct')
    .gte('as_of_date', '2026-01-01')
    .order('as_of_date', { ascending: true });

  if (rowsErr) {
    console.error('[backfill] Could not fetch strategies_returns_c:', rowsErr.message);
    process.exit(1);
  }
  console.log(`\n[backfill] ${allRows.length} total rows in strategies_returns_c`);

  // 7. For each row, recompute YTD and update if delta >= threshold
  let checked = 0, updated = 0, skipped = 0, noData = 0, failed = 0;

  // Build strategy name map for readable logs
  const nameMap = {};
  for (const s of strategies) nameMap[s.id] = s.name;

  for (const row of allRows) {
    const holdings = holdingsMap[row.strategy_id];
    if (!holdings?.length) { skipped++; continue; }

    const dateStr = row.as_of_date; // 'YYYY-MM-DD'

    // Compute basket value on this date and on Dec 31 2025
    let dateVal   = 0;
    let anchorVal = 0;
    let matched   = 0;

    for (const { symbol, shares } of holdings) {
      const ap = anchorPrices[symbol];
      const dp = nearestClose(priceMaps[symbol], dateStr);
      if (!ap || !dp) continue;
      anchorVal += shares * ap;
      dateVal   += shares * dp;
      matched++;
    }

    if (!anchorVal || !matched) { noData++; continue; }

    const recomputed = ((dateVal / anchorVal) - 1) * 100;
    const stored     = Number(row.ytd_pct ?? 0);
    const delta      = Math.abs(recomputed - stored);

    checked++;

    if (delta < DELTA_THRESHOLD) { skipped++; continue; }

    // Update the row
    const newYtd = parseFloat(recomputed.toFixed(4));
    const { error: updateErr } = await db
      .from('strategies_returns_c')
      .update({ ytd_pct: newYtd })
      .eq('id', row.id);

    if (updateErr) {
      console.error(`  [backfill] Update failed for ${nameMap[row.strategy_id]} ${dateStr}: ${updateErr.message}`);
      failed++;
    } else {
      console.log(
        `  ✓ ${(nameMap[row.strategy_id] || row.strategy_id).padEnd(28)} ${dateStr}` +
        `  stored: ${stored.toFixed(2).padStart(7)}%  →  new: ${newYtd.toFixed(2).padStart(7)}%` +
        `  (Δ ${(recomputed - stored > 0 ? '+' : '') + (recomputed - stored).toFixed(2)}%)`
      );
      updated++;
    }
  }

  console.log('\n──────────────────────────────────────────────────');
  console.log(`[backfill] Done.`);
  console.log(`  Total rows checked : ${checked}`);
  console.log(`  Updated (corrected): ${updated}`);
  console.log(`  Skipped (correct)  : ${skipped}`);
  console.log(`  Skipped (no data)  : ${noData}`);
  console.log(`  Failed             : ${failed}`);
  console.log('──────────────────────────────────────────────────');
}

main().catch(e => {
  console.error('[backfill] Fatal:', e.message);
  process.exit(1);
});
