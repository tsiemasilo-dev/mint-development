import React, { useState, useEffect, useRef, useMemo, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowUpRight, ArrowDownLeft, X,
  Wallet, BarChart3, ChevronRight,
  RefreshCw, Search, Star, AlertCircle, Check, ClipboardList,
  BookOpen, LayoutGrid, ArrowDownToLine, Target, FileSignature, Plus,
} from "lucide-react";
import SwipeableBalanceCard from "../components/SwipeableBalanceCard";
import Skeleton from "../components/Skeleton";
import { useProfile } from "../lib/useProfile";
import { supabase } from "../lib/supabase";
import MinorProofOfAddressDeclaration from "../components/MinorProofOfAddressDeclaration";
import ChildResponsibilityAgreement from "../components/ChildResponsibilityAgreement";
import {
  Area,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { calculateMinInvestmentSync, buildHoldingsBySymbol, getHoldingsArray, normalizeSymbol } from "../lib/strategyUtils.js";

// --- helpers ----------------------------------------------------------------

function getAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function fmt(cents) {
  const val = (cents || 0) / 100;
  return `R\u202F${val.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function withTimeout(promise, ms, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

function fetchWithTimeout(url, options, ms, message) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), ms);

  return fetch(url, { ...options, signal: controller.signal })
    .catch((error) => {
      if (error?.name === "AbortError") throw new Error(message);
      throw error;
    })
    .finally(() => window.clearTimeout(timeoutId));
}

const CHILD_KYC_PENDING_MESSAGE = "Please wait until this child's KYC is verified before browsing strategies.";

function getChildKycState(child) {
  const kycStatus = String(child?.kyc_status || "pending").toLowerCase();
  const certificateStatus = String(child?.certificate_verification_status || "pending_review").toLowerCase();
  const verified = certificateStatus === "verified" || kycStatus === "completed";
  const rejected = kycStatus === "rejected" || certificateStatus === "rejected";

  if (verified) {
    return {
      status: "verified",
      label: "Verified",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      pulse: false,
      verified: true,
    };
  }

  if (rejected) {
    return {
      status: "rejected",
      label: "KYC Rejected",
      className: "bg-red-50 text-red-700 border-red-200",
      pulse: false,
      verified: false,
    };
  }

  return {
    status: "pending",
    label: "KYC Pending",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    pulse: true,
    verified: false,
  };
}

// --- Animation variants -----------------------------------------------------

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 340, damping: 28 } },
};

function TransferModal({ child, parentBalance, balancesLoading, onTransfer, onClose }) {
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const childFirstName = child?.first_name || "Child";

  const numAmount = parseFloat(amount) || 0;
  const amountCents = Math.round(numAmount * 100);
  const insufficient = !balancesLoading && amountCents > (parentBalance || 0);

  async function handleSubmit() {
    if (numAmount <= 0) { setError("Enter a valid amount."); return; }
    if (insufficient) { setError("Insufficient wallet balance."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/child-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "transfer",
          family_member_id: child.id,
          amount: amountCents,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Transfer failed."); return; }
      setSuccess(true);
      onTransfer(json);
    } catch {
      setError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-lg font-bold text-slate-800 text-center placeholder-slate-400 focus:border-violet-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 transition tabular-nums";

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl overflow-hidden pb-[env(safe-area-inset-bottom)]"
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 38 }}
      >
        <div className="flex justify-center pt-3 pb-1"><div className="h-1 w-10 rounded-full bg-slate-200" /></div>

        <div className="px-6 pt-3 pb-8">
          {!success ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#6ee7b7,#34d399)" }}>
                    <ArrowDownLeft className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-900">Transfer Funds</p>
                    <p className="text-xs text-slate-400">
                      {`To ${childFirstName}'s account`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition active:scale-95"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Balance info */}
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 mb-4 border border-slate-100">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Wallet</p>
                  <p className="text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                    {balancesLoading ? "Loading..." : fmt(parentBalance)}
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-300" />
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{`${childFirstName}'s Wallet`}</p>
                  <p className="text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                    {balancesLoading ? "Loading..." : fmt(child.available_balance || 0)}
                  </p>
                </div>
              </div>

              {/* Amount input */}
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-0.5">
                Amount (ZAR)
              </label>
              <div className="relative mb-4">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">R</span>
                <input
                  id="child-transfer-amount"
                  name="child-transfer-amount"
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className={inputCls + " pl-10"}
                  autoFocus
                />
              </div>

              {/* Quick amounts */}
              <div className="flex gap-2 mb-5">
                {[50, 100, 250, 500].map((v) => (
                  <button
                    key={v}
                    onClick={() => setAmount(String(v))}
                    disabled={balancesLoading}
                    className="flex-1 rounded-lg py-2 text-xs font-bold text-purple-600 bg-purple-50 border border-purple-100 hover:bg-purple-100 transition active:scale-95"
                  >
                    R{v}
                  </button>
                ))}
              </div>

              {insufficient && (
                <div className="flex items-start gap-2 rounded-xl bg-purple-50 px-4 py-3 border border-purple-100 mb-3">
                  <AlertCircle className="h-3.5 w-3.5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-purple-600">Amount exceeds your wallet balance.</p>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 border border-red-100 mb-3">
                  <X className="h-3.5 w-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-500">{error}</p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={balancesLoading || saving || numAmount <= 0 || insufficient}
                className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)" }}
              >
                {saving ? "Transferring..." : `Transfer R${numAmount.toFixed(2)}`}
              </button>
            </>
          ) : (
            <motion.div
              className="text-center py-4"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div className="h-16 w-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#e9d5ff,#d8b4fe)" }}>
                <Check className="h-8 w-8 text-purple-600" />
              </div>
              <p className="text-lg font-bold text-slate-900">Transfer Complete!</p>
              <p className="text-sm text-slate-500 mt-2">
                {`R${numAmount.toFixed(2)} has been transferred to ${childFirstName}'s wallet.`}
              </p>
              <button
                onClick={onClose}
                className="mt-6 w-full rounded-xl py-3.5 text-sm font-bold text-white active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)" }}
              >
                Done
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// --- Invest Modal (bottom-sheet) - browse strategies & invest ----------------

