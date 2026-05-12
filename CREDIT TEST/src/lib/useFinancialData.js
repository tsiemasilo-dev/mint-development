import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { logDebug, CAT } from "./debugLog.js";
import { getCachedSession, setCachedSession } from "./sessionCache.js";
import { registerCacheResetCallback } from "./userCacheReset.js";

async function getAuthToken() {
  if (!supabase) return null;
  const session = await getCachedSession();
  if (session?.access_token) return session.access_token;
  try {
    const { data: refreshData } = await supabase.auth.refreshSession();
    if (refreshData?.session?.access_token) return refreshData.session.access_token;
  } catch {}
  return null;
}

function getHoldingsList(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.holdings)) return result.holdings;
  return [];
}

function getClosedHoldingsList(result) {
  if (Array.isArray(result?.closedHoldings)) return result.closedHoldings;
  return [];
}

async function fetchServerHoldings(token) {
  try {
    let activeToken = token || await getAuthToken();
    if (!activeToken) return { holdings: [], closedHoldings: [] };

    let res = await fetch("/api/user/holdings", {
      headers: { Authorization: `Bearer ${activeToken}` },
      signal: AbortSignal.timeout(12000),
    });

    if (res.status === 401) {
      activeToken = await getAuthToken();
      if (activeToken) {
        res = await fetch("/api/user/holdings", {
          headers: { Authorization: `Bearer ${activeToken}` },
          signal: AbortSignal.timeout(12000),
        });
      }
    }

    if (!res.ok) {
      console.error("Failed to fetch holdings from server:", res.status);
      return { holdings: [], closedHoldings: [] };
    }
    const json = await res.json();
    return { holdings: json.holdings || [], closedHoldings: json.closedHoldings || [] };
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      console.warn("[useFinancialData] Holdings fetch timed out, returning empty");
    } else {
      console.error("Failed to fetch holdings:", err);
    }
    return { holdings: [], closedHoldings: [] };
  }
}

async function fetchServerTransactions(token, limit = 50) {
  try {
    let activeToken = token || await getAuthToken();
    if (!activeToken) return [];

    let res = await fetch(`/api/user/transactions?limit=${limit}`, {
      headers: { Authorization: `Bearer ${activeToken}` },
      signal: AbortSignal.timeout(12000),
    });

    if (res.status === 401) {
      activeToken = await getAuthToken();
      if (activeToken) {
        res = await fetch(`/api/user/transactions?limit=${limit}`, {
          headers: { Authorization: `Bearer ${activeToken}` },
          signal: AbortSignal.timeout(12000),
        });
      }
    }

    if (!res.ok) {
      console.error("Failed to fetch transactions from server:", res.status);
      return [];
    }
    const json = await res.json();
    return json.transactions || [];
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      console.warn("[useFinancialData] Transactions fetch timed out, returning empty");
    } else {
      console.error("Failed to fetch transactions:", err);
    }
    return [];
  }
}

let financialDataCache = null;
let financialDataLastFetch = 0;
const VISIBILITY_REFETCH_COOLDOWN_MS = 45000;

export const clearFinancialDataCache = () => {
  financialDataCache = null;
  financialDataLastFetch = 0;
};

const emptyFinancialData = {
  balance: 0,
  investments: 0,
  availableCredit: 0,
  transactions: [],
  holdings: [],
  creditInfo: null,
  bestAssets: [],
  loading: false,
  error: null,
};

