import { supabase, supabaseAdmin, authenticateUser } from "../_lib/supabase.js";

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

    // 1. Fetch user holdings with strategy_id (primary signal for which strategies user owns)
    const { data: userHoldings, error: holdingsError } = await db
      .from("stock_holdings_c")
      .select("id, family_member_id, security_id, strategy_id, quantity, avg_fill")
      .eq("user_id", userId)
      .is("family_member_id", null)
      .not("strategy_id", "is", null);

    if (holdingsError) {
      console.error("[user/strategies] Error fetching user holdings:", holdingsError);
    }

    // 2. Also check transactions for strategy names (fallback / first-invested-date tracking)
    const { data: transactions } = await db
      .from("transactions")
      .select("id, name, amount, direction, transaction_date, family_member_id")
      .eq("user_id", userId)
      .is("family_member_id", null)
      .eq("direction", "debit");

    const strategyFirstDate = {};
    const strategyTxNames = new Set();
    for (const tx of (transactions || [])) {
      const txName = (tx.name || "").trim();
      let strategyName = null;
      if (txName.startsWith("Strategy Investment: ")) {
        strategyName = txName.replace("Strategy Investment: ", "").trim();
      } else if (txName.startsWith("Purchased ")) {
        strategyName = txName.replace("Purchased ", "").trim();
      }
      if (strategyName) {
        strategyTxNames.add(strategyName);
        if (tx.transaction_date) {
          if (!strategyFirstDate[strategyName] || tx.transaction_date < strategyFirstDate[strategyName]) {
            strategyFirstDate[strategyName] = tx.transaction_date;
          }
        }
      }
    }
    const strategyNames = Array.from(strategyTxNames);

    const holdingsByStratId = {};
    const holdingStrategyIds = [];
    for (const h of (userHoldings || [])) {
      if (!holdingsByStratId[h.strategy_id]) {
        holdingsByStratId[h.strategy_id] = [];
        holdingStrategyIds.push(h.strategy_id);
      }
      holdingsByStratId[h.strategy_id].push(h);
    }

    // If no holdings and no transaction names, return empty
    if (holdingStrategyIds.length === 0 && strategyNames.length === 0) {
      return res.status(200).json({ success: true, strategies: [] });
    }

    // 3. Build live price map from user's holdings securities
    const allSecurityIds = (userHoldings || []).map(h => h.security_id).filter(Boolean);
    let livePriceMap = {};
    const symbolPnlMap = {};

    if (allSecurityIds.length > 0) {
      const { data: secs } = await db
        .from("securities_c")
        .select("id, symbol, last_price")
        .in("id", allSecurityIds);

      (secs || []).forEach(s => {
        livePriceMap[s.id] = Number(s.last_price || 0);
      });

      for (const h of (userHoldings || [])) {
        const sec = (secs || []).find(s => s.id === h.security_id);
        if (!sec) continue;
        const qty = Number(h.quantity || 0);
        const avgFill = Number(h.avg_fill || 0);
        if (!avgFill) continue;
        const livePrice = Number(sec.last_price || 0);
        symbolPnlMap[sec.symbol] = {
          pnlRands: (livePrice - (avgFill / 100)) * qty,
          pnlPct: avgFill > 0 ? ((livePrice - (avgFill / 100)) / (avgFill / 100)) * 100 : 0,
          currentValue: livePrice * qty,
          costBasis: (avgFill * qty) / 100,
        };
      }
    }

    // 4. Fetch all active strategies from strategies_c (no strategy_metrics join — table is gone)
    const { data: allStrategies, error: stratErr } = await db
      .from("strategies_c")
      .select("id, name, short_name, description, risk_level, sector, icon_url, image_url, holdings, status, is_kid_strategy")
      .eq("status", "active");

    if (stratErr) {
      console.error("[user/strategies] Error fetching strategies:", stratErr);
      return res.status(500).json({ success: false, error: stratErr.message });
    }

    // 5. Fetch returns from strategies_returns_c (replacement for strategy_metrics)
    const strategyIds = (allStrategies || []).map(s => s.id);
    let returnsMap = {};
    if (strategyIds.length > 0) {
      const { data: returnsRows } = await db
        .from("strategies_returns_c")
        .select("strategy_id, as_of_date, ytd_pct, 5d_pct, 1m_pct, 6m_pct")
        .in("strategy_id", strategyIds)
        .order("as_of_date", { ascending: false });

      for (const row of (returnsRows || [])) {
        if (!returnsMap[row.strategy_id]) {
          returnsMap[row.strategy_id] = {
            r_ytd: row.ytd_pct ?? null,
            r_ytd_pct: row.ytd_pct ?? null,
            r_5d: row["5d_pct"] ?? null,
            r_1m: row["1m_pct"] ?? null,
            r_6m: row["6m_pct"] ?? null,
            as_of_date: row.as_of_date ?? null,
          };
        }
      }
    }

    // 6. Get logo/name data for strategy holdings
    const allHoldingSymbols = new Set();
    for (const strategy of (allStrategies || [])) {
      const h = strategy.holdings || [];
      if (Array.isArray(h)) h.forEach(item => { if (item.symbol) allHoldingSymbols.add(item.symbol); });
    }

    let securitiesMap = {};
    if (allHoldingSymbols.size > 0) {
      const { data: secs } = await db
        .from("securities_c")
        .select("symbol, logo_url, name, last_price")
        .in("symbol", Array.from(allHoldingSymbols));
      if (secs) secs.forEach(s => { securitiesMap[s.symbol] = s; });
    }

    // 7. Match and build response
    const matchedStrategies = [];
    for (const strategy of (allStrategies || [])) {
      const matchedByHoldings = holdingStrategyIds.includes(strategy.id);
      const matchedByTxName = strategyNames.find(sn =>
        sn.toLowerCase() === (strategy.name || "").toLowerCase() ||
        sn.toLowerCase() === (strategy.short_name || "").toLowerCase()
      );

      if (!matchedByHoldings && !matchedByTxName) continue;

      const latestMetric = returnsMap[strategy.id] || null;

      const enrichedHoldings = (strategy.holdings || []).map(h => {
        const pnlData = symbolPnlMap[h.symbol] || null;
        return {
          ...h,
          logo_url: h.logo_url || securitiesMap[h.symbol]?.logo_url || null,
          name: h.name || securitiesMap[h.symbol]?.name || h.symbol,
          pnlRands: pnlData ? pnlData.pnlRands : null,
          pnlPct: pnlData ? pnlData.pnlPct : null,
          currentValue: pnlData ? pnlData.currentValue : null,
          costBasis: pnlData ? pnlData.costBasis : null,
        };
      });

      const stratHoldings = holdingsByStratId[strategy.id] || [];
      let investedAmount = 0;
      let currentMarketValue = 0;
      const allPending = stratHoldings.length > 0 && stratHoldings.every(h => !h.avg_fill);

      if (stratHoldings.length === 0 || allPending) {
        // Fall back to transactions for invested amount when no filled holdings
        for (const tx of (transactions || [])) {
          const txName = (tx.name || "").trim();
          let txStratName = null;
          if (txName.startsWith("Strategy Investment: ")) txStratName = txName.replace("Strategy Investment: ", "").trim();
          else if (txName.startsWith("Purchased ")) txStratName = txName.replace("Purchased ", "").trim();
          if (txStratName && (
            txStratName.toLowerCase() === (strategy.name || "").toLowerCase() ||
            txStratName.toLowerCase() === (strategy.short_name || "").toLowerCase()
          )) {
            investedAmount += Number(tx.amount || 0) / 100;
          }
        }
        currentMarketValue = investedAmount;
      } else {
        for (const h of stratHoldings) {
          const qty = Number(h.quantity || 0);
          const avgFill = Number(h.avg_fill || 0);
          if (!avgFill) continue;
          const livePrice = livePriceMap[h.security_id] || (avgFill / 100);
          investedAmount += (avgFill * qty) / 100;
          currentMarketValue += livePrice * qty;
        }
      }

      matchedStrategies.push({
        id: strategy.id,
        name: strategy.name,
        shortName: strategy.short_name || strategy.name,
        description: strategy.description || "",
        riskLevel: strategy.risk_level || "Moderate",
        sector: strategy.sector || "",
        iconUrl: strategy.icon_url,
        imageUrl: strategy.image_url,
        isKidStrategy: !!strategy.is_kid_strategy,
        holdings: enrichedHoldings,
        investedAmount,
        currentMarketValue,
        currentValue: currentMarketValue,
        metrics: latestMetric,
        firstInvestedDate: matchedByTxName ? (strategyFirstDate[matchedByTxName] || null) : null,
      });
    }

    return res.status(200).json({ success: true, strategies: matchedStrategies });
  } catch (error) {
    console.error("[user/strategies] Error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to fetch user strategies" });
  }
}