function InvestModal({ child, onInvest, onClose, onOpenFactsheet }) {
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [step, setStep] = useState("browse");
  const [selectedStrategyAnalytics, setSelectedStrategyAnalytics] = useState(null);
  const [selectedStrategyAnalyticsLoading, setSelectedStrategyAnalyticsLoading] = useState(false);
  const [selectedStrategyActiveLabel, setSelectedStrategyActiveLabel] = useState(null);
  const [selectedStrategyMinimum, setSelectedStrategyMinimum] = useState(null);
  const [strategyMinimums, setStrategyMinimums] = useState({}); // Minimums for browse list
  const [minimumLoading, setMinimumLoading] = useState(true);
  const previewGradientId = useId();
  const [units, setUnits] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const childFirstName = child?.first_name || "Child";
  const childBalance = child.available_balance || 0;
  const minInvCents = selectedStrategyMinimum ? selectedStrategyMinimum * 100 : 0;
  const amountCents = units * minInvCents;
  const numAmount = amountCents / 100;
  const insufficient = amountCents > childBalance;

  useEffect(() => {
    fetchStrategies();
  }, []);

  async function fetchStrategies() {
    setLoading(true);
    setMinimumLoading(true);
    try {
      if (!supabase) return;
      const { data } = await supabase
        .from("strategies_c")
        .select("id, name, short_name, description, risk_level, sector, tags, min_investment, is_featured, holdings, strategy_metrics(*)")
        .eq("status", "active")
        .eq("is_kid_strategy", true)
        .order("is_featured", { ascending: false })
        .order("name");

      const rows = data || [];

      // Collect all holding symbols to fetch logos
      const allSymbols = [...new Set(
        rows.flatMap(s => (Array.isArray(s.holdings) ? s.holdings : []).map(h => h.symbol || h.ticker).filter(Boolean))
      )];
      let secMap = {};
      if (allSymbols.length > 0) {
        const { data: secs } = await supabase
          .from("securities_c")
          .select("symbol, name, logo_url")
          .in("symbol", allSymbols);
        (secs || []).forEach(s => { secMap[s.symbol] = s; });
      }

      // Fetch latest YTD returns from strategies_returns_c, newest row per strategy.
      const strategyIds = rows.map(s => s.id).filter(Boolean);
      const ytdById = {};
      if (strategyIds.length > 0) {
        const { data: returns } = await supabase
          .from("strategies_returns_c")
          .select("strategy_id, ytd_pct, as_of_date")
          .in("strategy_id", strategyIds)
          .order("as_of_date", { ascending: false });
        (returns || []).forEach((ret) => {
          if (!ytdById[ret.strategy_id]) {
            ytdById[ret.strategy_id] = {
              ytd: ret.ytd_pct != null ? Number(ret.ytd_pct) / 100 : null,
              as_of_date: ret.as_of_date,
            };
          }
        });
      }

      const enriched = rows.map(s => {
        const metrics = Array.isArray(s.strategy_metrics)
          ? [...s.strategy_metrics].sort((a, b) => (b.as_of_date || "").localeCompare(a.as_of_date || ""))[0]
          : s.strategy_metrics;
        const ytdData = ytdById[s.id];
        const r_ytd = ytdData?.ytd ?? metrics?.r_ytd ?? metrics?.r_ytd_pct ?? metrics?.r_1y ?? null;
        const ytd_as_of_date = ytdData?.as_of_date ?? metrics?.as_of_date ?? null;
        const holdingsList = (Array.isArray(s.holdings) ? s.holdings : [])
          .sort((a, b) => Number(b.weight || 0) - Number(a.weight || 0))
          .map(h => {
            const symbol = h.symbol || h.ticker;
            const security = secMap[symbol] || {};
            return {
              ...h,
              symbol,
              name: security.name || h.name || symbol,
              logo_url: security.logo_url || null,
            };
          });
        return { ...s, r_ytd, ytd_return: r_ytd, ytd_as_of_date, holdingsList };
      });

      setStrategies(enriched);

      // Calculate minimums for all strategies
      calculateAllStrategiesMinimums(enriched);
    } catch (e) { console.error("[child-invest] strategies", e); }
    finally { setLoading(false); }
  }

  function calculateAllStrategiesMinimums(strategies) {
    try {
      const minimums = {};
      for (const strategy of strategies) {
        minimums[strategy.id] = calculateMinInvestmentSync(strategy, new Map());
      }
      setStrategyMinimums(minimums);
    } catch (error) {
      console.error("Error calculating strategy minimums:", error);
    } finally {
      setMinimumLoading(false);
    }
  }

  async function handleInvest() {
    if (!selected) return;
    if (amountCents <= 0) { setError("Select a valid investment amount."); return; }
    if (insufficient) { setError("Insufficient funds in child's wallet."); return; }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/child-invest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          family_member_id: child.id,
          strategy_id: selected.id,
          amount: amountCents,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Investment failed."); return; }
      setSuccess(true);
      onInvest(json);
    } catch {
      setError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const filtered = strategies.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate minimum investment for selected strategy
  useEffect(() => {
    if (!selected || !supabase) {
      setSelectedStrategyMinimum(null);
      return;
    }

    const minValue = calculateMinInvestmentSync(selected, new Map());
    setSelectedStrategyMinimum(minValue);
  }, [selected]);

  useEffect(() => {
    if (!selected || step !== "preview") {
      setSelectedStrategyAnalytics(null);
      setSelectedStrategyAnalyticsLoading(false);
      setSelectedStrategyActiveLabel(null);
      return;
    }

    let isMounted = true;
    const fetchAnalytics = async () => {
      if (!supabase) {
        if (isMounted) setSelectedStrategyAnalytics(null);
        return;
      }

      setSelectedStrategyAnalyticsLoading(true);

      try {
        const strategyId = selected.id || selected.strategy_id;
        if (!strategyId) {
          setSelectedStrategyAnalytics(null);
          return;
        }

        const currentYear = new Date().getFullYear();
        const yearStart = `${currentYear}-01-01`;
        const { data: dailyReturns, error } = await supabase
          .from("strategies_returns_c")
          .select("strategy_id, as_of_date, \"1d_pct\"")
          .eq("strategy_id", strategyId)
          .gte("as_of_date", yearStart)
          .order("as_of_date", { ascending: true });

        if (error) throw error;

        if (!dailyReturns || dailyReturns.length === 0) {
          if (isMounted) setSelectedStrategyAnalytics(null);
          return;
        }

        const cumulativeData = [];
        let cumulative = 0;
        dailyReturns.forEach((day) => {
          const dailyReturn = day["1d_pct"] ? day["1d_pct"] / 100 : 0;
          cumulative += dailyReturn;
          cumulativeData.push({
            d: day.as_of_date,
            v: Number((cumulative * 100).toFixed(2)),
          });
        });

        if (isMounted) {
          setSelectedStrategyAnalytics({
            strategy_id: strategyId,
            as_of_date: dailyReturns[dailyReturns.length - 1].as_of_date,
            curves: { YTD: cumulativeData },
          });
        }
      } catch (e) {
        console.error("[child-invest] strategy analytics", e);
        if (isMounted) setSelectedStrategyAnalytics(null);
      } finally {
        if (isMounted) setSelectedStrategyAnalyticsLoading(false);
      }
    };

    fetchAnalytics();
    return () => {
      isMounted = false;
    };
  }, [selected, step]);

  const { previewChartData, previewChartDomain, previewBaseIndexValue } = useMemo(() => {
    const previewFallbackLength = 140;
    const curves = selectedStrategyAnalytics?.curves || {};
    const fallbackSeries = Array.from({ length: previewFallbackLength }, (_, index) => {
      const wave = Math.sin(index / 18) * 1.1 + Math.cos(index / 9) * 0.4;
      const drift = (index / previewFallbackLength) * 1.6;
      const noise = ((index % 7) - 3) * 0.03;
      return {
        d: new Date(Date.now() - (previewFallbackLength - index) * 86400000).toISOString(),
        v: Number((100 + wave + drift + noise).toFixed(2)),
      };
    });

    let series = Array.isArray(curves.YTD) && curves.YTD.length > 0 ? curves.YTD : fallbackSeries;
    if (series.length > 1) {
      const firstVal = series[0]?.v ?? 0;
      const lastVal = series[series.length - 1]?.v ?? 0;
      const firstDate = series[0]?.d ? new Date(series[0].d) : null;
      const lastDate = series[series.length - 1]?.d ? new Date(series[series.length - 1].d) : null;
      if (firstDate && lastDate && firstDate > lastDate) {
        series = [...series].reverse();
      } else if (firstVal > lastVal * 1.05) {
        series = [...series].reverse();
      }
    }

    const labelIndices = series.length ? [0, Math.floor(series.length / 2), series.length - 1] : [];
    const values = series.map((point) => point?.v ?? 0);
    const minValue = values.length ? Math.min(...values) : 0;
    const maxValue = values.length ? Math.max(...values) : 0;
    const padding = (maxValue - minValue) * 0.2;
    const domain = values.length ? [minValue - padding, maxValue + padding] : [0, 0];
    const mapped = series.map((point, index) => {
      const date = point?.d ? new Date(point.d) : null;
      const dateLabel = labelIndices.includes(index) && date
        ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : "";
      return {
        label: index + 1,
        dateLabel,
        returnPct: point?.v ?? 0,
      };
    });

    return {
      previewChartData: mapped,
      previewChartDomain: domain,
      previewBaseIndexValue: values.length ? values[0] : null,
    };
  }, [selectedStrategyAnalytics]);

  const getYtdPct = (strategy) => {
    if (strategy?.r_ytd == null) return null;
    const value = Number(strategy.r_ytd);
    if (!Number.isFinite(value)) return null;
    return Math.abs(value) > 1 ? value : value * 100;
  };

  const selectedYtdPct = getYtdPct(selected);
  const previewChartLineColor = (selectedYtdPct ?? 0) > 0
    ? "#16a34a"
    : (selectedYtdPct ?? 0) < 0
      ? "#dc2626"
      : "#94a3b8";

  const getPreviewTags = (strategy) => {
    const tags = Array.isArray(strategy?.tags)
      ? strategy.tags
      : typeof strategy?.tags === "string"
        ? strategy.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
        : [];
    return tags.length ? tags : [strategy?.risk_level || "Balanced", strategy?.sector].filter(Boolean);
  };

  const goBackOneStep = () => {
    setError("");
    if (step === "amount") {
      setStep("preview");
      return;
    }
    if (step === "preview") {
      setSelected(null);
      setStep("browse");
      setUnits(1);
    }
  };

  const closePreview = () => {
    setSelected(null);
    setStep("browse");
    setUnits(1);
    setError("");
  };

  const openFactsheet = () => {
    if (!selected || !onOpenFactsheet) return;
    onClose();
    onOpenFactsheet({
      ...selected,
      calculatedMinInvestment: selected.min_investment ? Math.round(selected.min_investment / 100) : null,
      holdingsWithLogos: (selected.holdingsList || []).map((h) => ({
        ...h,
        ticker: h.ticker || h.symbol,
        logo_url: h.logo_url || null,
      })),
    });
  };

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:border-violet-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 transition";

  if (selected && step === "preview") {
    return (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 overscroll-contain"
        style={{ paddingBottom: "calc(var(--navbar-height, 64px) + 8px)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <button
          type="button"
          className="absolute inset-0 h-full w-full cursor-default"
          aria-label="Close preview"
          onClick={closePreview}
        />
        <motion.div
          className="relative z-10 flex w-full max-w-sm flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl"
          style={{ maxHeight: "calc(90vh - var(--navbar-height, 64px) - 16px)" }}
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: "spring", stiffness: 380, damping: 38 }}
        >
          <button
            type="button"
            onClick={closePreview}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 z-10"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div className="flex items-start gap-3 mb-6">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-slate-900">{selected.name}</h2>
                <p className="text-sm text-slate-500">
                  {selectedStrategyMinimum ? `Min. R${selectedStrategyMinimum.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Calculating..."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-6">
              {selectedStrategyMinimum ? (
                <>
                  <p className="text-2xl font-semibold text-slate-900">R{selectedStrategyMinimum.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <span className="rounded-full px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-500">
                    Min. investment
                  </span>
                </>
              ) : null}
            </div>

            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>YTD return</span>
                <div className="flex flex-col items-end gap-1">
                  <span className={selectedYtdPct > 0 ? "text-emerald-600" : selectedYtdPct < 0 ? "text-rose-600" : "text-slate-500"}>
                    {selectedYtdPct != null ? `${selectedYtdPct >= 0 ? "+" : ""}${selectedYtdPct.toFixed(2)}%` : "-"}
                  </span>
                  {selected.ytd_as_of_date && (
                    <span className="text-[10px] text-slate-400">
                      {new Date(selected.ytd_as_of_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
              </div>
              <div className="h-44 w-full">
                {selectedStrategyAnalyticsLoading ? (
                  <div className="flex h-full items-end gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                    {[45, 65, 35, 80, 55, 70, 40, 90, 60, 50, 75, 85].map((h, i) => (
                      <div key={i} className="flex-1 rounded-sm bg-slate-200 animate-pulse" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={previewChartData}
                      margin={{ top: 12, right: 16, left: 8, bottom: 28 }}
                      onMouseMove={(state) => {
                        if (state?.activeLabel) setSelectedStrategyActiveLabel(state.activeLabel);
                      }}
                      onMouseLeave={() => setSelectedStrategyActiveLabel(null)}
                    >
                      <defs>
                        <linearGradient id={previewGradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={previewChartLineColor} stopOpacity={0.25} />
                          <stop offset="70%" stopColor={previewChartLineColor} stopOpacity={0.1} />
                          <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <ReferenceLine y={100} stroke="#e2e8f0" strokeDasharray="3 3" />
                      {selectedStrategyActiveLabel ? (
                        <>
                          <ReferenceLine
                            x={selectedStrategyActiveLabel}
                            stroke="#CBD5E1"
                            strokeOpacity={0.6}
                            strokeDasharray="3 3"
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#ffffff",
                              border: "none",
                              borderRadius: "20px",
                              padding: "3px 8px",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                            }}
                            labelStyle={{ display: "none" }}
                            formatter={(value) => {
                              if (!previewBaseIndexValue) return [`${Number(value).toFixed(2)}`, "Index"];
                              const delta = ((Number(value) - previewBaseIndexValue) / previewBaseIndexValue) * 100;
                              return [`${delta >= 0 ? "+" : ""}${delta.toFixed(2)}%`, "Change"];
                            }}
                            cursor={{ strokeDasharray: "3 3" }}
                          />
                        </>
                      ) : null}
                      <XAxis
                        dataKey="dateLabel"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        axisLine={{ stroke: "#e2e8f0" }}
                        tickLine={false}
                        height={24}
                      />
                      <YAxis hide domain={previewChartDomain} />
                      <Area
                        type="monotone"
                        dataKey="returnPct"
                        stroke="transparent"
                        fill={`url(#${previewGradientId})`}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="returnPct"
                        stroke={previewChartLineColor}
                        strokeWidth={2}
                        dot={false}
                        activeDot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {getPreviewTags(selected).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"
                >
                  {tag}
                </span>
              ))}
            </div>

            {selected.holdingsList?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Top Holdings</p>
                <div className="mt-3 space-y-2">
                  {selected.holdingsList.slice(0, 5).map((holding) => (
                    <div key={holding.symbol} className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-100 bg-white">
                        {holding.logo_url ? (
                          <img src={holding.logo_url} alt={holding.symbol} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs font-bold text-slate-600">
                            {holding.symbol?.substring(0, 2)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900">{holding.name || holding.symbol}</p>
                        <p className="text-xs text-slate-500">{holding.symbol}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 space-y-3">
              <button
                onClick={() => setStep("amount")}
                disabled={!selectedStrategyMinimum}
                className="w-full rounded-2xl bg-gradient-to-r from-[#5b21b6] to-[#7c3aed] py-4 font-semibold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Invest Now
              </button>
              <button
                onClick={openFactsheet}
                className="w-full rounded-2xl border border-slate-300 bg-white py-3 font-semibold text-slate-700 shadow-sm transition-all active:scale-95"
              >
                View Factsheet
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto"
        initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: "spring", stiffness: 380, damping: 38 }}
      >

        <div className="px-6 pt-3 pb-8 overflow-y-auto" style={{ maxHeight: "calc(85vh - 24px)" }}>
          {!success ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {selected && (
                    <button
                      onClick={goBackOneStep}
                      className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition active:scale-95 mr-1"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#a78bfa,#7c3aed)" }}>
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-900">
                      {step === "amount" ? "Invest Amount" : step === "preview" ? "Strategy Preview" : `Invest for ${childFirstName}`}
                    </p>
                    <p className="text-xs text-slate-400">
                      {selected ? selected.name : "Choose a strategy to invest in"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition active:scale-95"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Available balance pill */}
              <div className="flex items-center gap-2 rounded-xl bg-purple-50 border border-purple-100 px-4 py-2.5 mb-4">
                <Wallet className="h-3.5 w-3.5 text-purple-500" />
                <span className="text-xs font-semibold text-purple-600">{`${childFirstName}'s balance:`}</span>
                <span className="text-xs font-bold text-purple-800 ml-auto tabular-nums">{fmt(childBalance)}</span>
              </div>

              {/* Strategy list */}
              {step === "browse" && (
                <>
                  {/* Search */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="child-strategy-search"
                      name="child-strategy-search"
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search strategies..."
                      className={inputCls + " pl-10"}
                    />
                  </div>

                  {loading ? (
                    <div className="space-y-3">
                      {[0, 1].map(i => (
                        <div key={i} className="rounded-2xl border border-slate-100 bg-white p-4 space-y-3 animate-pulse">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-2 flex-1">
                              <div className="h-4 w-32 bg-slate-100 rounded" />
                              <div className="h-3 w-48 bg-slate-100 rounded" />
                              <div className="h-3 w-24 bg-slate-100 rounded" />
                            </div>
                            <div className="h-12 w-24 bg-slate-100 rounded-xl" />
                          </div>
                          <div className="flex gap-2">
                            <div className="h-6 w-16 bg-slate-100 rounded-full" />
                            <div className="h-6 w-20 bg-slate-100 rounded-full" />
                          </div>
                          <div className="h-9 bg-slate-50 rounded-xl" />
                        </div>
                      ))}
                    </div>
                  ) : filtered.length === 0 ? (
                    <p className="text-center text-sm text-slate-400 py-8">No strategies found.</p>
                  ) : (
                    <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-0.5">
                      {filtered.map((s) => {
                        const ytdPct = getYtdPct(s);
                        const isUp = (ytdPct ?? 0) >= 0;
                        return (
                          <button
                            key={s.id}
                            onClick={() => { setSelected(s); setStep("preview"); setUnits(1); setError(""); }}
                            className="w-full rounded-2xl border border-slate-100 bg-white shadow-sm p-4 text-left hover:shadow-md hover:border-violet-200 transition active:scale-[0.98]"
                          >
                            {/* Header row */}
                            <div className="flex items-start gap-3 mb-3">
                              <div className="flex-1 min-w-0 space-y-0.5">
                                <p className="text-sm font-semibold text-slate-900 truncate">{s.short_name || s.name}</p>
                                <p className="text-xs text-slate-500 line-clamp-1">
                                  {s.risk_level || "Balanced"}{s.description ? ` - ${s.description.substring(0, 60)}${s.description.length > 60 ? "..." : ""}` : ""}
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  {minimumLoading ? "Calculating..." : (strategyMinimums[s.id] ? `Min. R${strategyMinimums[s.id].toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—")}
                                </p>
                              </div>
                              {/* Sparkline */}
                              <div className="flex-shrink-0 rounded-xl bg-slate-50 px-2 py-1.5">
                                <svg width="64" height="32" viewBox="0 0 64 32">
                                  <defs>
                                    <linearGradient id={`sg-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor={isUp ? "#7c3aed" : "#e11d48"} stopOpacity="0.15" />
                                      <stop offset="100%" stopColor={isUp ? "#7c3aed" : "#e11d48"} stopOpacity="0" />
                                    </linearGradient>
                                  </defs>
                                  <polyline
                                    points="0,28 10,22 20,24 30,14 40,10 50,16 64,6"
                                    fill="none"
                                    stroke={isUp ? "#7c3aed" : "#e11d48"}
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <circle cx="64" cy="6" r="2.5" fill={isUp ? "#7c3aed" : "#e11d48"} />
                                </svg>
                              </div>
                            </div>
                            {/* Badges */}
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {s.risk_level && (
                                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-600">{s.risk_level}</span>
                              )}
                              {s.sector && (
                                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-600">{s.sector}</span>
                              )}
                              {s.is_featured && (
                                <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-600">Featured</span>
                              )}
                            </div>
                            {/* YTD return */}
                            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 mb-3">
                              <span className="text-xs font-semibold text-slate-600">YTD return</span>
                              <div className="flex items-center gap-2">
                                {ytdPct != null ? (
                                  <span className={`text-xs font-semibold ${isUp ? "text-emerald-600" : "text-red-500"}`}>
                                    {isUp ? "+" : ""}{ytdPct.toFixed(2)}%
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-400">-</span>
                                )}
                                {s.ytd_as_of_date && (
                                  <span className="text-[10px] text-slate-400">
                                    {new Date(s.ytd_as_of_date).toLocaleDateString("en-ZA", { month: "short", day: "numeric" })}
                                  </span>
                                )}
                              </div>
                            </div>
                            {/* Holdings snapshot */}
                            {s.holdingsList?.length > 0 && (
                              <div className="flex items-center gap-2">
                                <div className="flex -space-x-2">
                                  {s.holdingsList.slice(0, 3).map((h) => (
                                    <div key={h.symbol} className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white shadow-sm">
                                      {h.logo_url ? (
                                        <img src={h.logo_url} alt={h.symbol} className="h-full w-full object-cover" />
                                      ) : (
                                        <div className="flex h-full w-full items-center justify-center bg-slate-100 text-[8px] font-bold text-slate-600">
                                          {h.symbol?.substring(0, 2)}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  {s.holdingsList.length > 3 && (
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-semibold text-slate-500">
                                      +{s.holdingsList.length - 3}
                                    </div>
                                  )}
                                </div>
                                <span className="text-xs font-semibold text-slate-500">Holdings snapshot</span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Amount selection step */}
              {step === "amount" && selected && (
                <>
                  {/* Strategy info card */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 mb-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#ede9fe,#ddd6fe)" }}>
                        <BarChart3 className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900">{selected.short_name || selected.name}</p>
                        <p className="text-xs text-slate-500 mt-1">{selected.description?.substring(0, 60)}</p>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-slate-100">
                      <p className="text-xs text-slate-500 mb-1">Minimum investment</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {selectedStrategyMinimum ? `R${selectedStrategyMinimum.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Calculating..."}
                      </p>
                    </div>
                  </div>

                  {/* Amount selector */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 mb-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Investment Amount</p>
                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={() => setUnits(Math.max(1, units - 1))}
                        disabled={units <= 1 || !selectedStrategyMinimum}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        −
                      </button>
                      <div className="flex-1 text-center">
                        <p className="text-3xl font-bold text-slate-900 tabular-nums">
                          R{selectedStrategyMinimum && numAmount > 0 ? numAmount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">{units} unit{units !== 1 ? "s" : ""}</p>
                      </div>
                      <button
                        onClick={() => setUnits(units + 1)}
                        disabled={!selectedStrategyMinimum || insufficient}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Fee and total */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Subtotal</span>
                      <span className="font-semibold text-slate-900">R{selectedStrategyMinimum && numAmount > 0 ? numAmount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Total Due Today</span>
                      <span className="text-lg font-bold text-slate-900">R{selectedStrategyMinimum && numAmount > 0 ? numAmount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}</span>
                    </div>
                  </div>

                  {insufficient && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3 mb-4">
                      <p className="text-xs font-semibold text-red-700">Insufficient funds. {childFirstName} needs R{(numAmount - childBalance / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} more.</p>
                    </div>
                  )}

                  {/* Terms checkbox */}
                  <div className="flex items-start gap-3 mb-4">
                    <input
                      type="checkbox"
                      id="terms"
                      className="mt-1 h-5 w-5 rounded border-slate-300"
                    />
                    <label htmlFor="terms" className="text-xs text-slate-600">
                      <span className="font-semibold">I agree to Risk Disclosure, Fee Schedule & Strategy Mandate</span>
                      <p className="mt-1">By continuing, you confirm you have reviewed and agree to all terms and conditions</p>
                    </label>
                  </div>

                  {error && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3 mb-4">
                      <p className="text-xs font-semibold text-red-700">{error}</p>
                    </div>
                  )}

                  {/* Continue button */}
                  <button
                    onClick={handleInvest}
                    disabled={insufficient || amountCents <= 0 || saving || !selectedStrategyMinimum}
                    className="w-full rounded-2xl bg-purple-600 py-3.5 font-semibold text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {saving ? "Processing..." : "Continue"}
                  </button>
                </>
              )}

            </>
          ) : (
            <motion.div
              className="text-center py-4"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div className="h-16 w-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#e9d5ff,#d8b4fe)" }}>
                <Check className="h-8 w-8 text-purple-600" />
              </div>
              <p className="text-lg font-bold text-slate-900">Investment Placed!</p>
              <p className="text-sm text-slate-500 mt-2">
                {`R${numAmount.toFixed(2)} invested in ${selected?.name} for ${childFirstName}.`}
              </p>
              <button
                onClick={onClose}
                className="mt-6 w-full rounded-xl py-3.5 text-sm font-bold text-white active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)" }}
              >
                Done
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}




// --- TransactionRow ----------------------------------------------------------

function TransactionRow({ tx }) {
  const isCredit = tx.direction === "credit";
  const date = tx.created_at ? new Date(tx.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short" }) : "";
  return (
    <div className="flex items-center gap-3.5 py-3.5">
      <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-purple-100">
        {isCredit
          ? <ArrowDownLeft className="h-4.5 w-4.5 text-purple-600" />
          : <ArrowUpRight className="h-4.5 w-4.5 text-purple-600" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{tx.description || tx.name || "Transaction"}</p>
        <p className="text-[11px] text-slate-600 mt-0.5">{date}</p>
      </div>
      <p className="text-sm font-bold tabular-nums text-purple-600">
        {isCredit ? "+" : "-"}{fmt(Math.round(Math.abs(tx.amount || 0)))}
      </p>
    </div>
  );
}

// --- CompleteProfileModal ----------------------------------------------------


function CompleteProfileModal({ child, parentProfile, onUpdate, onClose }) {
  const poaComplete = !!child.poa_declaration_url;
  const agreementComplete = !!child.signed_agreement_url;
  const [step, setStep] = useState(() => {
    if (!child.id_number) return "id";
    if (!poaComplete) return "poa";
    if (!agreementComplete) return "agreement";
    // Nothing actually missing — fall back to agreement but caller should
    // never open the modal in this state (banner is gated on missingItems).
    return "agreement";
  });
  const [idInput, setIdInput] = useState("");
  const [idError, setIdError] = useState("");
  const [flowError, setFlowError] = useState("");
  const [saving, setSaving] = useState(false);

  const childName =
    [child.first_name, child.last_name].filter(Boolean).join(" ") || "your child";

  function verifyId(id) {
    const clean = String(id || "").replace(/\D/g, "");
    if (clean.length !== 13) return { ok: false, msg: "ID number must be exactly 13 digits." };
    if (child.date_of_birth) {
      const yy = clean.substring(0, 2);
      const mm = clean.substring(2, 4);
      const dd = clean.substring(4, 6);
      const y = parseInt(yy, 10);
      const fullYear = y <= new Date().getFullYear() % 100 ? `20${yy}` : `19${yy}`;
      const idDob = `${fullYear}-${mm}-${dd}`;
      if (idDob !== child.date_of_birth)
        return { ok: false, msg: "Date of birth in ID does not match the child's record." };
    }
    return { ok: true, clean };
  }

  async function handleIdSave() {
    const { ok, msg, clean } = verifyId(idInput);
    if (!ok) { setIdError(msg); return; }
    setSaving(true);
    setFlowError("");
    try {
      await fetch(`/api/family-members/${child.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_number: clean }),
      });
      onUpdate({ ...child, id_number: clean });
      if (!child.poa_declaration_url) { setStep("poa"); }
      else if (!child.signed_agreement_url) { setStep("agreement"); }
      else {
        // All steps already done - mark address_completed
        await fetch(`/api/family-members/${child.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address_completed: true }),
        });
        onUpdate({ ...child, id_number: clean, address_completed: true });
        onClose();
      }
    } catch { setIdError("Save failed. Please try again."); }
    finally { setSaving(false); }
  }

  async function handlePoaComplete({ livesWithParent, pdfBuffer, fileUpload, signedAt }) {
    setSaving(true);
    setFlowError("");
    try {
      let poaUrl = null;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token && pdfBuffer) {
        throw new Error("Session expired. Please sign in again.");
      }

      if (pdfBuffer) {
        // Use chunked fromCharCode to avoid freezing the JS thread on mobile
        const uint8 = new Uint8Array(pdfBuffer);
        const CHUNK = 0x8000;
        let bin = "";
        for (let i = 0; i < uint8.length; i += CHUNK) {
          bin += String.fromCharCode.apply(null, uint8.subarray(i, i + CHUNK));
        }
        const pdfBase64 = btoa(bin);
        const res = await fetchWithTimeout("/api/onboarding/upload-agreement", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ pdfBase64, subjectId: child.id }),
        }, 45000, "Upload is taking too long. Please check your connection and retry.");
        const j = await res.json();
        if (!res.ok || !j.publicUrl) {
          throw new Error(j?.error || "Failed to upload proof of address.");
        }
        poaUrl = j.publicUrl;
      } else if (fileUpload && supabase) {
        const safeName = fileUpload.name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");
        const path = `poa/${child.id}/${Date.now()}-${safeName}`;
        const { error: upErr } = await withTimeout(
          supabase.storage.from("birth-certificates").upload(path, fileUpload, { upsert: true }),
          45000,
          "Document upload is taking too long. Please check your connection and retry."
        );
        if (upErr) {
          throw new Error(upErr.message || "Failed to upload proof document.");
        }
        poaUrl = `storage://birth-certificates/${path}`;
      }
      if (poaUrl) {
        const patchRes = await fetchWithTimeout(`/api/family-members/${child.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            poa_declaration_url: poaUrl,
            address_completed: true,
          }),
        }, 30000, "Saving proof of address is taking too long. Please retry.");
        if (!patchRes.ok) {
          const patchJson = await patchRes.json().catch(() => ({}));
          throw new Error(patchJson?.error || "Failed to save proof of address.");
        }
        onUpdate({ ...child, poa_declaration_url: poaUrl, address_completed: true });
      }
      onClose();
    } catch (e) {
      console.error("[complete-poa]", e);
      const message = e?.message || "Proof of address upload failed. Please try again.";
      setFlowError(message);
      throw new Error(message);
    } finally { setSaving(false); }
  }

  async function handleAgreementComplete({ pdfBuffer, signedAt }) {
    setSaving(true);
    setFlowError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Session expired. Please sign in again.");

      const uint8 = new Uint8Array(pdfBuffer);
      const CHUNK = 0x8000;
      let bin = "";
      for (let i = 0; i < uint8.length; i += CHUNK) {
        bin += String.fromCharCode.apply(null, uint8.subarray(i, i + CHUNK));
      }
      const pdfBase64 = btoa(bin);
      const uploadRes = await fetchWithTimeout("/api/onboarding/upload-agreement", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pdfBase64, subjectId: child.id }),
      }, 45000, "Upload is taking too long. Please check your connection and retry.");
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok || !uploadJson.publicUrl) {
        throw new Error(uploadJson?.error || "Failed to upload signed agreement.");
      }

      const patchRes = await fetchWithTimeout(`/api/family-members/${child.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signed_agreement_url: uploadJson.publicUrl, signed_at: signedAt, address_completed: true }),
      }, 30000, "Saving signed agreement is taking too long. Please retry.");
      if (!patchRes.ok) {
        const patchJson = await patchRes.json().catch(() => ({}));
        throw new Error(patchJson?.error || "Failed to save signed agreement.");
      }

      onUpdate({ ...child, signed_agreement_url: uploadJson.publicUrl, address_completed: true });
      onClose();
    } catch (e) {
      console.error("[complete-agreement]", e);
      const message = e?.message || "Signing failed. Please try again.";
      setFlowError(message);
      throw new Error(message);
    } finally { setSaving(false); }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { if (!saving) onClose(); }} />
      <motion.div
        className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl max-h-[85vh] overflow-y-auto"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: "spring", stiffness: 380, damping: 38 }}
      >
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg,#8b5cf6,#6366f1)" }} />
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-slate-200" />
        </div>
        <div className="px-6 pt-2 pb-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#a78bfa,#7c3aed)" }}>
                <ClipboardList className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-900">Complete Profile</p>
                <p className="text-xs text-slate-400">
                  {step === "id" ? "Step 1 - ID number" :
                   step === "poa" ? "Proof of address" :
                   "Responsibility agreement"}
                </p>
              </div>
            </div>
            <button onClick={onClose} disabled={saving} className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition disabled:opacity-50">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {flowError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 mb-4">{flowError}</p>
          )}

          {/* Step: ID number */}
          {step === "id" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Please provide <strong>{`${childName}'s`}</strong> SA ID number to complete their profile.
              </p>
              <input
                id="child-id-number"
                name="child-id-number"
                type="text"
                inputMode="numeric"
                maxLength={13}
                value={idInput}
                onChange={(e) => { setIdInput(e.target.value.replace(/\D/g, "")); setIdError(""); }}
                placeholder="13-digit ID number"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:border-violet-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 transition"
              />
              {idError && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{idError}</p>
              )}
              <button
                onClick={handleIdSave}
                disabled={saving || idInput.length !== 13}
                className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)" }}
              >
                {saving ? "Saving..." : "Save & Continue"}
              </button>
            </div>
          )}

          {/* Step: POA */}
          {step === "poa" && (
            <MinorProofOfAddressDeclaration
              childData={child}
              parentProfile={parentProfile}
              saving={saving}
              onComplete={handlePoaComplete}
              onBack={() => {
                if (!child.id_number) setStep("id");
                else onClose();
              }}
            />
          )}

          {/* Step: Agreement */}
          {step === "agreement" && (
            <ChildResponsibilityAgreement
              parentProfile={parentProfile}
              childData={child}
              saving={saving}
              onBack={onClose}
              onComplete={handleAgreementComplete}
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// --- Main Page ---------------------------------------------------------------

export default function ChildDashboardPage({ child: initialChild, onBack, onOpenFactsheet }) {
  const { profile } = useProfile();
  const isMounted = useRef(true);
  const [child, setChild] = useState(initialChild);
  const [holdings, setHoldings] = useState([]);
  const [strategyMap, setStrategyMap] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [parentBalance, setParentBalance] = useState(null);
  const [parentBalanceLoading, setParentBalanceLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showTransfer, setShowTransfer] = useState(false);
  const [openingTransfer, setOpeningTransfer] = useState(false);
  const [showInvest, setShowInvest] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [goals, setGoals] = useState([]);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [newGoal, setNewGoal] = useState({ name: "", target_amount: "", target_date: "" });
  const [childFriendlyStrategies, setChildFriendlyStrategies] = useState([]);
  const [childFriendlyMinimums, setChildFriendlyMinimums] = useState({});
  const [childFriendlyLoading, setChildFriendlyLoading] = useState(true);
  const [kycNotice, setKycNotice] = useState("");

  const childName = [child?.first_name, child?.last_name].filter(Boolean).join(" ") || "Child";
  const age = getAge(child?.date_of_birth);
  const parentName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "Parent";
  const parentMintNumber = profile?.mintNumber || "";
  const childBalance = child?.available_balance || 0;
  const childKyc = getChildKycState(child);

  const poaDone = !!child?.poa_declaration_url;
  const missingItems = [
    !child?.id_number && "ID number",
    !poaDone && "proof of address",
    !child?.signed_agreement_url && "responsibility agreement",
  ].filter(Boolean);
  // Derive from the actual fields rather than the address_completed flag —
  // onboarding flows don't always set that flag, so we'd otherwise show the
  // "Complete profile" prompt even when every doc is signed.
  const isProfileIncomplete = missingItems.length > 0;

  useEffect(() => {
    isMounted.current = true;
    fetchAll();
    return () => { isMounted.current = false; };
  }, [child?.id]);

  useEffect(() => {
    if (showGoalsModal && child?.id) {
      fetchGoals();
    }
  }, [showGoalsModal, child?.id]);

  useEffect(() => {
    fetchChildFriendlyStrategies();
  }, []);

  async function fetchChildFriendlyStrategies() {
    if (!supabase) return;
    setChildFriendlyLoading(true);
    try {
      const { data } = await supabase
        .from("strategies_c")
        .select("id, name, short_name, description, risk_level, sector, tags, min_investment, is_featured, holdings, strategy_metrics(*)")
        .eq("status", "active")
        .eq("is_kid_strategy", true)
        .order("is_featured", { ascending: false })
        .order("name");

      const rows = data || [];

      // Collect all holding symbols to fetch logos
      const allSymbols = [...new Set(
        rows.flatMap(s => (Array.isArray(s.holdings) ? s.holdings : []).map(h => h.symbol || h.ticker).filter(Boolean))
      )];
      let secMap = {};
      if (allSymbols.length > 0) {
        const { data: secs } = await supabase
          .from("securities_c")
          .select("symbol, name, logo_url")
          .in("symbol", allSymbols);
        (secs || []).forEach(s => { secMap[s.symbol] = s; });
      }

      const enriched = rows.map(s => {
        const metrics = Array.isArray(s.strategy_metrics)
          ? [...s.strategy_metrics].sort((a, b) => (b.as_of_date || "").localeCompare(a.as_of_date || ""))[0]
          : s.strategy_metrics;
        const r_ytd = metrics?.r_ytd ?? metrics?.r_ytd_pct ?? metrics?.r_1y ?? null;
        const ytd_as_of_date = metrics?.as_of_date ?? null;
        const holdingsList = (Array.isArray(s.holdings) ? s.holdings : [])
          .sort((a, b) => Number(b.weight || 0) - Number(a.weight || 0))
          .map(h => {
            const symbol = h.symbol || h.ticker;
            const security = secMap[symbol] || {};
            return {
              ...h,
              symbol,
              name: security.name || h.name || symbol,
              logo_url: security.logo_url || null,
            };
          });
        return { ...s, r_ytd, ytd_as_of_date, holdingsList };
      });

      if (isMounted.current) {
        setChildFriendlyStrategies(enriched);
      }

      // Calculate minimums for all strategies
      if (enriched.length > 0) {
        calculateAllChildFriendlyMinimums(enriched);
      }
    } catch (e) {
      console.error("[child-dash] fetchChildFriendlyStrategies error", e);
    } finally {
      if (isMounted.current) {
        setChildFriendlyLoading(false);
      }
    }
  }

  async function calculateAllChildFriendlyMinimums(strategies) {
    if (!supabase) return;
    try {
      const minimums = {};
      for (const strategy of strategies) {
        minimums[strategy.id] = calculateMinInvestmentSync(strategy, new Map());
      }

      if (isMounted.current) {
        setChildFriendlyMinimums(minimums);
      }
    } catch (error) {
      console.error("Error calculating child-friendly minimums:", error);
    }
  }

  async function fetchAll() {
    setLoading(true);
    try {
      await withTimeout(
        Promise.allSettled([
          fetchHoldings(),
          fetchParentWallet(),
          fetchTransactions(),
          fetchChildBalance(),
          fetchChildProfile(),
        ]),
        12000,
        "Child dashboard load timed out"
      );
    } catch (e) {
      console.error("[child-dash] fetchAll error", e);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }

  async function fetchChildBalance() {
    try {
      const res = await fetchWithTimeout(
        `/api/child-wallet?family_member_id=${child.id}`,
        {},
        8000,
        "Child wallet balance timed out"
      );
      const json = await res.json();
      if (json.balance !== undefined && isMounted.current) {
        setChild(prev => ({ ...prev, available_balance: json.balance }));
      }
    } catch (e) { console.error("[child-dash] balance", e); }
  }

  async function fetchChildProfile() {
    try {
      if (!supabase || !child?.id) return;
      const { data, error } = await supabase
        .from("family_members")
        .select("id, available_balance, certificate_verification_status, kyc_status, kyc_pending, certificate_url, updated_at, id_number, poa_declaration_url, signed_agreement_url, signed_at, address_completed")
        .eq("id", child.id)
        .maybeSingle();
      if (error) throw error;
      if (data && isMounted.current) {
        const nextChild = { ...child, ...data };
        setChild(prev => ({ ...prev, ...data }));
        return nextChild;
      }
    } catch (e) {
      console.error("[child-dash] child profile", e);
    }
    return child;
  }

  async function fetchHoldings() {
    try {
      if (!supabase) return;
      const linkedUserId = child?.linked_user_id || null;
      const holdingsSelect = "id, user_id, family_member_id, security_id, quantity, avg_fill, market_value, unrealized_pnl, strategy_id, Fill_date, Status";
      const familyHoldingsQuery = supabase
        .from("stock_holdings_c")
        .select(holdingsSelect)
        .eq("family_member_id", child.id)
        .eq("Status", "active")
        .order("market_value", { ascending: false });
      const linkedHoldingsQuery = linkedUserId
        ? supabase
            .from("stock_holdings_c")
            .select(holdingsSelect)
            .eq("user_id", linkedUserId)
            .eq("Status", "active")
            .order("market_value", { ascending: false })
        : Promise.resolve({ data: [], error: null });

      const [familyHoldingsRes, linkedHoldingsRes] = await Promise.all([
        familyHoldingsQuery,
        linkedHoldingsQuery,
      ]);

      if (familyHoldingsRes.error) { console.error("[child-dash] family holdings query error", familyHoldingsRes.error); return; }
      if (linkedHoldingsRes.error) { console.error("[child-dash] linked holdings query error", linkedHoldingsRes.error); return; }

      const rowsById = new Map();
      [...(familyHoldingsRes.data || []), ...(linkedHoldingsRes.data || [])].forEach((row) => {
        if (row?.id) rowsById.set(row.id, row);
      });
      const baseRows = Array.from(rowsById.values())
        .sort((a, b) => Number(b.market_value || 0) - Number(a.market_value || 0));

      // Enrich with security info (symbol/name/logo_url live on securities_c)
      const securityIds = [...new Set(baseRows.map(h => h.security_id).filter(Boolean))];
      let secMap = {};
      if (securityIds.length > 0) {
        const { data: secs } = await supabase
          .from("securities_c")
          .select("id, symbol, name, logo_url, last_price")
          .in("id", securityIds);
        (secs || []).forEach(s => { secMap[s.id] = s; });
      }
      const rows = baseRows.map(h => {
        const sec = secMap[h.security_id] || {};
        return { ...h, symbol: sec.symbol || null, name: sec.name || null, logo_url: sec.logo_url || null, last_price: sec.last_price ?? null };
      });
      if (isMounted.current) setHoldings(rows);

      // Fetch strategy names for any strategy holdings
      const stratIds = [...new Set(rows.map(h => h.strategy_id).filter(Boolean))];
      if (stratIds.length > 0) {
        const { data: strats } = await supabase
          .from("strategies_c")
          .select("id, name, short_name, risk_level, is_featured")
          .in("id", stratIds);
        const map = {};
        (strats || []).forEach(s => { map[s.id] = s; });
        if (isMounted.current) setStrategyMap(map);
      }
    } catch (e) { console.error("[child-dash] holdings", e); }
  }

  async function fetchParentWallet() {
    setParentBalanceLoading(true);
    try {
      if (!supabase) return;
      const userId = (await supabase.auth.getUser())?.data?.user?.id;
      if (!userId) return;
      const { data } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();
      const balanceRands = Number(data?.balance || 0);
      const balanceCents = Math.round(balanceRands * 100);
      if (isMounted.current) setParentBalance(balanceCents);
    } catch (e) {
      console.error("[child-dash] parent wallet", e);
    } finally {
      if (isMounted.current) setParentBalanceLoading(false);
    }
  }

  async function openTransferModal() {
    setOpeningTransfer(true);
    await Promise.all([fetchParentWallet(), fetchChildBalance(), fetchChildProfile()]);
    if (isMounted.current) {
      setShowTransfer(true);
      setOpeningTransfer(false);
    }
  }

  async function openInvestModal() {
    const latestChild = await fetchChildProfile();
    const latestKyc = getChildKycState(latestChild);
    if (!latestKyc.verified) {
      setKycNotice(CHILD_KYC_PENDING_MESSAGE);
      window.setTimeout(() => {
        if (isMounted.current) setKycNotice("");
      }, 5000);
      return;
    }
    setKycNotice("");
    setShowInvest(true);
  }

  async function fetchTransactions() {
    try {
      if (!supabase) return;
      const linkedUserId = child?.linked_user_id || null;
      const familyTxQuery = supabase
        .from("transactions")
        .select("id, user_id, family_member_id, name, direction, amount, description, created_at, transaction_date")
        .eq("family_member_id", child.id)
        .order("created_at", { ascending: false })
        .limit(10);
      const linkedTxQuery = linkedUserId
        ? supabase
            .from("transactions")
            .select("id, user_id, family_member_id, name, direction, amount, description, created_at, transaction_date")
            .eq("user_id", linkedUserId)
            .order("created_at", { ascending: false })
            .limit(10)
        : Promise.resolve({ data: [], error: null });

      const [familyTxRes, linkedTxRes] = await Promise.all([familyTxQuery, linkedTxQuery]);
      if (familyTxRes.error) { console.error("[child-dash] family txns query error", familyTxRes.error); return; }
      if (linkedTxRes.error) { console.error("[child-dash] linked txns query error", linkedTxRes.error); return; }

      const txById = new Map();
      [...(familyTxRes.data || []), ...(linkedTxRes.data || [])].forEach((tx) => {
        if (tx?.id) txById.set(tx.id, tx);
      });
      const mergedTransactions = Array.from(txById.values())
        .sort((a, b) => new Date(b.created_at || b.transaction_date || 0) - new Date(a.created_at || a.transaction_date || 0))
        .slice(0, 10);
      if (isMounted.current) setTransactions(mergedTransactions);
    } catch (e) { console.error("[child-dash] txns", e); }
  }

  function handleTransferDone(result) {
    if (result.child_balance !== undefined) {
      setChild(prev => ({ ...prev, available_balance: result.child_balance }));
    }
    if (result.parent_balance !== undefined) {
      setParentBalance(result.parent_balance);
    }
    fetchTransactions();
    fetchHoldings();
  }

  function handleInvestDone(result) {
    if (result.child_balance !== undefined) {
      setChild(prev => ({ ...prev, available_balance: result.child_balance }));
    }
    fetchHoldings();
    fetchTransactions();
  }

  async function fetchGoals() {
    if (!child?.id) return;
    setLoadingGoals(true);
    try {
      let query = supabase
        .from("investment_goals")
        .select("id, name, target_amount, current_amount, is_active, target_date")
        .eq("family_member_id", child.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (profile?.id) query = query.eq("user_id", profile.id);

      const { data, error } = await query;
      if (error) throw error;
      if (isMounted.current) setGoals(data || []);
    } catch (error) {
      console.error("[child-dash] goal fetch error", error);
      if (isMounted.current) setGoals([]);
    } finally {
      if (isMounted.current) setLoadingGoals(false);
    }
  }

  function resetGoalForm() {
    setNewGoal({ name: "", target_amount: "", target_date: "" });
    setEditingGoalId(null);
    setIsCreatingGoal(false);
  }

  function closeGoalsModal() {
    setShowGoalsModal(false);
    resetGoalForm();
  }

  function handleEditClick(goal) {
    setNewGoal({
      name: goal.name,
      target_amount: goal.target_amount,
      target_date: goal.target_date || "",
    });
    setEditingGoalId(goal.id);
    setIsCreatingGoal(true);
    setShowGoalsModal(true);
  }

  async function handleCreateGoal(e) {
    e.preventDefault();
    if (!newGoal.name || !newGoal.target_amount || !child?.id || !profile?.id) return;

    setLoadingGoals(true);
    try {
      const { error } = await supabase.from("investment_goals").insert({
        user_id: profile.id,
        family_member_id: child.id,
        name: newGoal.name,
        target_amount: parseFloat(newGoal.target_amount),
        target_date: newGoal.target_date || null,
        current_amount: 0,
        is_active: true,
      });

      if (error) throw error;

      setNewGoal({ name: "", target_amount: "", target_date: "" });
      setIsCreatingGoal(false);
      fetchGoals();
    } catch (error) {
      console.error("[child-dash] goal create error", error);
    } finally {
      setLoadingGoals(false);
    }
  }

  async function handleUpdateGoal(e) {
    e.preventDefault();
    if (!editingGoalId) return;

    setLoadingGoals(true);
    try {
      const updatePayload = {
        name: newGoal.name,
        target_amount: parseFloat(newGoal.target_amount),
        target_date: newGoal.target_date || null,
      };
      const { error } = await supabase
        .from("investment_goals")
        .update(updatePayload)
        .eq("id", editingGoalId)
        .eq("family_member_id", child.id);

      if (error) throw error;
      resetGoalForm();
      fetchGoals();
    } catch (error) {
      console.error("[child-dash] goal update error", error);
    } finally {
      setLoadingGoals(false);
    }
  }

  async function handleDeleteGoal(goalId) {
    if (!window.confirm("Are you sure you want to delete this goal?")) return;
    setLoadingGoals(true);
    try {
      const { error } = await supabase
        .from("investment_goals")
        .delete()
        .eq("id", goalId)
        .eq("family_member_id", child.id);
      if (error) throw error;
      resetGoalForm();
      fetchGoals();
    } catch (error) {
      console.error("[child-dash] goal delete error", error);
    } finally {
      setLoadingGoals(false);
    }
  }

  const isHoldingFilled = (holding) => Number(holding.avg_fill || 0) > 0 && !!holding.Fill_date;
  const getHoldingMarketValueCents = (holding) => {
    if (!isHoldingFilled(holding)) return 0;
    const quantity = Number(holding.quantity || 0);
    const livePriceCents = Number(holding.last_price || 0) > 0
      ? Math.round(Number(holding.last_price) * 100)
      : 0;
    if (livePriceCents > 0 && quantity > 0) {
      return Math.round(livePriceCents * quantity);
    }
    return Math.round(Number(holding.market_value || 0));
  };
  const getHoldingCostCents = (holding) => {
    if (!isHoldingFilled(holding)) return 0;
    return Math.round(Number(holding.avg_fill || 0) * Number(holding.quantity || 0));
  };

  const totalPortfolioCents = holdings.reduce((s, h) => s + getHoldingMarketValueCents(h), 0);


  // Group holdings by strategy
  const strategyGroups = holdings.reduce((acc, h) => {
    if (!h.strategy_id) return acc;
    if (!acc[h.strategy_id]) acc[h.strategy_id] = [];
    acc[h.strategy_id].push(h);
    return acc;
  }, {});

  const strategyCards = Object.entries(strategyGroups).map(([sid, hs]) => {
    const strat = strategyMap[sid] || {};
    const isFilling = hs.some((h) => !isHoldingFilled(h));
    const totalValueCents = isFilling ? 0 : hs.reduce((s, h) => s + getHoldingMarketValueCents(h), 0);
    const totalCostCents = isFilling ? 0 : hs.reduce((s, h) => s + getHoldingCostCents(h), 0);
    const pnlCents = totalValueCents - totalCostCents;
    const pnlP = totalCostCents > 0 ? (pnlCents / totalCostCents) * 100 : 0;
    return { id: sid, name: strat.name || "Strategy", short_name: strat.short_name, risk_level: strat.risk_level, is_featured: strat.is_featured, totalValue: totalValueCents, pnl: pnlCents, pnlPct: pnlP, holdings: hs, isFilling };
  });

  // Best performing individual assets (top 5 by unrealized_pnl %)
  const bestAssets = [...holdings]
    .filter(h => h.symbol && isHoldingFilled(h) && getHoldingMarketValueCents(h) > 0)
    .map(h => {
      const costCents = getHoldingCostCents(h);
      const marketCents = getHoldingMarketValueCents(h);
      const pnlCents = marketCents - costCents;
      const pnlR = pnlCents / 100;
      const pnlP = costCents > 0 ? (pnlCents / costCents) * 100 : 0;
      return { ...h, pnlR, pnlP };
    })
    .sort((a, b) => b.pnlP - a.pnlP)
    .slice(0, 5);



  return (
    <div
      className="min-h-screen pb-[env(safe-area-inset-bottom)]"
      style={{
        backgroundColor: "#f8f6fa",
        backgroundImage: "linear-gradient(180deg,#0d0d12 0%,#0e0a14 0.5%,#100b18 1%,#120c1c 1.5%,#150e22 2%,#181028 2.5%,#1c122f 3%,#201436 3.5%,#25173e 4%,#2a1a46 5%,#301d4f 6%,#362158 7%,#3d2561 8%,#44296b 9%,#4c2e75 10%,#54337f 11%,#5d3889 12%,#663e93 13%,#70449d 14%,#7a4aa7 15%,#8451b0 16%,#8e58b9 17%,#9860c1 18%,#a268c8 19%,#ac71ce 20%,#b57ad3 21%,#be84d8 22%,#c68edc 23%,#cd98e0 24%,#d4a2e3 25%,#daace6 26%,#dfb6e9 27%,#e4c0eb 28%,#e8c9ed 29%,#ecd2ef 30%,#efdaf1 31%,#f2e1f3 32%,#f4e7f5 33%,#f6ecf7 34%,#f8f0f9 35%,#f9f3fa 36%,#faf5fb 38%,#fbf7fc 40%,#fcf9fd 42%,#fdfafd 45%,#faf8fc 55%,#f8f6fa 100%)",
        backgroundRepeat: "no-repeat",
        backgroundSize: "100% 100vh",
        backgroundAttachment: "fixed",
      }}
    >
      {/* -- Header -- */}
      <div className="px-4 pt-12 pb-6">
        <div className="mx-auto w-full max-w-sm md:max-w-md">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 backdrop-blur-md text-slate-700 border border-slate-200 shadow-sm transition hover:bg-white active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1" />
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="rounded-[28px] bg-white/95 p-5 shadow-xl border border-white/70">
                <div className="flex items-center justify-between mb-8">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
                <Skeleton className="h-10 w-40 mb-8" />
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-12 rounded-2xl" />
                  <Skeleton className="h-12 rounded-2xl" />
                </div>
              </div>
            ) : (
              <SwipeableBalanceCard
                userId={null}
                familyMemberId={child?.id || null}
                mintNumber={parentMintNumber || null}
                overrideBalance={totalPortfolioCents / 100}
                overrideWalletBalance={childBalance / 100}
              />
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-sm px-4 pb-12 md:max-w-md">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">

          {/* -- Incomplete profile banner -- */}
          {isProfileIncomplete && (
            <motion.div variants={item}>
              <button
                onClick={() => setShowCompleteModal(true)}
                className="w-full flex items-center gap-3 rounded-2xl px-4 py-4 text-left transition active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg,#fef3c7,#fef9c3)", border: "1px solid #fde68a" }}
              >
                <div className="h-9 w-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="h-4.5 w-4.5 text-amber-600" style={{ height: "1.125rem", width: "1.125rem" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-amber-800">{`Complete ${childName}'s profile`}</p>
                  <p className="text-xs text-amber-700 mt-0.5 truncate">
                    Missing: {missingItems.join(", ")}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-amber-600 flex-shrink-0" />
              </button>
            </motion.div>
          )}

          {kycNotice && (
            <motion.div variants={item}>
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-amber-800 shadow-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p className="text-xs font-semibold leading-relaxed">{kycNotice}</p>
              </div>
            </motion.div>
          )}

          {/* Quick Actions */}
          <motion.div variants={item}>
            <div className="grid grid-cols-4 gap-2 text-[11px] font-medium">
              {[
                { label: "Learn", icon: BookOpen, onClick: null, comingSoon: true },
                { label: "Invest", icon: LayoutGrid, onClick: openInvestModal },
                { label: "Deposit", icon: ArrowDownToLine, onClick: openTransferModal, disabled: openingTransfer },
                { label: "Goals", icon: Target, onClick: () => setShowGoalsModal(true) },
              ].map((btn, i) => {
                const Icon = btn.icon;
                return (
                  <button
                    key={i}
                    disabled={btn.comingSoon || btn.disabled}
                    onClick={btn.onClick}
                    className={`relative flex flex-col items-center gap-2 rounded-2xl px-1 py-3 transition-all ${
                      btn.comingSoon
                        ? "bg-slate-100/70 cursor-not-allowed border border-slate-200/60"
                        : "bg-white shadow-md active:scale-95 active:shadow-sm"
                    } disabled:opacity-60`}
                    type="button"
                  >
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      btn.comingSoon ? "bg-slate-200 text-slate-400" : "bg-violet-50 text-violet-700"
                    }`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className={`text-center leading-tight font-medium ${
                      btn.comingSoon ? "text-slate-400" : "text-slate-700"
                    }`}>
                      {btn.disabled && !btn.comingSoon ? "Loading..." : btn.label}
                    </span>
                    {btn.comingSoon && (
                      <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 inline-flex items-center px-1.5 py-px rounded-full text-[7px] font-bold uppercase tracking-wider text-white" style={{ background: "linear-gradient(90deg,#7c3aed,#a855f7)" }}>Soon</span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* -- Child Friendly Strategies -- */}
          {childFriendlyStrategies.length > 0 && (
            <motion.div variants={item}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="h-2 w-2 rounded-full bg-green-300" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Child Friendly Strategies</p>
              </div>

              {childFriendlyLoading ? (
                <div className="space-y-3">
                  {[0, 1].map((i) => (
                    <div key={i} className="rounded-2xl border border-slate-200 bg-white shadow-md p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
                          <div className="space-y-2 min-w-0">
                            <Skeleton className="h-4 w-32" />
                            <div className="flex gap-1.5">
                              <Skeleton className="h-5 w-14 rounded-full" />
                              <Skeleton className="h-5 w-16 rounded-full" />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2 flex-shrink-0">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                        <div className="flex -space-x-2">
                          {[0, 1, 2].map((idx) => (
                            <Skeleton key={idx} className="h-7 w-7 rounded-full border-2 border-white" />
                          ))}
                        </div>
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {childFriendlyStrategies.map((strategy) => (
                    <button
                      key={strategy.id}
                      onClick={openInvestModal}
                      className="w-full rounded-2xl border border-slate-200 bg-white shadow-md p-4 text-left transition hover:shadow-lg active:scale-[0.98]"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: "linear-gradient(135deg,#dcfce7,#bbf7d0)" }}>
                            <BarChart3 className="h-5 w-5 text-green-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{strategy.short_name || strategy.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {strategy.risk_level && (
                                <span className="text-[10px] font-semibold rounded-full px-2 py-0.5 bg-violet-50 text-violet-600 border border-violet-100">{strategy.risk_level}</span>
                              )}
                              {strategy.is_featured && (
                                <span className="text-[10px] font-semibold rounded-full px-2 py-0.5 bg-violet-100 text-violet-700">Featured</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-slate-900 tabular-nums">
                            {childFriendlyMinimums[strategy.id] ? `R${childFriendlyMinimums[strategy.id].toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "..."}
                          </p>
                          <p className="text-[10px] font-semibold text-slate-500">Min. invest</p>
                        </div>
                      </div>
                      {strategy.holdingsList?.length > 0 && (
                        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                          <div className="flex -space-x-2">
                            {strategy.holdingsList.slice(0, 4).map(h => (
                              <div key={h.symbol} className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white shadow-sm">
                                {h.logo_url ? (
                                  <img src={h.logo_url} alt={h.symbol} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-slate-100 text-[8px] font-bold text-slate-600">
                                    {h.symbol?.substring(0, 2)}
                                  </div>
                                )}
                              </div>
                            ))}
                            {strategy.holdingsList.length > 4 && (
                              <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-semibold text-slate-500">
                                +{strategy.holdingsList.length - 4}
                              </div>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">{strategy.holdingsList.length} holding{strategy.holdingsList.length !== 1 ? "s" : ""}</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* -- Strategy Holdings -- */}
          <motion.div variants={item}>
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="h-2 w-2 rounded-full bg-slate-300" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Strategies</p>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[0, 1].map((i) => (
                  <div key={i} className="rounded-2xl border border-slate-200 bg-white shadow-md p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
                        <div className="space-y-2 min-w-0">
                          <Skeleton className="h-4 w-32" />
                          <div className="flex gap-1.5">
                            <Skeleton className="h-5 w-14 rounded-full" />
                            <Skeleton className="h-5 w-16 rounded-full" />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2 flex-shrink-0">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                      <div className="flex -space-x-2">
                        {[0, 1, 2].map((idx) => (
                          <Skeleton key={idx} className="h-7 w-7 rounded-full border-2 border-white" />
                        ))}
                      </div>
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : strategyCards.length > 0 ? (
              <div className="space-y-3">
                {strategyCards.map((sc) => {
                  const isUp = sc.pnl >= 0;
                  const cardClass = sc.isFilling
                    ? "rounded-2xl border border-amber-200 bg-white shadow-md p-4 opacity-60 animate-pulse"
                    : "rounded-2xl border border-slate-200 bg-white shadow-md p-4";
                  return (
                    <div key={sc.id} className={cardClass}>
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: "linear-gradient(135deg,#ede9fe,#ddd6fe)" }}>
                            <BarChart3 className="h-5 w-5 text-purple-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{sc.short_name || sc.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {sc.risk_level && (
                                <span className="text-[10px] font-semibold rounded-full px-2 py-0.5 bg-violet-50 text-violet-600 border border-violet-100">{sc.risk_level}</span>
                              )}
                              {sc.is_featured && (
                                <span className="text-[10px] font-semibold rounded-full px-2 py-0.5 bg-violet-100 text-violet-700">Featured</span>
                              )}
                              {sc.isFilling && (
                                <span className="text-[10px] font-semibold rounded-full px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-200">Filling strategy</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {sc.isFilling ? (
                            <>
                              <p className="text-sm font-bold text-amber-700">Pending</p>
                              <p className="text-xs font-semibold text-amber-600">Filling strategy</p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-bold text-slate-900 tabular-nums">{fmt(sc.totalValue)}</p>
                              <p className={`text-xs font-semibold tabular-nums ${isUp ? "text-emerald-600" : "text-red-500"}`}>
                                {isUp ? "+" : ""}{fmt(sc.pnl)} ({isUp ? "+" : ""}{sc.pnlPct.toFixed(2)}%)
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Holdings avatar row */}
                      {sc.holdings.length > 0 && (
                        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                          <div className="flex -space-x-2">
                            {sc.holdings.slice(0, 4).map(h => (
                              <div key={h.id} className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white shadow-sm">
                                {h.logo_url ? (
                                  <img src={h.logo_url} alt={h.symbol} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-slate-100 text-[8px] font-bold text-slate-600">
                                    {h.symbol?.substring(0, 2)}
                                  </div>
                                )}
                              </div>
                            ))}
                            {sc.holdings.length > 4 && (
                              <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-semibold text-slate-500">
                                +{sc.holdings.length - 4}
                              </div>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">{sc.holdings.length} holding{sc.holdings.length !== 1 ? "s" : ""}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 p-8 text-center shadow-lg bg-white">
                <div className="h-16 w-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#e9d5ff,#d8b4fe)" }}>
                  <BarChart3 className="h-7 w-7 text-purple-600" />
                </div>
                <p className="text-sm font-bold text-slate-900">No investments yet</p>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {`Start investing on ${childName}'s behalf to build their future portfolio.`}
                </p>
                <button
                  onClick={openInvestModal}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-purple-600 hover:text-purple-700 transition"
                >
                  <BarChart3 className="h-4 w-4" /> Browse Strategies
                </button>
              </div>
            )}
          </motion.div>

          {/* -- Best Performing Assets -- */}
          {loading ? (
            <motion.div variants={item}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="h-2 w-2 rounded-full bg-emerald-200" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Best Performing Assets</p>
              </div>
              <div className="flex gap-3 overflow-hidden pb-1 -mx-4 px-4">
                {[0, 1].map((i) => (
                  <div key={i} className="flex min-w-[220px] flex-shrink-0 items-center gap-3 rounded-2xl bg-white border border-slate-100 shadow-md p-3.5">
                    <Skeleton className="h-11 w-11 rounded-xl flex-shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-14" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : bestAssets.length > 0 && (
            <motion.div variants={item}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Best Performing Assets</p>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 snap-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {bestAssets.map(a => {
                  const isUp = a.pnlR >= 0;
                  return (
                    <div key={a.id} className="flex min-w-[220px] flex-shrink-0 snap-start items-center gap-3 rounded-2xl bg-white border border-slate-100 shadow-md p-3.5">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
                        {a.logo_url ? (
                          <img src={a.logo_url} alt={a.name} className="h-9 w-9 object-contain" />
                        ) : (
                          <span className="text-[10px] font-bold text-slate-600">{a.symbol?.substring(0, 3)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{a.symbol}</p>
                        <p className="text-[10px] text-slate-500 truncate">{a.name}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-bold tabular-nums ${isUp ? "text-emerald-500" : "text-red-500"}`}>
                          {isUp ? "+" : ""}{fmt(Math.round(a.pnlR * 100))}
                        </p>
                        <p className={`text-[10px] font-semibold tabular-nums ${isUp ? "text-emerald-500" : "text-red-500"}`}>
                          ({isUp ? "+" : ""}{a.pnlP.toFixed(2)}%)
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* -- Recent Activity -- */}
          <motion.div variants={item}>
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="h-2 w-2 rounded-full bg-slate-300" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Recent Activity</p>
            </div>

            {loading ? (
              <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-white">
                <div className="divide-y divide-slate-100 px-5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3 py-4">
                      <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              </div>
            ) : transactions.length > 0 ? (
              <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-white">
                <div className="divide-y divide-slate-100 px-5">
                  {transactions.map((tx) => (
                    <TransactionRow key={tx.id} tx={tx} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 p-6 text-center shadow-lg bg-white">
                <p className="text-xs text-slate-600">No activity yet. Transfer or invest to get started.</p>
              </div>
            )}
          </motion.div>

          {/* -- Account Info -- */}
          <motion.div variants={item}>
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="h-2 w-2 rounded-full bg-slate-300" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Account Details</p>
            </div>
            <div className="rounded-2xl shadow-lg border border-slate-200 p-5 bg-white">
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Account Type</span>
                  <span className="font-semibold text-slate-900">Child (Minor)</span>
                </div>
                {child?.mint_number && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Mint Number</span>
                    <span className="font-mono text-xs font-semibold text-slate-900">{child.mint_number}</span>
                  </div>
                )}
                {age !== null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Age</span>
                    <span className="font-semibold text-slate-900">{age} year{age !== 1 ? "s" : ""}</span>
                  </div>
                )}
                {child?.date_of_birth && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Date of Birth</span>
                    <span className="font-semibold text-slate-900">
                      {new Date(child.date_of_birth).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm border-t border-slate-100 pt-4">
                  <span className="text-slate-600">Managed By</span>
                  <span className="font-semibold text-slate-900">{parentName}</span>
                </div>
                {parentMintNumber && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Parent Mint #</span>
                    <span className="font-mono text-xs font-semibold text-slate-900">{parentMintNumber}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">KYC Status</span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide border ${childKyc.className}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${childKyc.pulse ? "animate-pulse" : ""}`} style={{ backgroundColor: "currentColor" }} />
                    {childKyc.label}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

        </motion.div>
      </div>

      {/* -- Modals -- */}
      <AnimatePresence>
        {showTransfer && (
          <TransferModal
            child={child}
            parentBalance={parentBalance}
            balancesLoading={parentBalanceLoading}
            onTransfer={handleTransferDone}
            onClose={() => setShowTransfer(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showInvest && (
          <InvestModal
            child={child}
            onInvest={handleInvestDone}
            onClose={() => setShowInvest(false)}
            onOpenFactsheet={onOpenFactsheet}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showCompleteModal && (
          <CompleteProfileModal
            child={child}
            parentProfile={profile}
            onUpdate={(updated) => setChild(updated)}
            onClose={() => setShowCompleteModal(false)}
          />
        )}
      </AnimatePresence>
      {showGoalsModal && (
        <div className="fixed inset-0 z-[950] flex items-end justify-center bg-slate-900/60 px-4 pb-20 sm:items-center sm:pb-0">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default backdrop-blur-sm"
            aria-label="Close modal"
            onClick={closeGoalsModal}
          />
          <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-[32px] bg-white shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-center pt-3">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>
            <div className="p-6">
              <header className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingGoalId ? "Edit Goal" : (isCreatingGoal || goals.length === 0) ? "New Goal" : "Your Goals"}
                </h2>
                <button
                  type="button"
                  onClick={closeGoalsModal}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </header>

              <div className="max-h-[60vh] overflow-y-auto pr-1">
                {loadingGoals ? (
                  <div className="space-y-4">
                    {[0, 1].map((i) => (
                      <div key={i} className="rounded-2xl border border-slate-100 p-4 space-y-3">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                        <Skeleton className="h-2 w-full rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : isCreatingGoal || editingGoalId || goals.length === 0 ? (
                  <form onSubmit={editingGoalId ? handleUpdateGoal : handleCreateGoal} className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">Goal Name</label>
                      <input
                        id="child-goal-name"
                        name="child-goal-name"
                        type="text"
                        placeholder="e.g. New Car, Holiday"
                        value={newGoal.name}
                        onChange={(e) => setNewGoal(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">Target Amount (R)</label>
                      <input
                        id="child-goal-target"
                        name="child-goal-target"
                        type="number"
                        placeholder="0.00"
                        value={newGoal.target_amount}
                        onChange={(e) => setNewGoal(prev => ({ ...prev, target_amount: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">Target Date (Optional)</label>
                      <input
                        id="child-goal-date"
                        name="child-goal-date"
                        type="date"
                        value={newGoal.target_date}
                        onChange={(e) => setNewGoal(prev => ({ ...prev, target_date: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                      />
                    </div>
                    <div className="flex flex-col gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={loadingGoals}
                        className="w-full rounded-2xl bg-[#31005e] py-4 font-bold uppercase tracking-widest text-white shadow-lg transition-active active:scale-95"
                      >
                        {editingGoalId ? "Update Goal" : "Save Goal"}
                      </button>
                      {editingGoalId && (
                        <button
                          type="button"
                          onClick={() => handleDeleteGoal(editingGoalId)}
                          className="w-full rounded-2xl bg-rose-50 py-4 text-xs font-bold uppercase tracking-widest text-rose-600 transition-active active:scale-95"
                        >
                          Delete Goal
                        </button>
                      )}
                      {goals.length > 0 && !editingGoalId && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingGoal(false);
                            setNewGoal({ name: "", target_amount: "", target_date: "" });
                          }}
                          className="w-full rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    {goals.map((goal) => {
                      const progress = goal.target_amount > 0
                        ? Math.min(100, ((goal.current_amount || 0) / goal.target_amount) * 100)
                        : 0;
                      const left = Math.max(0, (goal.target_amount || 0) - (goal.current_amount || 0));
                      return (
                        <div key={goal.id} className="group relative rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                          <div className="mb-3 flex items-start justify-between">
                            <div>
                              <h3 className="font-bold text-slate-900">{goal.name}</h3>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Target: R{Number(goal.target_amount).toLocaleString()}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleEditClick(goal)}
                              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:bg-violet-50 hover:text-violet-600"
                            >
                              <FileSignature size={18} />
                            </button>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                              <span className="text-violet-600">{Math.round(progress)}% Complete</span>
                              <span className="text-slate-300">R{left.toLocaleString()} Left</span>
                            </div>
                            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-violet-600 to-purple-500 rounded-full transition-all duration-1000"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setIsCreatingGoal(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 py-4 text-sm font-bold text-slate-400 transition-all hover:border-violet-300 hover:bg-violet-50 active:scale-95"
                    >
                      <Plus size={18} />
                      <span>Add New Goal</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