export const useFinancialData = () => {
  const [data, setData] = useState(() =>
    financialDataCache
      ? { ...financialDataCache, loading: false, error: null }
      : { ...emptyFinancialData, loading: true }
  );

  const fetchData = useCallback(async ({ silent = false, _trigger = "unknown" } = {}) => {
    logDebug(CAT.FETCH, `📥 useFinancialData fetch start — trigger: ${_trigger}, silent: ${silent}`);
    if (!supabase) {
      setData((prev) => ({ ...prev, loading: false, error: "Database not connected" }));
      return;
    }

    try {
      const session = await getCachedSession();
      if (!session?.user) {
        setData((prev) => ({ ...prev, loading: false }));
        return;
      }
      setCachedSession(session);

      const userId = session.user.id;
      const token = session.access_token;

      const [
        holdings,
        allServerTransactions,
        creditResult,
        walletResult,
      ] = await Promise.all([
        fetchServerHoldings(token),
        fetchServerTransactions(token, 100),
        supabase.from("credit_accounts").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("wallets").select("balance").eq("user_id", userId).maybeSingle(),
      ]);

      const safeHoldings = getHoldingsList(holdings);
      const safeTxns = Array.isArray(allServerTransactions) ? allServerTransactions : [];

      if (silent && safeHoldings.length === 0 && financialDataCache?.holdings?.length > 0) {
        console.warn("[useFinancialData] Background refresh returned empty holdings — keeping cached data");
        setData((prev) => ({ ...prev, loading: false }));
        return;
      }

      const transactions = safeTxns.slice(0, 20);
      const allTransactions = safeTxns;
      const creditInfo = creditResult.data;

      const sortedHoldings = [...safeHoldings].filter(h => !h.strategy_id).sort((a, b) => {
        const aGain = (a.unrealized_pnl || 0) / 100;
        const bGain = (b.unrealized_pnl || 0) / 100;
        return bGain - aGain;
      });

      const liveVal = (h) => h.last_price != null && h.quantity != null ? (h.last_price * h.quantity) / 100 : (h.market_value || 0) / 100;
      const bestAssets = sortedHoldings.slice(0, 5).map((h) => {
        const currentValue = liveVal(h);
        const costBasis = ((h.avg_fill || 0) * (h.quantity || 0)) / 100;
        const changePercent = costBasis > 0 ? ((currentValue - costBasis) / costBasis) * 100 : 0;
        return {
          symbol: h.symbol,
          name: h.name,
          value: currentValue,
          change: changePercent,
          logo: h.logo_url,
        };
      });

      const totalInvestments = safeHoldings.reduce((sum, h) => sum + liveVal(h), 0);
      
      const incomeTypes = ["credit"];
      const expenseTypes = ["debit"];
      const totalIncome = allTransactions
        .filter((t) => incomeTypes.includes(t.direction))
        .reduce((sum, t) => sum + Math.abs((t.amount || 0) / 100), 0);
      const totalExpenses = allTransactions
        .filter((t) => expenseTypes.includes(t.direction))
        .reduce((sum, t) => sum + Math.abs((t.amount || 0) / 100), 0);
      const availableCredit = Math.max(0, (totalIncome - totalExpenses) * 0.2);
      // Guard: if wallet query failed, preserve cached balance to avoid showing R0
      const walletBalance = walletResult.error
        ? (financialDataCache?.balance ?? 0)
        : (walletResult.data?.balance ?? 0);

      const newData = {
        balance: walletBalance,
        investments: totalInvestments,
        availableCredit,
        transactions,
        holdings: safeHoldings,
        creditInfo,
        bestAssets,
        loading: false,
        error: null,
      };

      financialDataCache = newData;
      financialDataLastFetch = Date.now();
      setData(newData);

      logDebug(CAT.FETCH, `✅ useFinancialData done — balance: R${walletBalance}`, { walletBalance, totalInvestments });
      console.log("[useFinancialData] Updated balance from DB:", walletBalance);
    } catch (err) {
      console.error("Error fetching financial data:", err);
      setData((prev) => ({
        ...prev,
        loading: false,
        error: err.message,
      }));
    }
  }, []);

  useEffect(() => {
    if (financialDataCache) {
      fetchData({ silent: true, _trigger: "mount-with-cache" });
      return;
    }
    const safetyTimer = setTimeout(() => {
      setData((prev) => {
        if (!prev.loading) return prev;
        console.warn("[useFinancialData] Safety timeout reached, unblocking UI");
        logDebug(CAT.LOADING, "⏱ Safety timer fired — useFinancialData loading forced off after 15 s");
        return { ...prev, loading: false };
      });
    }, 15000);
    fetchData({ _trigger: "mount-no-cache" }).finally(() => clearTimeout(safetyTimer));
    return () => clearTimeout(safetyTimer);
  }, [fetchData]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      const timeSinceLast = now - financialDataLastFetch;
      if (timeSinceLast < VISIBILITY_REFETCH_COOLDOWN_MS) {
        logDebug(CAT.VISIBILITY, `👁  useFinancialData skip refetch — cooldown (${Math.round(timeSinceLast / 1000)}s < 45s)`);
        return;
      }
      logDebug(CAT.VISIBILITY, "👁  useFinancialData refetch triggered by tab focus");
      fetchData({ silent: true, _trigger: "visibility" });
    };
    const handleUpdate = () => {
      logDebug(CAT.FETCH, "📡 useFinancialData refetch via financial-data-updated event");
      fetchData({ _trigger: "event" });
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("financial-data-updated", handleUpdate);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("financial-data-updated", handleUpdate);
    };
  }, [fetchData]);

  return { ...data, refetch: fetchData };
};

