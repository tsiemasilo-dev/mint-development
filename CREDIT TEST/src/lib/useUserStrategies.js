import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { getStrategyPriceHistory } from "./strategyData";
import { registerCacheResetCallback } from "./userCacheReset.js";

// Module-level cache — survives unmount/remount when navigating between tabs,
// so the Portfolio page shows last known strategies instead of an empty skeleton.
let _cachedStrategiesData = null;

export function clearUserStrategiesCache() {
  _cachedStrategiesData = null;
}

registerCacheResetCallback(clearUserStrategiesCache);

export const useUserStrategies = () => {
  const [data, setData] = useState(_cachedStrategiesData || {
    strategies: [],
    selectedStrategy: null,
    loading: true,
    error: null,
  });

  const fetchUserStrategies = useCallback(async () => {
    if (!supabase) {
      setData((prev) => ({ ...prev, loading: false, error: "Database not connected" }));
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setData({ strategies: [], selectedStrategy: null, loading: false, error: null });
        return;
      }

      const userId = session.user.id;

      // Query client_strategy_returns_c and strategies_c directly —
      // avoids /api/user/strategies which joins the deleted strategy_metrics table.
      const [allReturnsResult, strategiesResult] = await Promise.all([
        supabase
          .from("client_strategy_returns_c")
          .select("strategy_id, basket_value, holdings_snapshot, as_of_date, ytd_pct")
          .eq("user_id", userId)
          .order("as_of_date", { ascending: false }),
        supabase
          .from("strategies_c")
          .select("id, name, short_name, description, risk_level, sector, icon_url, image_url, holdings")
          .eq("status", "active"),
      ]);

      if (allReturnsResult.error) {
        console.error("[useUserStrategies] Error fetching returns:", allReturnsResult.error);
        setData((prev) => ({ ...prev, loading: false, error: allReturnsResult.error.message }));
        return;
      }

      const allReturns = allReturnsResult.data || [];

      if (allReturns.length === 0) {
        setData({ strategies: [], selectedStrategy: null, loading: false, error: null });
        return;
      }

      // Build latest-row and oldest-row per strategy (allReturns is desc order)
      const latestByStrategy = {};
      const oldestByStrategy = {};
      for (const row of allReturns) {
        if (!latestByStrategy[row.strategy_id]) {
          latestByStrategy[row.strategy_id] = row;
        }
        oldestByStrategy[row.strategy_id] = row; // last one written wins = oldest
      }

      // Map strategies_c by id for O(1) lookup
      const strategiesMap = {};
      for (const s of (strategiesResult.data || [])) {
        strategiesMap[s.id] = s;
      }

      const formattedStrategies = Object.entries(latestByStrategy).map(([strategyId, returnsRow]) => {
        const stratMeta = strategiesMap[strategyId] || {};
        const oldestRow = oldestByStrategy[strategyId];

        const snapshot = (() => {
          try {
            return typeof returnsRow.holdings_snapshot === "string"
              ? JSON.parse(returnsRow.holdings_snapshot)
              : (returnsRow.holdings_snapshot || []);
          } catch { return []; }
        })();

        const currentVal = Number((returnsRow.basket_value / 100).toFixed(2));
        const invested = snapshot.reduce((sum, h) => sum + (h.avg_fill || 0) * (h.qty || h.quantity || 0) / 100, 0);
        const changePct = invested > 0 ? ((currentVal - invested) / invested) * 100 : 0;
        const ytdPctDecimal = returnsRow.ytd_pct != null ? returnsRow.ytd_pct / 100 : null;

        // Build snapshot lookup by symbol for augmenting base holdings
        const snapshotMap = {};
        snapshot.forEach(h => { snapshotMap[h.symbol] = h; });

        // Use strategies_c.holdings as base (has weight/logo_url); augment with P&L from snapshot
        const baseHoldings = stratMeta.holdings || snapshot.map(h => ({ symbol: h.symbol, name: h.symbol, weight: 0, logo_url: null }));
        const augmentedHoldings = baseHoldings.map(h => {
          const snap = snapshotMap[h.symbol] || snapshotMap[h.ticker];
          if (snap) {
            const qty = snap.qty || snap.quantity || 0;
            const stockCurrentVal = (snap.current_price * qty) / 100;
            const stockCostBasis = (snap.avg_fill * qty) / 100;
            const pnlRands = stockCurrentVal - stockCostBasis;
            const pnlPct = stockCostBasis > 0 ? (pnlRands / stockCostBasis) * 100 : 0;
            return { ...h, pnlRands: Number(pnlRands.toFixed(2)), pnlPct: Number(pnlPct.toFixed(2)) };
          }
          return h;
        });

        return {
          id: strategyId,
          strategyId,
          name: stratMeta.name || "Unknown Strategy",
          shortName: stratMeta.short_name || stratMeta.name || "Strategy",
          description: stratMeta.description || "",
          riskLevel: stratMeta.risk_level || "Moderate",
          sector: stratMeta.sector || "",
          iconUrl: stratMeta.icon_url || null,
          imageUrl: stratMeta.image_url || null,
          holdings: augmentedHoldings,
          investedAmount: Number(invested.toFixed(2)),
          currentValue: currentVal,
          unitsHeld: 0,
          entryDate: null,
          lastUpdated: returnsRow.as_of_date,
          previousMonthChange: parseFloat(changePct.toFixed(1)),
          metrics: null,
          firstInvestedDate: oldestRow?.as_of_date || null,
          ytd_pct: ytdPctDecimal,
          hasReturnsData: true,
        };
      });

      const nextData = {
        strategies: formattedStrategies,
        selectedStrategy: formattedStrategies[0] || null,
        loading: false,
        error: null,
      };
      // Persist so re-mounts (e.g. navigating back) skip the skeleton
      _cachedStrategiesData = nextData;
      setData(nextData);

    } catch (err) {
      console.error("Error fetching strategies:", err);
      setData((prev) => ({
        ...prev,
        loading: false,
        error: err.message,
      }));
    }
  }, []);

  const selectStrategy = useCallback((strategy) => {
    setData((prev) => ({ ...prev, selectedStrategy: strategy }));
  }, []);

  useEffect(() => {
    fetchUserStrategies();

    // Safety timer — release the skeleton after 6 s even if the API is slow/hanging
    const safetyTimer = setTimeout(() => {
      setData((prev) => prev.loading ? { ...prev, loading: false } : prev);
    }, 6000);

    return () => clearTimeout(safetyTimer);
  }, [fetchUserStrategies]);

  return { ...data, selectStrategy, refetch: fetchUserStrategies };
};

