import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Area,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { supabase } from "../lib/supabase";
import { getStrategyPriceHistory, getClientStrategyReturns } from "../lib/strategyData";
import { logDebug, CAT } from "../lib/debugLog.js";
import { getCachedSession } from "../lib/sessionCache.js";
import { useRealtimePrices } from "../lib/useRealtimePrices";
import Skeleton from "./Skeleton";
import SettlementBadge from "./PendingBadge";
import {
  useSettlementConfig,
  getSettlementStatusForHolding,
} from "../lib/useSettlementStatus";

const VISIBILITY_STORAGE_KEY = "mintBalanceVisible";

// Module-level data cache — survives unmount/remount when the user switches
// homeTab values (balance ↔ invest ↔ wallet), preventing the R0 flash that
// occurs because each new instance starts with totalMarketValue: 0.
// Keyed by `userId:familyMemberId` so child-mode data stays separate.
const _cardDataCache = {};

// ── localStorage persistence helpers ──────────────────────────────────────────
// Persisting the last-known card data across page refreshes lets returning users
// see their correct balance instantly (no skeleton) while fresh data loads silently.
const LS_PREFIX = "mintcard:";
const LS_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function _lsLoad(cacheKey) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + cacheKey);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > LS_TTL_MS) { localStorage.removeItem(LS_PREFIX + cacheKey); return null; }
    return data?.totalMarketValue != null ? data : null;
  } catch { return null; }
}