let _mintBalanceCache = null;

export function clearUserFinancialCache() {
  _mintBalanceCache = null;
  _txCache = null;
  _txCacheLimit = null;
}

registerCacheResetCallback(clearUserFinancialCache);

export const useMintBalance = () => {
  const [data, setData] = useState(() => _mintBalanceCache || {
    totalBalance: 0,
    investments: 0,
    availableCredit: 0,
    dailyChange: 0,
    recentChanges: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchBalance = async () => {
      if (!supabase) {
        setData((prev) => ({ ...prev, loading: false }));
        return;
      }

      try {
        const session = await getCachedSession();
        if (!session?.user) {
          setData((prev) => ({ ...prev, loading: false }));
          return;
        }

        const userId = session.user.id;
        const token = session.access_token;

        const [holdingsRaw, allServerTransactionsRaw] = await Promise.all([
          fetchServerHoldings(token),
          fetchServerTransactions(token, 100),
        ]);

        const holdings = getHoldingsList(holdingsRaw);
        const allServerTransactions = Array.isArray(allServerTransactionsRaw) ? allServerTransactionsRaw : [];
        const recentTransactions = allServerTransactions.slice(0, 10);
        const allTransactions = allServerTransactions;
        
        const liveV = (h) => h.last_price != null && h.quantity != null ? (h.last_price * h.quantity) / 100 : (h.market_value || 0) / 100;
        const totalInvestments = holdings.reduce((sum, h) => sum + liveV(h), 0);
        const costBasisTotal = holdings.reduce((sum, h) => sum + ((h.avg_fill || 0) * (h.quantity || 0)) / 100, 0);
        const dailyChange = totalInvestments - costBasisTotal;
        
        const incomeTypes = ["credit"];
        const expenseTypes = ["debit"];
        const totalIncome = allTransactions
          .filter((t) => incomeTypes.includes(t.direction))
          .reduce((sum, t) => sum + Math.abs((t.amount || 0) / 100), 0);
        const totalExpenses = allTransactions
          .filter((t) => expenseTypes.includes(t.direction))
          .reduce((sum, t) => sum + Math.abs((t.amount || 0) / 100), 0);
        const availableCredit = Math.max(0, (totalIncome - totalExpenses) * 0.2);
        const totalBalance = totalInvestments + availableCredit;

        const recentChanges = recentTransactions.map((t) => ({
          title: t.name || t.description || "Transaction",
          date: formatTransactionDate(t.transaction_date || t.created_at),
          amount: formatTransactionAmount((t.amount || 0) / 100, t.direction),
        }));

        const nextData = {
          totalBalance,
          investments: totalInvestments,
          availableCredit,
          dailyChange,
          recentChanges,
          loading: false,
          error: null,
        };
        _mintBalanceCache = nextData;
        setData(nextData);
      } catch (err) {
        console.error("Error fetching mint balance:", err);
        setData((prev) => ({ ...prev, loading: false, error: err.message }));
      }
    };

    fetchBalance();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchBalance();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  return data;
};

let _txCache = null;
let _txCacheLimit = null;

export const useTransactions = (limit = 20) => {
  const [transactions, setTransactions] = useState(() =>
    _txCache && _txCacheLimit === limit ? _txCache : []
  );
  const [loading, setLoading] = useState(() =>
    !(_txCache && _txCacheLimit === limit)
  );

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        const token = await getAuthToken();
        if (!token) {
          setLoading(false);
          return;
        }

        const data = await fetchServerTransactions(token, limit);
        _txCache = data;
        _txCacheLimit = limit;
        setTransactions(data);
      } catch (err) {
        console.error("Error fetching transactions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [limit]);

  return { transactions, loading };
};

export const useCreditInfo = () => {
  const [data, setData] = useState({
    availableCredit: 0,
    score: 0,
    loanBalance: 0,
    nextPaymentDate: null,
    minDue: 0,
    utilisationPercent: 0,
    scoreChangesToday: [],
    scoreChangesAllTime: [],
    loading: true,
    hasCredit: false,
  });

  useEffect(() => {
    const fetchCredit = async () => {
      if (!supabase) {
        setData((prev) => ({ ...prev, loading: false }));
        return;
      }

      try {
        const session = await getCachedSession();
        if (!session?.user) {
          setData((prev) => ({ ...prev, loading: false }));
          return;
        }

        const userId = session.user.id;

        const [creditResult, scoreHistoryResult] = await Promise.all([
          supabase.from("credit_accounts").select("*").eq("user_id", userId).maybeSingle(),
          supabase.from("credit_score_history").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
        ]);

        const credit = creditResult.data;
        const allScoreChanges = (scoreHistoryResult.data || []).map((s) => ({
          label: s.reason || "Score update",
          date: formatTransactionDate(s.created_at),
          value: s.change > 0 ? `+${s.change}` : `${s.change}`,
          rawDate: new Date(s.created_at),
        }));

        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const scoreChangesToday = allScoreChanges.filter((s) => s.rawDate >= sevenDaysAgo);
        const scoreChangesAllTime = allScoreChanges;

        if (credit) {
          setData({
            availableCredit: credit.available_credit || 0,
            score: credit.credit_score || 0,
            loanBalance: credit.loan_balance || 0,
            nextPaymentDate: credit.next_payment_date ? formatDate(credit.next_payment_date) : null,
            minDue: credit.minimum_due || 0,
            utilisationPercent: credit.utilisation_percent || 0,
            scoreChangesToday,
            scoreChangesAllTime,
            loading: false,
            hasCredit: true,
          });
        } else {
          setData((prev) => ({ ...prev, loading: false, hasCredit: false }));
        }
      } catch (err) {
        console.error("Error fetching credit info:", err);
        setData((prev) => ({ ...prev, loading: false }));
      }
    };

    fetchCredit();
  }, []);

  return data;
};

let investmentsDataCache = null;
let investmentsDataLastFetch = 0;

export const useInvestments = () => {
  const [data, setData] = useState(() =>
    investmentsDataCache
      ? { ...investmentsDataCache, loading: false }
      : {
          totalInvestments: 0,
          monthlyChange: 0,
          monthlyChangePercent: 0,
          portfolioMix: [],
          goals: [],
          holdings: [],
          closedHoldings: [],
          loading: true,
          hasInvestments: false,
        }
  );

  const fetchInvestments = useCallback(async ({ silent = false } = {}) => {
    if (!supabase) {
      setData((prev) => ({ ...prev, loading: false }));
      return;
    }

    try {
      const session = await getCachedSession();
      if (!session?.user) {
        setData((prev) => ({ ...prev, loading: false }));
        return;
      }

      const userId = session.user.id;
      const token = session.access_token;

      const [holdingsResult, goalsResult] = await Promise.all([
        fetchServerHoldings(token),
        supabase.from("investment_goals").select("*").eq("user_id", userId),
      ]);

      const holdings = getHoldingsList(holdingsResult);
      const closedHoldings = getClosedHoldingsList(holdingsResult);
      const goals = goalsResult.data || [];

      if (silent && holdings.length === 0 && investmentsDataCache?.holdings?.length > 0) {
        console.warn("[useInvestments] Background refresh returned empty holdings — keeping cached data");
        setData((prev) => ({ ...prev, loading: false }));
        return;
      }

      const liveHV = (h) => h.last_price != null && h.quantity != null ? (h.last_price * h.quantity) / 100 : (h.market_value || 0) / 100;
      const totalInvestments = holdings.reduce((sum, h) => sum + liveHV(h), 0);
      const costBasisAll = holdings.reduce((sum, h) => sum + ((h.avg_fill || 0) * (h.quantity || 0)) / 100, 0);
      const monthlyChange = totalInvestments - costBasisAll;
      const monthlyChangePercent = costBasisAll > 0 ? (monthlyChange / costBasisAll) * 100 : 0;

      const assetClasses = {};
      holdings.forEach((h) => {
        const assetClass = h.asset_class || "Other";
        const holdingValue = liveHV(h);
        assetClasses[assetClass] = (assetClasses[assetClass] || 0) + holdingValue;
      });

      const portfolioMix = Object.entries(assetClasses).map(([label, value]) => ({
        label,
        value: totalInvestments > 0 ? Math.round((value / totalInvestments) * 100) + "%" : "0%",
      }));

      const formattedGoals = goals.map((g) => {
        const invested = g.current_amount || 0;
        let currentValue = invested;

        if (g.linked_security_id || g.linked_strategy_id) {
          const linkedHolding = holdings.find(
            (h) => h.security_id === g.linked_security_id || h.strategy_id === g.linked_strategy_id
          );
          if (linkedHolding) {
            const marketVal = linkedHolding.last_price != null && linkedHolding.quantity != null ? (linkedHolding.last_price * linkedHolding.quantity) / 100 : (linkedHolding.market_value || 0) / 100;
            const costBasis = ((linkedHolding.avg_fill || 0) * (linkedHolding.quantity || 0)) / 100;
            const gainLoss = marketVal - costBasis;
            currentValue = invested + (costBasis > 0 ? (gainLoss / costBasis) * invested : 0);
          }
        }

        const target = g.target_amount || 0;
        const pct = target > 0 ? Math.min(100, Math.round((currentValue / target) * 100)) : 0;

        return {
          id: g.id,
          label: g.name || "Goal",
          value: `R${target.toLocaleString()}`,
          progress: pct + "%",
          currentAmount: currentValue,
          investedAmount: invested,
          targetAmount: target,
          targetDate: g.target_date || null,
          linkedAssetName: g.linked_asset_name || null,
          linkedStrategyId: g.linked_strategy_id || null,
          linkedSecurityId: g.linked_security_id || null,
        };
      });

      const newInvestmentsData = {
        totalInvestments,
        monthlyChange,
        monthlyChangePercent,
        portfolioMix: portfolioMix.length > 0 ? portfolioMix : [],
        goals: formattedGoals,
        holdings,
        closedHoldings,
        loading: false,
        hasInvestments: holdings.length > 0,
      };
      investmentsDataCache = newInvestmentsData;
      investmentsDataLastFetch = Date.now();
      setData(newInvestmentsData);
    } catch (err) {
      console.error("Error fetching investments:", err);
      setData((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    if (investmentsDataCache) {
      fetchInvestments({ silent: true });
      return;
    }
    fetchInvestments();
  }, [fetchInvestments]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - investmentsDataLastFetch < VISIBILITY_REFETCH_COOLDOWN_MS) return;
      fetchInvestments({ silent: true });
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchInvestments]);

  return { ...data, refetch: fetchInvestments };
};

function formatTransactionDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

function formatTransactionAmount(amount, direction) {
  if (amount === undefined || amount === null) return "R0";
  const isPositive = direction === "credit";
  const sign = isPositive ? "+" : "-";
  return `${sign}R${Math.abs(amount).toLocaleString()}`;
}

function formatDate(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toLocaleDateString("en-ZA", { month: "long", day: "numeric", year: "numeric" });
}
