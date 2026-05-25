import { supabase, supabaseAdmin, authenticateUser } from "../_lib/supabase.js";

// Latest stock_intraday_c row per security_id — live price + 1d change.
// Replaces the stale securities_c.last_price / stock_returns_c EOD path so
// PnL reflects current market state (intraday is updated every ~1 min).
async function fetchLatestIntradayData(db, securityIds) {
  if (!securityIds || !securityIds.length) return {};
  const ids = [...new Set(securityIds.filter(Boolean))];
  const out = {};
  await Promise.all(ids.map(async (id) => {
    const { data } = await db
      .from("stock_intraday_c")
      .select("current_price, day_pct:1d_pct, day_abs:1d_abs")
      .eq("security_id", id)
      .order("timestamp", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      out[id] = {
        priceRands: data.current_price != null ? Number(data.current_price) : null,
        dayPct: data.day_pct != null ? Number(data.day_pct) : null,
        dayAbsRands: data.day_abs != null ? Number(data.day_abs) : null,
      };
    }
  }));
  return out;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    if (!supabase) {
      return res.status(500).json({ success: false, error: "Database not connected" });
    }

    const { user, error: authError } = await authenticateUser(req);
    if (authError || !user) {
      return res.status(401).json({ success: false, error: authError || "Unauthorized" });
    }

    const db = supabaseAdmin || supabase;
    const userId = user.id;

    // SELECT now includes Expected_fill — the price the client saw at click time.
    // Stays alongside avg_fill (broker fill price). Client PnL anchors to
    // Expected_fill so the company spread doesn't leak into client gains/losses.
    const holdingsSelect = "id, user_id, family_member_id, security_id, strategy_id, quantity, avg_fill, Expected_fill, market_value, unrealized_pnl, as_of_date, created_at, updated_at, Status, transaction_id";
    const holdingsSelectWithSettlement = `${holdingsSelect}, settlement_status`;

    let holdings, holdingsError;
    const holdingsResult = await db
      .from("stock_holdings_c")
      .select(holdingsSelectWithSettlement)
      .eq("user_id", userId)
      .is("family_member_id", null)
      .eq("Status", "active");

    if (holdingsResult.error && holdingsResult.error.message && holdingsResult.error.message.includes("settlement_status")) {
      const fallback = await db
        .from("stock_holdings_c")
        .select(holdingsSelect)
        .eq("user_id", userId)
        .is("family_member_id", null)
        .eq("Status", "active");
      holdings = fallback.data;
      holdingsError = fallback.error;
    } else {
      holdings = holdingsResult.data;
      holdingsError = holdingsResult.error;
    }

    if (holdingsError) {
      console.error("Error fetching holdings:", holdingsError);
      return res.status(500).json({ success: false, error: holdingsError.message });
    }

    const rawHoldings = holdings || [];
    const securityIds = rawHoldings.map(h => h.security_id).filter(Boolean);
    let securitiesMap = {};
    let intradayMap = {};

    if (securityIds.length > 0) {
      const [secResult, intradayData] = await Promise.all([
        db.from("securities_c")
          .select("id, symbol, name, logo_url, last_price, change_price, change_percent, sector, exchange")
          .in("id", securityIds),
        fetchLatestIntradayData(db, securityIds),
      ]);

      if (secResult.data) {
        secResult.data.forEach(s => { securitiesMap[s.id] = s; });
      }
      intradayMap = intradayData;
    }

    const enrichedHoldings = rawHoldings
      .filter(h => securitiesMap[h.security_id])
      .map(h => {
        const sec = securitiesMap[h.security_id];
        const intraday = intradayMap[h.security_id] || {};

        // Live price priority: stock_intraday_c (most recent) > securities_c.last_price (stale fallback)
        const livePriceRands = intraday.priceRands != null
          ? intraday.priceRands
          : Number(sec?.last_price || 0);

        // Daily change: intraday columns first, then securities_c fallback.
        const dailyChangePctNum = intraday.dayPct != null
          ? intraday.dayPct
          : (sec?.change_percent != null ? Number(sec.change_percent) : 0);
        const dailyChangeAbsRands = intraday.dayAbsRands != null
          ? intraday.dayAbsRands
          : (sec?.change_price != null ? Number(sec.change_price) : 0);

        const livePriceCents = Math.round(livePriceRands * 100);
        const dailyChangeCents = Math.round(dailyChangeAbsRands * 100);
        const quantity = Number(h.quantity || 0);
        const avgFillCents = Number(h.avg_fill || 0);
        const expectedFillRands = Number(h.Expected_fill || 0);
        const isPending = !avgFillCents || avgFillCents === 0;

        if (isPending) {
          return {
            ...h,
            market_value: 0,
            unrealized_pnl: 0,
            settlement_status: "pending",
            symbol: sec?.symbol || "N/A",
            name: sec?.name || "Unknown",
            asset_class: sec?.sector || "Other",
            logo_url: sec?.logo_url || null,
            last_price: 0,
            change_price: 0,
            change_percent: 0,
            exchange: sec?.exchange || null,
          };
        }

        // Cost basis priority: Expected_fill (rands, what the client saw) >
        // avg_fill/100 (legacy rows that pre-date Expected_fill).
        const costBasisRandsPerShare = expectedFillRands > 0
          ? expectedFillRands
          : (avgFillCents / 100);

        const costBasisCents = Math.round(costBasisRandsPerShare * quantity * 100);
        const liveMarketValueCents = Math.round(livePriceRands * quantity * 100);
        const pnlCents = liveMarketValueCents - costBasisCents;

        return {
          ...h,
          market_value: liveMarketValueCents,
          unrealized_pnl: pnlCents,
          symbol: sec?.symbol || "N/A",
          name: sec?.name || "Unknown",
          asset_class: sec?.sector || "Other",
          logo_url: sec?.logo_url || null,
          last_price: livePriceCents,
          change_price: dailyChangeCents,
          change_percent: Number(dailyChangePctNum.toFixed(2)),
          exchange: sec?.exchange || null,
        };
      });

    return res.status(200).json({ success: true, holdings: enrichedHoldings });
  } catch (error) {
    console.error("User holdings error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to fetch holdings" });
  }
}
