import React, { useState, useMemo, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowLeft, Wallet, BarChart3, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Area, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "../lib/supabase.js";
import { calculateMinInvestmentSync, buildHoldingsBySymbol, getHoldingsArray, normalizeSymbol, getAdjustedShares } from "../lib/strategyUtils";

const BROKER_FEE_RATE = 0.0025;
const ISIN_FEE_PER_ASSET = 69;
const TRANSACTION_FEE_RATE = 0.038;
const CASH_BUFFER_RATE = 0.08;

export default function ChildInvestModal({
  child,
  strategy,
  initialStep = "preview",
  onClose,
  onOpenFactsheet,
}) {
  const gradientId = useId();
  const [step, setStep] = useState(initialStep);
  const [units, setUnits] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feeExpanded, setFeeExpanded] = useState(false);

  const [minimum, setMinimum] = useState(strategy?.calculatedMinInvestment || null);
  const [minimumLoading, setMinimumLoading] = useState(!strategy?.calculatedMinInvestment);

  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [activeLabel, setActiveLabel] = useState(null);

  const childBalance = child?.available_balance || 0;
  const childFirstName = child?.first_name || "Child";

  const minInvCents = minimum ? minimum * 100 : 0;
  const baseAmountCents = units * minInvCents;
  const baseAmount = baseAmountCents / 100;

  const numAssets = useMemo(() => {
    const list = getHoldingsArray(strategy);
    return Array.isArray(list) ? list.length : 0;
  }, [strategy]);

  const fees = useMemo(() => {
    const bufferedBase = baseAmount * (1 + CASH_BUFFER_RATE);
    const brokerAmount = bufferedBase * BROKER_FEE_RATE;
    const isinTotal = ISIN_FEE_PER_ASSET * numAssets;
    const transactionAmount = bufferedBase * TRANSACTION_FEE_RATE;
    const totalCost = bufferedBase + brokerAmount + isinTotal + transactionAmount;
    return { bufferedBase, brokerAmount, isinTotal, transactionAmount, totalCost };
  }, [baseAmount, numAssets]);

  const totalCostCents = Math.round(fees.totalCost * 100);
  const insufficient = totalCostCents > childBalance;

  useEffect(() => {
    if (strategy?.calculatedMinInvestment) {
      setMinimum(strategy.calculatedMinInvestment);
      setMinimumLoading(false);
      return;
    }
    if (!strategy || !supabase) { setMinimumLoading(false); return; }
    setMinimumLoading(true);
    (async () => {
      try {
        const holdings = getHoldingsArray(strategy);
        const symbols = [...new Set(holdings.map(h => h.symbol || h.ticker).filter(Boolean))];
        let secMap = {};
        if (symbols.length > 0) {
          const { data } = await supabase.from("securities_c").select("symbol, last_price").in("symbol", symbols);
          (data || []).forEach(s => { secMap[s.symbol] = s; });
        }
        const hMap = buildHoldingsBySymbol(Object.values(secMap).filter(s => s.last_price != null));
        setMinimum(calculateMinInvestmentSync(strategy, hMap));
      } catch { setMinimum(null); } finally { setMinimumLoading(false); }
    })();
  }, [strategy]);

  useEffect(() => {
    if (step !== "preview" || !strategy || !supabase) return;
    let mounted = true;
    setAnalyticsLoading(true);
    (async () => {
      try {
        const strategyId = strategy.id || strategy.strategy_id;
        if (!strategyId) return;
        const yearStart = `${new Date().getFullYear()}-01-01`;
        const { data } = await supabase
          .from("strategies_returns_c")
          .select("strategy_id, as_of_date, \"1d_pct\"")
          .eq("strategy_id", strategyId)
          .gte("as_of_date", yearStart)
          .order("as_of_date", { ascending: true });
        if (!mounted || !data?.length) return;
        let cumulative = 0;
        const curves = { YTD: data.map(d => { cumulative += (d["1d_pct"] || 0) / 100; return { d: d.as_of_date, v: Number((cumulative * 100).toFixed(2)) }; }) };
        if (mounted) setAnalytics({ curves });
      } catch { } finally { if (mounted) setAnalyticsLoading(false); }
    })();
    return () => { mounted = false; };
  }, [step, strategy]);

  const { chartData, chartDomain, chartBaseValue } = useMemo(() => {
    const fallbackLen = 140;
    const fallback = Array.from({ length: fallbackLen }, (_, i) => ({
      d: new Date(Date.now() - (fallbackLen - i) * 86400000).toISOString(),
      v: Number((100 + Math.sin(i / 18) * 1.1 + (i / fallbackLen) * 1.6).toFixed(2)),
    }));
    let series = analytics?.curves?.YTD?.length ? analytics.curves.YTD : fallback;
    const labelIndices = [0, Math.floor(series.length / 2), series.length - 1];
    const values = series.map(p => p.v ?? 0);
    const min = Math.min(...values); const max = Math.max(...values);
    const pad = (max - min) * 0.2;
    const mapped = series.map((p, i) => {
      const date = p.d ? new Date(p.d) : null;
      return {
        label: i + 1,
        dateLabel: labelIndices.includes(i) && date ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "",
        returnPct: p.v ?? 0,
      };
    });
    return { chartData: mapped, chartDomain: [min - pad, max + pad], chartBaseValue: values[0] ?? null };
  }, [analytics]);

  const ytdNum = strategy?.r_ytd != null ? (Math.abs(strategy.r_ytd) <= 1 ? strategy.r_ytd * 100 : strategy.r_ytd) : null;
  const lineColor = (ytdNum ?? 0) > 0 ? "#16a34a" : (ytdNum ?? 0) < 0 ? "#dc2626" : "#94a3b8";

  async function handleInvest() {
    if (baseAmountCents <= 0) { setError("Select a valid investment amount."); return; }
    if (insufficient) { setError("Insufficient funds in child's wallet."); return; }
    setSaving(true); setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch("/api/child-invest", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          family_member_id: child.id,
          strategy_id: strategy.id,
          amount: totalCostCents,
          base_amount: baseAmountCents,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Investment failed."); return; }
      setStep("success");
    } catch { setError("Something went wrong."); } finally { setSaving(false); }
  }

  const portalTarget = document.getElementById("modal-root") || document.body;

  const tags = Array.isArray(strategy?.tags) && strategy.tags.length > 0
    ? strategy.tags
    : [strategy?.risk_level, strategy?.sector].filter(Boolean);

  const holdings = useMemo(() => {
    const hArr = getHoldingsArray(strategy);
    return hArr.map(h => {
      const sym = h.ticker || h.symbol || h;
      return { ...h, symbol: sym, name: h.name || sym, logo_url: h.logo_url || null };
    });
  }, [strategy]);

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
      <motion.div
        className="relative flex w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl"
        style={{ maxHeight: "90vh" }}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="h-1 w-10 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            {step === "amount" && (
              <button
                type="button"
                onClick={() => setStep("preview")}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition active:scale-95"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
            )}
            <h2 className="text-base font-semibold text-slate-900">
              {step === "success" ? "Investment Placed" : step === "amount" ? "Invest Amount" : (strategy?.short_name || strategy?.name)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === "success" && (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6">
            <motion.div className="text-center py-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}>
              <div className="h-16 w-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#e9d5ff,#d8b4fe)" }}>
                <Check className="h-8 w-8 text-purple-600" />
              </div>
              <p className="text-sm text-slate-500 mt-4">
                {`R${baseAmount.toFixed(2)} invested in ${strategy?.name} for ${childFirstName}.`}
              </p>
              <button onClick={onClose} className="mt-6 w-full rounded-xl py-3.5 text-sm font-bold text-white active:scale-[0.98]" style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)" }}>
                Done
              </button>
            </motion.div>
          </div>
        )}

        {step === "preview" && (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6" style={{ WebkitOverflowScrolling: "touch" }}>
            <div className="flex items-center gap-2 rounded-xl bg-purple-50 border border-purple-100 px-4 py-2.5 mb-5">
              <Wallet className="h-3.5 w-3.5 text-purple-500" />
              <span className="text-xs font-semibold text-purple-600">{childFirstName}'s balance:</span>
              <span className="text-xs font-bold text-purple-800 ml-auto tabular-nums">
                R{(childBalance / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {minimum && (
              <div className="flex items-center gap-3 mb-5">
                <p className="text-2xl font-semibold text-slate-900">R{minimum.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <span className="rounded-full px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-500">Min. investment</span>
              </div>
            )}

            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>YTD return</span>
                <div className="flex flex-col items-end gap-1">
                  <span className={ytdNum > 0 ? "text-emerald-600" : ytdNum < 0 ? "text-rose-600" : "text-slate-500"}>
                    {ytdNum != null ? `${ytdNum >= 0 ? "+" : ""}${ytdNum.toFixed(2)}%` : "—"}
                  </span>
                  {strategy?.ytd_as_of_date && (
                    <span className="text-[10px] text-slate-400">{new Date(strategy.ytd_as_of_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  )}
                </div>
              </div>
              <div className="h-44 w-full">
                {analyticsLoading ? (
                  <div className="flex h-full items-end gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                    {[45, 65, 35, 80, 55, 70, 40, 90, 60, 50, 75, 85].map((h, i) => (
                      <div key={i} className="flex-1 rounded-sm bg-slate-200 animate-pulse" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 12, right: 16, left: 8, bottom: 28 }} onMouseMove={s => s?.activeLabel && setActiveLabel(s.activeLabel)} onMouseLeave={() => setActiveLabel(null)}>
                      <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={lineColor} stopOpacity={0.25} />
                          <stop offset="70%" stopColor={lineColor} stopOpacity={0.1} />
                          <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <ReferenceLine y={100} stroke="#e2e8f0" strokeDasharray="3 3" />
                      {activeLabel && <ReferenceLine x={activeLabel} stroke="#CBD5E1" strokeOpacity={0.6} strokeDasharray="3 3" />}
                      {activeLabel && (
                        <Tooltip
                          contentStyle={{ backgroundColor: "#ffffff", border: "none", borderRadius: "20px", padding: "3px 8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
                          labelStyle={{ display: "none" }}
                          formatter={v => { if (!chartBaseValue) return [`${Number(v).toFixed(2)}`, "Index"]; const d = ((Number(v) - chartBaseValue) / chartBaseValue) * 100; return [`${d >= 0 ? "+" : ""}${d.toFixed(2)}%`, "Change"]; }}
                          cursor={{ strokeDasharray: "3 3" }}
                        />
                      )}
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} height={24} />
                      <YAxis hide domain={chartDomain} />
                      <Area type="monotone" dataKey="returnPct" stroke="transparent" fill={`url(#${gradientId})`} dot={false} />
                      <Line type="monotone" dataKey="returnPct" stroke={lineColor} strokeWidth={2} dot={false} activeDot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {tags.map(tag => (
                  <span key={tag} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">{tag}</span>
                ))}
              </div>
            )}

            {holdings.slice(0, 5).length > 0 && (
              <div className="mt-4 mb-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Top Holdings</p>
                <div className="space-y-2">
                  {holdings.slice(0, 5).map(h => (
                    <div key={h.symbol} className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-100 bg-white">
                        {h.logo_url ? <img src={h.logo_url} alt={h.symbol} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs font-bold text-slate-600">{h.symbol?.substring(0, 2)}</div>}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900">{h.name}</p>
                        <p className="text-xs text-slate-500">{h.symbol}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 space-y-3">
              <button
                onClick={() => setStep("amount")}
                disabled={!minimum}
                className="w-full rounded-2xl bg-gradient-to-r from-[#5b21b6] to-[#7c3aed] py-4 font-semibold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Invest Now
              </button>
              {onOpenFactsheet && (
                <button
                  onClick={() => { onClose(); onOpenFactsheet(strategy); }}
                  className="w-full rounded-2xl border border-slate-300 bg-white py-3 font-semibold text-slate-700 shadow-sm transition-all active:scale-95"
                >
                  View Factsheet
                </button>
              )}
            </div>
          </div>
        )}

        {step === "amount" && (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6" style={{ WebkitOverflowScrolling: "touch" }}>
            <div className="flex items-center gap-2 rounded-xl bg-purple-50 border border-purple-100 px-4 py-2.5 mb-4">
              <Wallet className="h-3.5 w-3.5 text-purple-500" />
              <span className="text-xs font-semibold text-purple-600">{childFirstName}'s balance:</span>
              <span className="text-xs font-bold text-purple-800 ml-auto tabular-nums">
                R{(childBalance / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 mb-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#ede9fe,#ddd6fe)" }}>
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{strategy?.short_name || strategy?.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{strategy?.description?.substring(0, 60)}</p>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Minimum investment</p>
                <p className="text-sm font-semibold text-slate-900">
                  {minimumLoading ? "Calculating..." : minimum ? `R${minimum.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Investment Amount</p>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setUnits(u => Math.max(1, u - 1))}
                  disabled={units <= 1 || !minimum}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition text-xl font-semibold leading-none"
                >
                  −
                </button>
                <div className="flex-1 text-center">
                  <p className="text-3xl font-bold text-slate-900 tabular-nums">
                    R{minimum && baseAmount > 0 ? baseAmount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{units} unit{units !== 1 ? "s" : ""}</p>
                </div>
                <button
                  onClick={() => setUnits(u => u + 1)}
                  disabled={!minimum || insufficient}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  +
                </button>
              </div>
            </div>

            <div className="mb-4 rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
              <button type="button" onClick={() => setFeeExpanded(v => !v)} className="w-full flex items-center justify-between p-4">
                <h3 className="text-xs font-semibold text-slate-600">Fee Breakdown</h3>
                {feeExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>
              {feeExpanded && (
                <div className="px-4 pb-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <p className="text-xs text-slate-600">Investment Amount</p>
                      <span className="text-xs text-slate-400" title="Includes 8% cash reserve">*</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-900">R{fees.bufferedBase.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-600">Broker Fee (0.25%)</p>
                    <p className="text-xs font-semibold text-slate-900">R{fees.brokerAmount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-600">Custody Fee (R{ISIN_FEE_PER_ASSET.toFixed(2)} × {numAssets} asset{numAssets !== 1 ? "s" : ""})</p>
                    <p className="text-xs font-semibold text-slate-900">R{fees.isinTotal.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-600">Transaction Fee (3.8%)</p>
                    <p className="text-xs font-semibold text-slate-900">R{fees.transactionAmount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-700">Total Due Today</p>
                <p className="text-sm font-bold text-slate-900">R{fees.totalCost.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>

            {insufficient && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 mb-4">
                <p className="text-xs font-semibold text-red-700">
                  Insufficient funds. {childFirstName} needs R{(fees.totalCost - childBalance / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} more.
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 mb-4">
                <p className="text-xs font-semibold text-red-700">{error}</p>
              </div>
            )}

            <button
              onClick={handleInvest}
              disabled={insufficient || baseAmountCents <= 0 || saving || !minimum}
              className="w-full rounded-2xl bg-purple-600 py-3.5 font-semibold text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {saving ? "Processing..." : "Confirm Investment"}
            </button>
          </div>
        )}
      </motion.div>
      </motion.div>
    </AnimatePresence>,
    portalTarget
  );
}