function _lsSave(cacheKey, data) {
  try { localStorage.setItem(LS_PREFIX + cacheKey, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

// Wraps a Supabase query promise with a timeout so hung queries fail fast
function withTimeout(promise, ms = 4000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Query timed out after ${ms}ms`)), ms)
    ),
  ]);
}

const truncateDecimal = (num, decimals) => {
  const factor = Math.pow(10, decimals);
  return Math.floor(num * factor) / factor;
};

const formatFull = (value) => {
  const num = Number(value);
  const truncated = truncateDecimal(num, 2);
  return `R${truncated.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatKMB = (value) => {
  const num = Number(value);
  const sign = num < 0 ? "-" : "";
  const absNum = Math.abs(num);
  let formatted = absNum;
  if (absNum >= 1e9) formatted = (truncateDecimal(absNum / 1e9, 1)).toString() + "b";
  else if (absNum >= 1e6) formatted = (truncateDecimal(absNum / 1e6, 1)).toString() + "m";
  else if (absNum >= 1e3) formatted = (truncateDecimal(absNum / 1e3, 1)).toString() + "k";
  else formatted = truncateDecimal(absNum, 2).toString();
  return `${sign}R${formatted}`;
};

const formatPrecise = (value) => {
  const num = Number(value);
  const truncated = truncateDecimal(num, 2);
  return `R${truncated.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const TIMEFRAME_DAYS = { d: 7, "5d": 5, m: 30, ytd: 365, all: 1825 };

async function getSessionWithRetry() {
  const session = await getCachedSession();
  if (session?.access_token) return session;
  // Fallback: attempt a direct refresh (only if cache returned null)
  try {
    const { data } = await supabase.auth.refreshSession();
    if (data?.session?.access_token) return data.session;
  } catch {}
  return null;
}

async function fetchJsonWithAuth(url, token) {
  let activeToken = token;
  let res = await fetch(url, {
    headers: { Authorization: `Bearer ${activeToken}` },
  });

  if (res.status === 401) {
    const session = await getSessionWithRetry();
    activeToken = session?.access_token;
    if (activeToken) {
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
    }
  }

  return res.ok ? res.json() : null;
}

const SwipeableBalanceCard = ({
  userId,
  familyMemberId,        // For child dashboard — fetch child-specific holdings instead of parent
  isBackFacing = true,
  forceVisible,
  mintNumber: mintNumberProp,
  overrideBalance,       // Rands — replaces the big portfolio number
  overrideWalletBalance, // Rands — replaces the CASH footer value
  managedByLabel,        // For child cards: "Managed by parent · Age X · Independent at Y"
}) => {
  const childMode = !!familyMemberId;
  const _cacheKey = `${userId || ''}:${familyMemberId || ''}`;
  const [activeTab, setActiveTab] = useState("m");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { lastUpdated, isConnected } = useRealtimePrices();
  const settlementCfg = useSettlementConfig();
  const holdingSettlementStatus = getSettlementStatusForHolding(settlementCfg);
  const [showUpdatedText, setShowUpdatedText] = useState(false);
  const updatedTimerRef = useRef(null);

  // ── FIX 1: Wallet balance state ──────────────────────────────────────────
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletLoading, setWalletLoading] = useState(true);

  const effectiveWalletBalance = overrideWalletBalance !== undefined ? overrideWalletBalance : walletBalance;
  const effectiveWalletLoading = overrideWalletBalance !== undefined ? false : walletLoading;

  useEffect(() => {
    if (overrideWalletBalance !== undefined) return;
    if (!userId) return;
    const fetchWallet = async () => {
      setWalletLoading(true);
      try {
        const { data, error } = await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", userId)
          .maybeSingle();
        if (!error && data?.balance !== undefined) {
          // Balance is stored in Rands (not cents)
          const bal = Number(data.balance);
          setWalletBalance(bal);
        } else if (error) {
          console.error("❌ [SwipeableBalanceCard] Wallet fetch error:", error);
        }
      } catch (err) {
        console.error("❌ [SwipeableBalanceCard] Wallet fetch crash:", err);
      } finally {
        setWalletLoading(false);
      }
    };
    fetchWallet();

    window.addEventListener("profile-updated", fetchWallet);
    window.addEventListener("wallet-updated", fetchWallet);
    return () => {
      window.removeEventListener("profile-updated", fetchWallet);
      window.removeEventListener("wallet-updated", fetchWallet);
    };
  }, [userId]);

  // ── FIX 2: Mint number — fetch from DB if prop not provided ──────────────
  const [mintNumber, setMintNumber] = useState(mintNumberProp || null);

  useEffect(() => {
    if (mintNumberProp) {
      setMintNumber(mintNumberProp);
      return;
    }
    if (!userId) return;
    const fetchMintNumber = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("mint_number")
          .eq("id", userId)
          .maybeSingle();
        if (!error && data?.mint_number) {
          setMintNumber(data.mint_number);
        }
      } catch (e) {}
    };
    fetchMintNumber();
  }, [userId, mintNumberProp]);

  useEffect(() => {
    if (lastUpdated) {
      setShowUpdatedText(true);
      if (updatedTimerRef.current) clearTimeout(updatedTimerRef.current);
      updatedTimerRef.current = setTimeout(
        () => setShowUpdatedText(false),
        3000,
      );
    }
    return () => {
      if (updatedTimerRef.current) clearTimeout(updatedTimerRef.current);
    };
  }, [lastUpdated]);


  useEffect(() => {
    if (!isBackFacing) setIsOpen(false);
  }, [isBackFacing]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const [selectedAsset, setSelectedAsset] = useState(null);

  // ── Warm cache from localStorage on first mount ──────────────────────────
  // This runs synchronously inside useState initialisers so the very first
  // render already has the last-known data — no skeleton for returning users.
  const _warmCache = (() => {
    if (_cardDataCache[_cacheKey]) return _cardDataCache[_cacheKey];
    const stored = _lsLoad(_cacheKey);
    if (stored) { _cardDataCache[_cacheKey] = stored; return stored; }
    return null;
  })();

  const [loading, setLoading] = useState(() => !_warmCache);
  const [dataSettled, setDataSettled] = useState(() => !!_warmCache?.totalMarketValue);
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [returnData5d, setReturnData5d] = useState({ pnl: 0, pct: 0 });
  const [latestBasketValue, setLatestBasketValue] = useState(0);
  const [defaultPortfolioBasketValue, setDefaultPortfolioBasketValue] = useState(0);
  const holdingsScrollRef = useRef(null);

  const scrollToHoldingIndex = (index) => {
    const container = holdingsScrollRef.current;
    if (!container) return;
    const item = container.querySelector(`[data-holding-index="${index}"]`);
    if (item) {
      const containerRect = container.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();
      const scrollLeft =
        container.scrollLeft +
        (itemRect.left - containerRect.left) -
        containerRect.width / 2 +
        itemRect.width / 2;
      container.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }
  };

  const [dbData, setDbData] = useState(() => _warmCache || {
    holdings: [],
    totalMarketValue: 0,
    totalInvested: 0,
    totalInvestedAmount: 0,
    holdingsCount: 0,
  });

  const [isVisible, setIsVisible] = useState(() => {
    try { return localStorage.getItem(VISIBILITY_STORAGE_KEY) !== "false"; } catch { return true; }
  });

  const toggleVisibility = () => {
    setIsVisible(v => {
      try { localStorage.setItem(VISIBILITY_STORAGE_KEY, String(!v)); } catch {}
      return !v;
    });
  };

  const loadDataRef = React.useRef(null);
  const lastCardLoadRef = React.useRef(0);
  const CARD_REFRESH_COOLDOWN = 30000;

  useEffect(() => {
    let cancelled = false;

    // Phase-1 safety (5 s): release the `loading` flag so any loading spinners
    // stop — but do NOT touch `dataSettled` here.  Skeleton must stay until
    // real data actually arrives to prevent the R0 flash.
    const safetyTimer = setTimeout(() => {
      if (!cancelled) {
        logDebug(CAT.LOADING, "⏱ Safety timer fired — SwipeableBalanceCard loading flag cleared after 5 s");
        setLoading(false);
      }
    }, 5000);

    // Phase-2 absolute abort (15 s): if the network truly stalled and no data
    // arrived at all, exit the skeleton with whatever we have (R0 / empty).
    // This prevents an infinite skeleton on complete network failure.
    const abortTimer = setTimeout(() => {
      if (!cancelled) {
        logDebug(CAT.LOADING, "⏱ Abort timer fired — forcing skeleton exit after 15 s");
        setDataSettled(true);
        setLoading(false);
      }
    }, 15000);

    const loadData = async ({ silent = false } = {}) => {
      if (!userId && !familyMemberId) return;
      if (!silent) {
        logDebug(CAT.LOADING, "🃏 SwipeableBalanceCard loadData — loading → TRUE");
        setLoading(true);
      }

      try {
        let enrichedHoldings = [];
        let strategiesRes = { strategies: [] };
        let holdingsRes = { holdings: [] };

        // Child mode: fetch from stock_holdings_c directly
        if (familyMemberId) {
          const { data: childHoldings, error } = await supabase
            .from("stock_holdings_c")
            .select("id, security_id, quantity, avg_fill, market_value, unrealized_pnl, strategy_id, Fill_date, securities(symbol, name, logo_url, last_price)")
            .eq("family_member_id", familyMemberId);

          if (!error && childHoldings) {
            enrichedHoldings = childHoldings.map((h) => {
              const quantity = Number(h.quantity || 0);
              const avgFillCents = Number(h.avg_fill || 0);
              const isFilled = avgFillCents > 0 && !!h.Fill_date;
              const livePriceCents = Number(h.securities?.last_price || 0) > 0
                ? Math.round(Number(h.securities.last_price) * 100)
                : 0;
              const marketValueCents = isFilled
                ? (livePriceCents > 0 && quantity > 0
                  ? Math.round(livePriceCents * quantity)
                  : Math.round(Number(h.market_value || 0)))
                : 0;
              const investedCents = isFilled ? Math.round(avgFillCents * quantity) : 0;
              return {
                id: h.id,
                symbol: h.securities?.symbol || `SEC-${String(h.security_id || "").slice(0, 6)}`,
                name: h.securities?.name || "Security",
                market_value: marketValueCents,
                invested_amount: investedCents,
                avg_fill: isFilled ? avgFillCents : 0,
                quantity,
                logo_url: h.securities?.logo_url || null,
                security_id: h.security_id,
                strategy_id: h.strategy_id,
                isStrategy: false,
              };
            });
          }
        } else {
          // Parent mode: pull strategy values directly from client_strategy_returns_c
          // (avoids dependency on /api/user/strategies which joins the deleted strategy_metrics table)
          //
          // ── PARALLELISE everything ───────────────────────────────────────────
          // The Supabase JS client manages its own auth — it does NOT need us to
          // resolve the session before firing queries.  Start all three fetches
          // simultaneously:
          //   • getSessionWithRetry()          – needed only for the Express API
          //   • client_strategy_returns_c      – Supabase direct (no token needed)
          //   • strategies_c                   – Supabase direct (no token needed)
          // Then, the moment the session resolves, fire /api/user/holdings in
          // parallel with the still-in-flight Supabase queries.
          const returnsPromise = supabase
            .from("client_strategy_returns_c")
            .select("strategy_id, basket_value, holdings_snapshot, as_of_date")
            .eq("user_id", userId)
            .order("as_of_date", { ascending: false });

          const strategiesPromise = supabase
            .from("strategies_c")
            .select("id, name, short_name, holdings, status")
            .eq("status", "active");

          // Session resolves in parallel with the Supabase queries above
          const session = await getSessionWithRetry();
          if (cancelled) return;
          const token = session?.access_token;

          // Holdings API (needs token) + Supabase queries all land in parallel
          const [holdingsJson, returnsResult, strategiesResult] = await Promise.all([
            token
              ? fetchJsonWithAuth("/api/user/holdings", token).then((json) => json || { holdings: [] })
              : Promise.resolve({ holdings: [] }),
            returnsPromise,
            strategiesPromise,
          ]);
          holdingsRes = holdingsJson;
          const stockHoldings = (holdingsRes.holdings || []).filter(h => !h.strategy_id);

          // Take the most-recent row per strategy_id
          const latestByStrategy = {};
          for (const row of (returnsResult.data || [])) {
            if (!latestByStrategy[row.strategy_id]) {
              latestByStrategy[row.strategy_id] = row;
            }
          }

          const strategiesMap = {};
          for (const s of (strategiesResult.data || [])) {
            strategiesMap[s.id] = s;
          }

          const strategyItems = Object.entries(latestByStrategy).map(([stratId, row]) => {
            const strat = strategiesMap[stratId] || {};
            const basketCents = Number(row.basket_value || 0);

            const snapshot = (() => {
              try {
                return typeof row.holdings_snapshot === "string"
                  ? JSON.parse(row.holdings_snapshot)
                  : (row.holdings_snapshot || []);
              } catch { return []; }
            })();

            const investedCents = snapshot.reduce(
              (sum, h) => sum + Math.round((h.avg_fill || 0) * (h.qty || 0)),
              0
            );
            const changePct = investedCents > 0
              ? ((basketCents - investedCents) / investedCents) * 100
              : 0;

            const holdingsArr = strat.holdings || [];
            const topLogos = [...holdingsArr]
              .sort((a, b) => (b.weight || 0) - (a.weight || 0))
              .slice(0, 3)
              .map(h => h.logo_url || null)
              .filter(Boolean);

            return {
              symbol: strat.short_name || strat.name || "Strategy",
              name: strat.name || "Strategy",
              market_value: basketCents,
              invested_amount: investedCents,
              avg_fill: investedCents,
              quantity: 1,
              logo_url: null,
              security_id: null,
              isStrategy: true,
              strategyId: stratId,
              topLogos,
              changePct,
              holdings: holdingsArr,
              firstInvestedDate: null,
            };
          });

          enrichedHoldings = [...stockHoldings, ...strategyItems];
        }

        // Live value: use last_price × qty for stocks, market_value for strategies
        const liveMarketValue = (h) => {
          if (!h.isStrategy && h.last_price != null && h.quantity != null) {
            return (Number(h.last_price) * Number(h.quantity));
          }
          return Number(h.market_value || 0);
        };

        const mValue = enrichedHoldings.reduce((acc, h) => acc + liveMarketValue(h) / 100, 0);
        const invested = enrichedHoldings.reduce(
          (acc, h) =>
            acc + (Number(h.avg_fill || 0) * Number(h.quantity || 0)) / 100,
          0,
        );
        const investedAmount = enrichedHoldings.reduce(
          (acc, h) => {
            if (h.invested_amount !== undefined) return acc + Number(h.invested_amount) / 100;
            return acc + (Number(h.avg_fill || 0) * Number(h.quantity || 0)) / 100;
          },
          0,
        );

        console.log("[SwipeableBalanceCard] Loaded holdings:", {
          count: enrichedHoldings.length,
          totalMarketValue: mValue,
          holdings: enrichedHoldings.map(h => ({
            symbol: h.symbol,
            market_value: h.market_value,
            security_id: h.security_id,
            strategy_id: h.strategy_id,
            quantity: h.quantity,
            avg_fill: h.avg_fill
          }))
        });

        const nextDbData = {
          holdings: enrichedHoldings,
          totalMarketValue: mValue,
          totalInvested: invested,
          totalInvestedAmount: investedAmount,
          holdingsCount: enrichedHoldings.length,
        };
        // Persist in module-level cache (tab switches) + localStorage (page refreshes)
        if (mValue > 0 || enrichedHoldings.length > 0) {
          _cardDataCache[_cacheKey] = nextDbData;
          _lsSave(_cacheKey, nextDbData);
        }
        setDbData(nextDbData);
        setDataSettled(true);
      } catch (err) {
        console.error("❌ [SwipeableBalanceCard] Load data error:", err);
        setDataSettled(true);
      } finally {
        if (!cancelled) {
          lastCardLoadRef.current = Date.now();
          if (!silent) setLoading(false);
          else setLoading(false);
        }
      }
    };

    // If we already have cached data (module cache or localStorage), refresh
    // silently in the background — no skeleton shown, value updates in-place.
    const hasCached = !!(_warmCache?.totalMarketValue > 0);
    loadDataRef.current = () => loadData({ silent: hasCached });
    loadData({ silent: hasCached });

    // Debounce visibility handler — silent background refresh with 30 s cooldown
    // so tab switches never reset the skeleton when data is already loaded
    let visibilityDebounce = null;
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(visibilityDebounce);
        visibilityDebounce = setTimeout(() => {
          const elapsed = Date.now() - lastCardLoadRef.current;
          if (elapsed < CARD_REFRESH_COOLDOWN) {
            logDebug(CAT.VISIBILITY, `👁  SwipeableBalanceCard skip tab-focus refresh — cooldown (${Math.round(elapsed / 1000)}s < 30s)`);
            return;
          }
          logDebug(CAT.LOADING, "👁  SwipeableBalanceCard silent refresh on tab focus (no skeleton)");
          loadData({ silent: true });
        }, 300);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
      clearTimeout(abortTimer);
      clearTimeout(visibilityDebounce);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [userId, familyMemberId, lastUpdated]);

  useEffect(() => {
    let chartCancelled = false;
    const fetchChartPrices = async () => {
      if (!userId && !familyMemberId) return;

      // Ensure we don't leave chart stuck in loading if no holdings
      if (dbData.holdings.length === 0) {
        setChartData([]);
        setChartLoading(false);
        return;
      }

      logDebug(CAT.CHART, `📈 Chart fetch START — tab: ${activeTab}`);
      setChartLoading(true);

      // Safety timeout — always exit chart skeleton after 5s even if Supabase query stalls
      const chartSafetyTimer = setTimeout(() => {
        if (!chartCancelled) {
          logDebug(CAT.CHART, "⏱ Safety timer fired — chart loading forced off after 5 s");
          console.warn("[SwipeableBalanceCard] Chart fetch safety timeout reached, clearing loader");
          setChartLoading(false);
        }
      }, 5000);

      try {
        const holdingsToChart = selectedAsset ? [selectedAsset] : dbData.holdings;
        const days = TIMEFRAME_DAYS[activeTab] || 30;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const startDateStr = cutoff.toISOString().split("T")[0];
        console.log(`[SwipeableBalanceCard] Fetching history for tab: ${activeTab}, days: ${days}, startDate: ${startDateStr}`);

        // Process strategies: cumulative sum of 1d_pnl from client_strategy_returns_c
        // Only for parent mode (userId); child mode has limited strategy returns tracking
        const strategyBasketByDate = {};
        const endDateStr = new Date().toISOString().split("T")[0];
        const limitValue = activeTab === "5d" ? 5 : undefined;

        if (userId) {
          const strategyHoldings = holdingsToChart.filter(h => h.isStrategy && h.strategyId);
          // Collect daily 1d_pnl per date (summed across all strategies)
          const strategyDailyPnl = {};
          await Promise.all(strategyHoldings.map(async (sh) => {
            try {
              let query = supabase
                .from("client_strategy_returns_c")
                .select("*")
                .eq("user_id", userId)
                .eq("strategy_id", sh.strategyId)
                .order("as_of_date", { ascending: true });

              if (activeTab !== "all") {
                query = query.gte("as_of_date", startDateStr);
              }

              if (limitValue) {
                query = query.limit(limitValue);
              }

              const { data, error } = await withTimeout(query, 4000);

              if (!error && data && data.length > 0) {
                data.forEach((row) => {
                  const dateKey = row.as_of_date;
                  const dailyPnlRands = (Number(row["1d_pnl"] || 0)) / 100;
                  strategyDailyPnl[dateKey] = (strategyDailyPnl[dateKey] || 0) + dailyPnlRands;
                });
              }
            } catch (e) {
              console.warn(`[Chart] Failed to fetch strategy 1d_pnl for ${sh.strategyId}:`, e);
            }
          }));

          // Build cumulative sum of 1d_pnl across all dates
          const sortedStrategyDates = Object.keys(strategyDailyPnl).sort();
          let runningTotal = 0;
          for (const dateKey of sortedStrategyDates) {
            runningTotal += strategyDailyPnl[dateKey];
            strategyBasketByDate[dateKey] = runningTotal;
          }
        }

        // Process stocks
        const stockHoldings = holdingsToChart.filter(h => h.security_id && !h.isStrategy);
        const pricePromises = stockHoldings.map(async (h) => {
          try {
            let { data, error } = await supabase
              .from("stock_returns_c")
              .select("as_of_date, current_price")
              .eq("security_id", h.security_id)
              .gte("as_of_date", startDateStr)
              .order("as_of_date", { ascending: true });

            if (error || !data || data.length < 2) {
              const fallback = await supabase
                .from("stock_returns_c")
                .select("as_of_date, current_price")
                .eq("security_id", h.security_id)
                .order("as_of_date", { ascending: false })
                .limit(30);
              if (!fallback.error && fallback.data && fallback.data.length >= 2) {
                data = fallback.data.reverse();
              } else if (!data || data.length === 0) return null;
            }

            const pDateStr = (h.created_at || h.as_of_date || "").split("T")[0];
            const avgFillPrice = Number(h.avg_fill || 0) / 100;
            const livePrice = Number(h.last_price || 0) / 100;
            
            const allMapped = data.map((p) => ({
              ts: p.as_of_date.split("T")[0],
              close: Number(p.current_price) / 100,
            }));
            
            let filteredPrices = allMapped.filter((p) => p.ts >= pDateStr);
            if (filteredPrices.length === 0) {
              filteredPrices = [{ ts: pDateStr, close: avgFillPrice }];
            }
            
            const today = new Date().toISOString().split("T")[0];
            const lastDate = filteredPrices[filteredPrices.length - 1]?.ts;
            if (livePrice > 0 && lastDate && lastDate < today) {
              filteredPrices.push({ ts: today, close: livePrice });
            }
            
            return {
              securityId: h.security_id,
              quantity: Number(h.quantity || 1),
              avgFill: avgFillPrice,
              prices: filteredPrices,
            };
          } catch (e) {
            console.warn(`[Chart] Failed to fetch stock ${h.security_id}:`, e);
            return null;
          }
        });

        const allPriceData = (await Promise.all(pricePromises)).filter(Boolean);
        const hasStrategyData = Object.keys(strategyBasketByDate).length > 0;

        if (allPriceData.length === 0 && !hasStrategyData) {
          // No price history in DB — synthesize a 2-point chart from cost basis → current market value
          const activeHoldings = holdingsToChart.filter(h => !h.isStrategy && Number(h.avg_fill || 0) > 0);
          if (activeHoldings.length > 0) {
            const totalCostCents = activeHoldings.reduce((s, h) => s + Number(h.avg_fill || 0) * Number(h.quantity || 0), 0);
            const totalMarketCents = activeHoldings.reduce((s, h) => s + Number(h.market_value || 0), 0);
            const totalPnl = (totalMarketCents - totalCostCents) / 100;
            const earliest = activeHoldings
              .map(h => (h.created_at || h.as_of_date || "").slice(0, 10))
              .filter(Boolean).sort()[0] || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
            const today = new Date().toISOString().slice(0, 10);
            setChartData([
              { d: earliest, v: 0 },
              { d: today, v: Number(totalPnl.toFixed(2)) },
            ]);
          } else {
            setChartData([]);
          }
          return;
        }

        // Merge dates and calculate PnL per point
        const dateSet = new Set();
        allPriceData.forEach(({ prices }) => prices.forEach((p) => dateSet.add(p.ts)));
        Object.keys(strategyBasketByDate).forEach((d) => dateSet.add(d));
        const sortedDates = Array.from(dateSet).sort();

        const rawPriceByDate = {};
        allPriceData.forEach(({ securityId, prices }) => {
          rawPriceByDate[securityId] = {};
          prices.forEach((p) => { rawPriceByDate[securityId][p.ts] = p.close; });
        });

        const filledPriceByDate = {};
        allPriceData.forEach(({ securityId }) => {
          filledPriceByDate[securityId] = {};
          let lastK = 0;
          for (const dateKey of sortedDates) {
            if (rawPriceByDate[securityId]?.[dateKey] !== undefined) {
              lastK = rawPriceByDate[securityId][dateKey];
            }
            if (lastK > 0) filledPriceByDate[securityId][dateKey] = lastK;
          }
        });

        const points = [];
        // Don't add anchor point - start with first actual value at bottom left
        for (const dateKey of sortedDates) {
          let totalPnl = 0;
          let hasVal = false;
          for (const { securityId, quantity, avgFill } of allPriceData) {
            const pr = filledPriceByDate[securityId]?.[dateKey];
            if (pr && avgFill > 0) {
              totalPnl += quantity * (pr - avgFill);
              hasVal = true;
            }
          }
          // Add strategy basket value from last 5 rows (in rands)
          if (strategyBasketByDate[dateKey] !== undefined) {
            totalPnl += strategyBasketByDate[dateKey];
            hasVal = true;
          }
          if (hasVal) points.push({ d: dateKey, v: Number(totalPnl.toFixed(2)) });
        }

        // Normalize chart to start value: subtract first value from all points
        if (points.length > 0) {
          const firstValue = points[0].v;
          points.forEach(point => {
            point.v = Number((point.v - firstValue).toFixed(2));
          });
          // Add the first value back as the baseline
          points[0].v = firstValue;
        }

        console.log(`[SwipeableBalanceCard] Final chart points: ${points.length}`);
        setChartData(points);
      } catch (err) {
        console.error("❌ [SwipeableBalanceCard] Chart fetch error:", err);
      } finally {
        clearTimeout(chartSafetyTimer);
        setChartLoading(false);
      }
    };

    fetchChartPrices();
    return () => {
      chartCancelled = true;
    };
  }, [userId, familyMemberId, dbData.holdings, activeTab, selectedAsset, lastUpdated]);

  useEffect(() => {
    const fetchPeriodReturnData = async () => {
      if (!["5d", "m", "ytd", "all"].includes(activeTab) || (!userId && !familyMemberId)) return;

      try {
        // If an asset is selected, show its returns
        // Otherwise, calculate portfolio-wide returns
        const asset = selectedAsset;

        // Map activeTab to column names
        const columnMap = {
          "5d": { pnl: "5d_pnl", pct: "5d_pct" },
          "m": { pnl: "1m_pnl", pct: "1m_pct" },
          "ytd": { pnl: "ytd_pnl", pct: "ytd_pct" },
          "all": { pnl: "inception_pnl", pct: "inception_pct" }
        };

        const columns = columnMap[activeTab];

        if (asset) {
          // For selected asset, fetch from appropriate table
          if (asset.isStrategy && asset.strategyId && userId) {
            const { data, error } = await supabase
              .from("client_strategy_returns_c")
              .select("*")
              .eq("user_id", userId)
              .eq("strategy_id", asset.strategyId)
              .order("as_of_date", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (!error && data) {
              const pnlValue = data[columns.pnl] || 0;
              const pctValue = data[columns.pct] || 0;
              const basketValue = (Number(data.basket_value || 0)) / 100;
              setReturnData5d({
                pnl: (Number(pnlValue)) / 100,
                pct: Number(pctValue)
              });
              setLatestBasketValue(basketValue);
            } else {
              setLatestBasketValue(0);
              setReturnData5d({ pnl: 0, pct: 0 });
            }
          } else if (asset.security_id) {
            const { data, error } = await supabase
              .from("stock_returns_c")
              .select("*")
              .eq("security_id", asset.security_id)
              .order("as_of_date", { ascending: false })
              .limit(1)
              .single();

            if (!error && data) {
              const pnlValue = data[columns.pnl] || 0;
              const pctValue = data[columns.pct] || 0;
              const basketValue = (Number(data.basket_value || 0)) / 100;
              setReturnData5d({
                pnl: (Number(pnlValue)) / 100,
                pct: Number(pctValue)
              });
              setLatestBasketValue(basketValue);
            } else {
              setLatestBasketValue(0);
              setReturnData5d({ pnl: 0, pct: 0 });
            }
          }
        } else if (dbData.holdings.length > 0) {
          // For portfolio-wide returns, sum returns from all holdings
          let totalPnl = 0;
          let weightedPct = 0;
          let totalValue = dbData.totalMarketValue;
          let totalInvested = dbData.totalInvestedAmount;

          const strategyIds = dbData.holdings
            .filter(h => h.isStrategy && h.strategyId)
            .map(h => h.strategyId);

          const securityIds = dbData.holdings
            .filter(h => h.security_id && !h.isStrategy)
            .map(h => h.security_id);

          // Fetch latest return data for each strategy (parent mode only)
          if (strategyIds.length > 0 && userId) {
            for (const strategyId of strategyIds) {
              const { data: row, error: err } = await supabase
                .from("client_strategy_returns_c")
                .select("*")
                .eq("user_id", userId)
                .eq("strategy_id", strategyId)
                .order("as_of_date", { ascending: false })
                .limit(1)
                .maybeSingle();

              if (!err && row) {
                const pnlValue = row[columns.pnl] || 0;
                const pctValue = row[columns.pct] || 0;
                const basketValue = (Number(row.basket_value || 0)) / 100;
                const weight = dbData.totalMarketValue > 0 ? basketValue / dbData.totalMarketValue : 0;
                totalPnl += (Number(pnlValue)) / 100;
                weightedPct += Number(pctValue) * weight;
              }
            }
          }

          // Fetch latest return data for each stock
          if (securityIds.length > 0) {
            for (const securityId of securityIds) {
              const { data: row, error: err } = await supabase
                .from("stock_returns_c")
                .select("*")
                .eq("security_id", securityId)
                .order("as_of_date", { ascending: false })
                .limit(1)
                .single();

              if (!err && row) {
                const pnlValue = row[columns.pnl] || 0;
                const pctValue = row[columns.pct] || 0;
                const basketValue = (Number(row.basket_value || 0)) / 100;
                const weight = dbData.totalMarketValue > 0 ? basketValue / dbData.totalMarketValue : 0;
                totalPnl += (Number(pnlValue)) / 100;
                weightedPct += Number(pctValue) * weight;
              }
            }
          }

          // Calculate portfolio return percentage
          const portfolioPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

          setReturnData5d({
            pnl: totalPnl,
            pct: portfolioPct
          });
        }
      } catch (e) {
        console.warn("[SwipeableBalanceCard] Error fetching period return data:", e);
      }
    };

    fetchPeriodReturnData();
  }, [activeTab, userId, familyMemberId, selectedAsset, dbData.holdings]);

  const displayMarketValue = selectedAsset
    ? Number(selectedAsset.market_value || 0) / 100
    : dbData.totalMarketValue;
  const displayInvested = selectedAsset
    ? (Number(selectedAsset.avg_fill || 0) *
      Number(selectedAsset.quantity || 0)) /
    100
    : dbData.totalInvested;
  const displayInvestedAmount = selectedAsset
    ? (selectedAsset.invested_amount !== undefined
        ? Number(selectedAsset.invested_amount) / 100
        : (Number(selectedAsset.avg_fill || 0) * Number(selectedAsset.quantity || 0)) / 100)
    : dbData.totalInvestedAmount;
  const isPeriodTab = ["5d", "m", "ytd", "all"].includes(activeTab);
  const displayReturn = isPeriodTab
    ? returnData5d.pnl
    : (displayMarketValue - displayInvested);
  // Show latest basket_value for period views, otherwise use market value
  const displayBalance = overrideBalance !== undefined
    ? overrideBalance
    : (isPeriodTab && latestBasketValue > 0
      ? latestBasketValue
      : displayMarketValue);

  const isLoss = displayReturn != null && displayReturn < 0;
  const returnPct = isPeriodTab
    ? (returnData5d.pct == null ? null : truncateDecimal(returnData5d.pct, 2).toFixed(2))
    : (displayInvested > 0
      ? truncateDecimal((displayReturn / displayInvested) * 100, 2).toFixed(2)
      : "0.00");
  const chartColor = isLoss ? "hsl(0,84%,60%)" : "hsl(160,70%,45%)";

  const masked = "••••";

  const TrendIcon = isLoss ? TrendingDown : TrendingUp;

  return (
    <div className="rounded-3xl gradient-hero-card shadow-hero p-5 relative overflow-hidden border border-white/5">
      {/* Ambient glows */}
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-accent/30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-8 w-32 h-32 rounded-full bg-primary/15 blur-3xl pointer-events-none" />

      {/* Top row: label + visibility + LIVE */}
      <div className="flex items-center justify-between relative">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold tracking-[0.18em] text-white/60">
            {selectedAsset ? selectedAsset.symbol.toUpperCase() : "PORTFOLIO VALUE"}
          </span>
          <button
            onClick={toggleVisibility}
            className="text-white/50 hover:text-white/90 transition-colors"
            aria-label="Toggle visibility"
          >
            {isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          {isConnected && (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-success" style={{ animation: "pulse-dot 2s ease-in-out infinite" }} />
              <span className="text-[9px] tracking-wider text-white/50 font-semibold">LIVE</span>
            </>
          )}
        </div>
      </div>

      {/* Value + inline sparkline */}
      <div className="flex items-end justify-between mt-2 relative">
        <div className="flex-1 min-w-0 pr-3">
          {!dataSettled ? (
            <Skeleton className="h-8 w-36 bg-white/15 rounded mb-2 animate-pulse" />
          ) : (
            <h2 className="text-3xl font-bold tracking-tight text-white leading-none">
              {isVisible ? formatFull(displayBalance) : masked}
            </h2>
          )}
          <div className="flex items-center gap-2 mt-2">
            {!dataSettled ? (
              <Skeleton className="h-5 w-24 bg-white/15 rounded-full animate-pulse" />
            ) : (
              <>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${isLoss ? "bg-destructive/20 text-destructive" : "bg-success/20 text-success"}`}>
                  <TrendIcon size={11} strokeWidth={2.5} />
                  {isVisible ? (
                    <>
                      {isPeriodTab && (
                        <span className="text-[10px] opacity-75">
                          {activeTab === "5d" && "5D:"}{activeTab === "m" && "1M:"}{activeTab === "ytd" && "YTD:"}{activeTab === "all" && "Inc:"}
                        </span>
                      )}
                      {displayReturn == null ? "N/A" : formatKMB(Math.abs(displayReturn))}
                    </>
                  ) : (
                    masked
                  )}
                </span>
                <span className={`text-[11px] font-medium ${isLoss ? "text-destructive" : "text-success"}`}>
                  {isVisible
                    ? (returnPct == null ? "N/A" : `${isLoss ? "-" : "+"}${returnPct}%`)
                    : masked}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Mobile sparkline — flex item so it doesn't overflow into dropdown */}
        <div className="sm:hidden opacity-90 self-end shrink-0 overflow-hidden" style={{ width: 150, height: 72 }}>
          {chartData.length > 1 ? (
            <ResponsiveContainer width={150} height={72}>
              <ComposedChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg px-2 py-1 shadow-md">
                        <p className="text-[9px] text-slate-500">{payload[0]?.payload?.d}</p>
                        <p className="text-[10px] font-semibold text-slate-800">{formatPrecise(payload[0]?.value)}</p>
                      </div>
                    );
                  }}
                />
                <ReferenceLine y={0} stroke="rgba(148,163,184,0.3)" strokeDasharray="3 3" strokeWidth={1} />
                <Area type="monotone" dataKey="v" stroke="none" fill={chartColor} fillOpacity={0.15} />
                <Line type="monotone" dataKey="v" stroke={chartColor} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (!dataSettled || chartLoading) ? (
            <div className="flex items-end gap-0.5 w-full h-full">
              {[40, 55, 35, 65, 50, 70, 45, 60].map((h, i) => (
                <Skeleton key={i} className="flex-1 rounded-sm bg-white/10 animate-pulse" style={{ height: `${h}%` }} />
              ))}
            </div>
          ) : null}
        </div>

        {/* Desktop sparkline — original absolute positioning, unchanged */}
        <div className="hidden sm:block opacity-90 absolute right-4 -bottom-10">
          {chartData.length > 1 ? (
            <ResponsiveContainer width={185} height={85}>
              <ComposedChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg px-2 py-1 shadow-md">
                        <p className="text-[9px] text-slate-500">{payload[0]?.payload?.d}</p>
                        <p className="text-[10px] font-semibold text-slate-800">{formatPrecise(payload[0]?.value)}</p>
                      </div>
                    );
                  }}
                />
                <ReferenceLine y={0} stroke="rgba(148,163,184,0.3)" strokeDasharray="3 3" strokeWidth={1} />
                <Area type="monotone" dataKey="v" stroke="none" fill={chartColor} fillOpacity={0.15} />
                <Line type="monotone" dataKey="v" stroke={chartColor} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (!dataSettled || chartLoading) ? (
            <div className="flex items-end gap-0.5 w-[185px] h-[85px]">
              {[40, 55, 35, 65, 50, 70, 45, 60].map((h, i) => (
                <Skeleton key={i} className="flex-1 rounded-sm bg-white/10 animate-pulse" style={{ height: `${h}%` }} />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Asset selector — hidden in child mode */}
      <div ref={dropdownRef} className={`relative mt-3${childMode ? " hidden" : ""}`}>
        {!dataSettled ? (
          <Skeleton className="h-7 w-28 bg-white/10 rounded-full animate-pulse" />
        ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/15"
        >
          <LayoutGrid size={12} className="text-violet-400" />
          <span className="text-[11px] font-medium text-slate-200 whitespace-nowrap">
            {selectedAsset ? selectedAsset.symbol : (dbData.holdings.length > 0 ? dbData.holdings[0].symbol : "Investments")}
          </span>
          {isOpen ? <ChevronUp size={12} className="text-slate-300" /> : <ChevronDown size={12} className="text-slate-300" />}
        </button>
        )}
        {isOpen && (
          <div className="absolute top-full mt-1 left-0 w-48 bg-white rounded-xl z-[120] overflow-hidden border border-slate-200 shadow-lg">
            <div className="py-1 overflow-y-auto max-h-[140px]">
              {dbData.holdings.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => { setSelectedAsset(item); setIsOpen(false); scrollToHoldingIndex(idx); }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-left ${selectedAsset?.symbol === item.symbol ? "bg-slate-100" : "hover:bg-slate-50"}`}
                >
                  <div className="w-4 h-4 rounded-full overflow-hidden bg-slate-100 shrink-0">
                    {item.isStrategy && item.topLogos?.length > 0 ? (
                      <div className="flex -space-x-1 h-full items-center justify-center">
                        {item.topLogos.slice(0, 2).map((logo, li) => (
                          <img key={li} src={logo} className="w-3 h-3 rounded-full object-cover border border-white/25" />
                        ))}
                      </div>
                    ) : item.logo_url ? (
                      <img src={item.logo_url} className="w-full h-full object-cover" />
                    ) : (
                      <span className="flex items-center justify-center w-full h-full text-[6px] text-slate-500">
                        {item.symbol?.substring(0, 2)}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-medium text-slate-700 truncate">{item.symbol}</span>
                  {(() => {
                    if (item.isStrategy && Number(item.avg_fill || 0) === 0) return <SettlementBadge status="pending" size="xs" />;
                    if (item.settlement_status && item.settlement_status !== "confirmed") return <SettlementBadge status={item.settlement_status} size="xs" />;
                    const isSettlementActive = settlementCfg.brokerEnabled || settlementCfg.fullyIntegrated;
                    if (!isSettlementActive) return null;
                    const s = holdingSettlementStatus;
                    return s && s !== "confirmed" ? <SettlementBadge status={s} size="xs" /> : null;
                  })()}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Period selector */}
      <div className="mt-4 flex bg-black/20 backdrop-blur-sm rounded-full p-0.5 relative">
        {[["5d","5D"],["m","M"],["ytd","YTD"],["all","All"]].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
              activeTab === key ? "bg-white text-slate-900 shadow-sm" : "text-white/60 hover:text-white/90"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-white/10 flex relative">
        <div className="flex-1">
          <div className="text-[9px] tracking-[0.15em] text-white/50 font-semibold">CASH</div>
          <div className="text-sm font-bold text-white mt-0.5">
            {isVisible ? (effectiveWalletLoading ? "..." : formatFull(effectiveWalletBalance)) : masked}
          </div>
        </div>
        <div className="w-px bg-white/10" />
        <div className="flex-1 pl-4">
          <div className="text-[9px] tracking-[0.15em] text-white/50 font-semibold">MINT NUMBER</div>
          <div className="text-sm font-bold text-white mt-0.5 font-mono">
            {mintNumber ?? "GENERATING..."}
          </div>
        </div>
      </div>

      {managedByLabel && (
        <div className="mt-3 pt-3 border-t border-white/10 text-center">
          <div className="text-[10px] text-white/60 font-medium">
            {managedByLabel}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(52,211,153,0.4); }
          50% { opacity: 0.7; box-shadow: 0 0 0 3px rgba(52,211,153,0); }
        }
      `}</style>
    </div>
  );
};

export default SwipeableBalanceCard;