export const useStrategyChartData = (strategyId, timeFilter = "W", purchaseDate = null, userId = null) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChartData = async () => {
      if (!strategyId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      let resolvedUserId = userId;
      if (!resolvedUserId && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          resolvedUserId = session?.user?.id || null;
        } catch {}
      }

      if (resolvedUserId && supabase) {
        try {
          const now = new Date();
          let query = supabase
            .from("client_strategy_returns_c")
            .select("as_of_date, basket_value")
            .eq("user_id", resolvedUserId)
            .eq("strategy_id", strategyId)
            .order("as_of_date", { ascending: false });

          if (timeFilter === "D") {
            query = query.limit(2);
          } else if (timeFilter === "5d") {
            query = query.limit(5);
          } else if (timeFilter === "m") {
            const fromDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            query = query.gte("as_of_date", fromDate.toISOString().split("T")[0]);
          } else if (timeFilter === "ytd") {
            query = query.gte("as_of_date", `${now.getFullYear()}-01-01`);
          }

          const { data: rows, error } = await query;

          if (!error && rows && rows.length > 0) {
            const ascending = [...rows].reverse();
            const firstBasket = ascending[0].basket_value || 0;

            const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
            const DAY_NAMES_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

            const formatted = [{ day: null, value: 0, fullDate: null }];
            ascending.forEach(row => {
              const [y, m, d] = row.as_of_date.split("-").map(Number);
              const dow = new Date(y, m - 1, d).getDay();
              const pnl = Number(((row.basket_value - firstBasket) / 100).toFixed(2));
              formatted.push({
                day: `${d} ${MONTH_NAMES[m - 1]} '${String(y).slice(-2)}`,
                value: pnl,
                fullDate: `${DAY_NAMES_SHORT[dow]}, ${d} ${MONTH_NAMES[m - 1]} ${y}`,
              });
            });

            setChartData(formatted);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn("[useStrategyChartData] client_strategy_returns_c error, falling back to price history:", err);
        }
      }

      const timeframeMap = {
        "D": "1D",
        "W": "1W",
        "M": "1M",
        "ALL": "1Y",
        "5d": "1W",
        "m": "1M",
        "ytd": "1Y",
        "all": "1Y",
      };

      const timeframe = timeframeMap[timeFilter] || "1D";

      try {
        const priceHistory = await getStrategyPriceHistory(strategyId, timeframe);

        if (!priceHistory || priceHistory.length === 0) {
          setChartData([]);
          setLoading(false);
          return;
        }

        let filteredHistory = priceHistory;
        if (purchaseDate) {
          const purchaseDateStr = purchaseDate.slice(0, 10);
          const afterPurchase = priceHistory.filter(p => p.ts.split("T")[0] >= purchaseDateStr);
          if (afterPurchase.length >= 1) {
            filteredHistory = afterPurchase;
          } else {
            const beforePurchase = priceHistory.filter(p => p.ts.split("T")[0] < purchaseDateStr);
            if (beforePurchase.length > 0) {
              const lastKnown = beforePurchase[beforePurchase.length - 1];
              filteredHistory = [lastKnown, { ...lastKnown, ts: purchaseDateStr + "T00:00:00Z" }];
            } else {
              filteredHistory = priceHistory.slice(-1);
            }
          }
        }

        setChartData(formatChartData(filteredHistory, timeFilter));

      } catch (err) {
        console.error("Error fetching chart data:", err);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [strategyId, timeFilter, purchaseDate, userId]);

  return { chartData, loading };
};

export const useStrategyPeriodReturns = (userId, strategyId, activeTab = "m") => {
  const [returnData, setReturnData] = useState({ pnl: 0, pct: 0, basketValue: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPeriodReturns = async () => {
      if (!userId || !strategyId || !["D", "5d", "m", "ytd"].includes(activeTab)) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const columnMap = {
          "D": { pnl: "1d_pnl", pct: "1d_pct" },
          "5d": { pnl: "5d_pnl", pct: "5d_pct" },
          "m": { pnl: "1m_pnl", pct: "1m_pct" },
          "ytd": { pnl: "ytd_pnl", pct: "ytd_pct" }
        };

        const columns = columnMap[activeTab];

        const { data, error } = await supabase
          .from("client_strategy_returns_c")
          .select("*")
          .eq("user_id", userId)
          .eq("strategy_id", strategyId)
          .order("as_of_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          const pnlValue = data[columns.pnl] || 0;
          const pctValue = data[columns.pct] || 0;
          const basketValue = (Number(data.basket_value || 0)) / 100;
          setReturnData({
            pnl: (Number(pnlValue)) / 100,
            pct: Number(pctValue),
            basketValue: basketValue
          });
        } else {
          setReturnData({ pnl: 0, pct: 0, basketValue: 0 });
        }
      } catch (err) {
        console.warn("[useStrategyPeriodReturns] Error fetching period returns:", err);
        setReturnData({ pnl: 0, pct: 0, basketValue: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchPeriodReturns();
  }, [userId, strategyId, activeTab]);

  return { returnData, loading };
};

function parseDateParts(ts) {
  const dateStr = ts.split("T")[0];
  const [y, m, d] = dateStr.split("-").map(Number);
  const dayOfWeek = new Date(y, m - 1, d).getDay();
  return { year: y, month: m, day: d, dayOfWeek };
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatChartData(priceHistory, timeFilter) {
  if (!priceHistory || priceHistory.length === 0) return [];

  switch (timeFilter) {
    case "D":
    case "W":
    case "5d": {
      return priceHistory.map((p) => {
        const { day, month, dayOfWeek, year } = parseDateParts(p.ts);
        return {
          day: `${day} ${MONTH_NAMES_SHORT[month - 1]} '${String(year).slice(-2)}`,
          value: p.nav,
          fullDate: `${DAY_NAMES[dayOfWeek]}, ${day} ${MONTH_NAMES_SHORT[month - 1]} ${year}`,
        };
      });
    }
    case "M":
    case "m": {
      return priceHistory.map((p) => {
        const { year, day, month } = parseDateParts(p.ts);
        return {
          day: `${day} ${MONTH_NAMES_SHORT[month - 1]} '${String(year).slice(-2)}`,
          value: p.nav,
          fullDate: `${day} ${MONTH_NAMES_SHORT[month - 1]} ${year}`,
        };
      });
    }
    case "ALL":
    case "ytd":
    case "all": {
      const monthKeys = new Set();
      priceHistory.forEach((p) => {
        const { year, month } = parseDateParts(p.ts);
        monthKeys.add(`${year}-${month}`);
      });
      if (monthKeys.size < 3) {
        return priceHistory.map((p) => {
          const { year, month, day, dayOfWeek } = parseDateParts(p.ts);
          return {
            day: `${day} ${MONTH_NAMES_SHORT[month - 1]}`,
            value: p.nav,
            fullDate: `${DAY_NAMES[dayOfWeek]}, ${day} ${MONTH_NAMES_SHORT[month - 1]} ${year}`,
          };
        });
      }
      const grouped = {};
      priceHistory.forEach((p) => {
        const { year, month } = parseDateParts(p.ts);
        const key = `${MONTH_NAMES_SHORT[month - 1]} '${String(year).slice(-2)}`;
        grouped[key] = p.nav;
      });
      const entries = Object.entries(grouped);
      return entries.map(([day, value]) => ({
        day,
        value,
        fullDate: day,
      }));
    }
    default:
      return priceHistory.map((p) => {
        const { year, month, day, dayOfWeek } = parseDateParts(p.ts);
        return {
          day: `${day} ${MONTH_NAMES_SHORT[month - 1]}`,
          value: p.nav,
          fullDate: `${DAY_NAMES[dayOfWeek]}, ${day} ${MONTH_NAMES_SHORT[month - 1]} ${year}`,
        };
      });
  }
}
