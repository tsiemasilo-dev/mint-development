import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, X, ChevronDown, ChevronUp, Download, Wallet, BarChart3 } from "lucide-react";
import { formatCurrency } from "../lib/formatCurrency";
import PdfViewer from "./PdfViewer";
import { supabase } from "../lib/supabase.js";
import { calculateMinInvestmentSync, buildHoldingsBySymbol, getHoldingsArray } from "../lib/strategyUtils";
import GiftToggleV2 from "./GiftToggleV2";

const BROKER_FEE_RATE = 0.0025;
const ISIN_FEE_PER_ASSET = 69;
const TRANSACTION_FEE_RATE = 0.038;
const CASH_BUFFER_RATE = 0.08;
const MONTHLY_STRATEGY_FEE = 29;

function firstBillingDate() {
  const d = new Date();
  const day = d.getDate();
  d.setMonth(d.getMonth() + 1);
  if (d.getDate() < day) d.setDate(0);
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
}

const fmt = (n) => Number(n).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AdultInvestModal({
  isOpen,
  onClose,
  strategy,
  onContinue,
}) {
  const currency = strategy?.currency || "R";
  const isAdditionalStrategy = !!strategy?.isAdditionalStrategy;

  const [minimum, setMinimum] = useState(null);
  const [minimumLoading, setMinimumLoading] = useState(false);
  const [units, setUnits] = useState(1);
  const [feeExpanded, setFeeExpanded] = useState(false);
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [showMandateModal, setShowMandateModal] = useState(false);
  const [walletBalance, setWalletBalance] = useState(null);
  const [isGift, setIsGift] = useState(false);

  // Load minimum + wallet balance when opened
  useEffect(() => {
    if (!isOpen) return;
    setUnits(1);
    setFeeExpanded(false);
    setAgreementChecked(false);
    setShowMandateModal(false);

    // Fetch wallet balance
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        const { data } = await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (data) setWalletBalance(data.balance ?? 0);
      } catch { /* ignore */ }
    })();

    // Resolve minimum investment
    const preCalc = strategy?.calculatedMinInvestment || strategy?.min_investment;
    if (preCalc) {
      setMinimum(preCalc);
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
  }, [isOpen, strategy]);

  const holdingsData = strategy?.holdingsWithLogos || strategy?.holdings || [];
  const numAssets = holdingsData.length || 0;

  // Amount = units × minimum
  const baseAmount = units * (minimum || 0);

  const fees = useMemo(() => {
    const bufferedBase = baseAmount * (1 + CASH_BUFFER_RATE);
    const brokerAmount = bufferedBase * BROKER_FEE_RATE;
    const isinTotal = ISIN_FEE_PER_ASSET * numAssets;
    const transactionAmount = bufferedBase * TRANSACTION_FEE_RATE;
    const totalCost = bufferedBase + brokerAmount + isinTotal + transactionAmount;
    return { bufferedBase, brokerAmount, isinTotal, transactionAmount, totalCost };
  }, [baseAmount, numAssets]);

  const totalCostCents = Math.round(fees.totalCost * 100);
  const insufficient = walletBalance !== null && fees.totalCost > walletBalance;

  const handleConfirm = () => {
    const sharePrice = strategy?.price_per_share || strategy?.pricePerShare || null;
    const shareCount = sharePrice && sharePrice > 0 ? Math.floor(baseAmount / sharePrice) : null;
    onContinue?.(fees.totalCost, baseAmount, shareCount, fees);
  };

  const portalTarget = document.getElementById("modal-root") || document.body;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="adult-invest-backdrop"
            className="fixed inset-0"
            style={{ zIndex: 9998, background: "rgba(15,10,30,0.65)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="adult-invest-sheet"
            className="fixed inset-x-0 bottom-0 mx-auto flex w-full max-w-md flex-col rounded-t-[28px] bg-white shadow-2xl overflow-hidden"
            style={{ zIndex: 9999, maxHeight: "92dvh", paddingBottom: "env(safe-area-inset-bottom)" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            {/* Gradient accent strip */}
            <div className="h-1 w-full flex-shrink-0" style={{ background: "linear-gradient(90deg,#7c3aed,#6366f1,#8b5cf6)" }} />

            {/* Drag handle */}
            <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
              <div className="h-[3px] w-9 rounded-full bg-slate-200" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
              <div>
                <h2 className="text-[15px] font-bold text-slate-900 leading-tight">Confirm Investment</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">{strategy?.short_name || strategy?.name}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pb-5" style={{ WebkitOverflowScrolling: "touch" }}>

              {/* Strategy Card */}
              <div className="mb-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl overflow-hidden">
                    <img
                      src="https://s3-symbol-logo.tradingview.com/country/ZA--big.svg"
                      alt="ZA"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{strategy?.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                      {strategy?.description?.split(".")[0] || "Investment strategy"}
                    </p>
                  </div>
                </div>
                {/* Holdings avatars */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <div className="flex items-center -space-x-2">
                    {holdingsData.slice(0, 3).map((h) => {
                      const sym = h.ticker || h.symbol || h;
                      return (
                        <div key={sym} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-200 overflow-hidden flex-shrink-0">
                          {h.logo_url ? (
                            <img src={h.logo_url} alt={sym} className="h-full w-full object-cover" onError={e => { e.target.style.display = "none"; e.target.parentElement.textContent = String(sym).charAt(0); }} />
                          ) : (
                            <span className="text-[9px] font-bold text-slate-500">{String(sym).charAt(0)}</span>
                          )}
                        </div>
                      );
                    })}
                    {holdingsData.length > 3 && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-300 text-white text-[9px] font-bold flex-shrink-0">
                        +{holdingsData.length - 3}
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">Holdings snapshot</span>
                </div>
              </div>

              {/* Stat chips */}
              <div className="flex gap-3 mb-4">
                <div className="flex-1 rounded-2xl p-3.5 border border-slate-100" style={{ background: "linear-gradient(135deg,#f5f3ff,#ede9fe)" }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Wallet className="h-3 w-3 text-purple-400" />
                    <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wide">My balance</p>
                  </div>
                  <p className="text-base font-bold text-purple-900 tabular-nums">
                    {walletBalance === null ? "…" : `R${fmt(walletBalance)}`}
                  </p>
                </div>
                <div className="flex-1 rounded-2xl p-3.5 border border-slate-100 bg-white">
                  <div className="flex items-center gap-1.5 mb-1">
                    <BarChart3 className="h-3 w-3 text-indigo-400" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Min. per basket</p>
                  </div>
                  <p className="text-base font-bold text-slate-900 tabular-nums">
                    {minimumLoading ? "…" : minimum ? `R${fmt(minimum * (1 + CASH_BUFFER_RATE))}` : "—"}
                  </p>
                </div>
              </div>

              {/* Amount stepper */}
              <div className="rounded-3xl border border-slate-100 bg-white shadow-sm p-5 mb-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mb-4">Investment Amount</p>
                <div className="flex items-center justify-center gap-5 mb-3">
                  <button
                    type="button"
                    onClick={() => setUnits(u => Math.max(1, u - 1))}
                    disabled={units <= 1 || !minimum}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 text-xl font-semibold disabled:opacity-30 disabled:cursor-not-allowed active:scale-90 transition-all shadow-sm"
                  >
                    −
                  </button>
                  <div className="flex-1 text-center">
                    <p className="text-4xl font-black text-slate-900 tabular-nums tracking-tight">
                      {minimum && fees.bufferedBase > 0 ? `R${fmt(fees.bufferedBase)}` : "R0.00"}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {units} basket{units !== 1 ? "s" : ""} × R{minimum ? fmt(minimum * (1 + CASH_BUFFER_RATE)) : "0.00"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUnits(u => u + 1)}
                    disabled={!minimum || insufficient}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl text-white text-xl font-semibold disabled:opacity-30 disabled:cursor-not-allowed active:scale-90 transition-all shadow-md"
                    style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)" }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Fee breakdown */}
              <div className="mb-4 rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setFeeExpanded(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3.5"
                >
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Fee Breakdown</span>
                  <div className="flex items-center gap-2">
                    {feeExpanded ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                  </div>
                </button>
                {feeExpanded && (
                  <div className="px-4 pb-3 space-y-2.5 border-t border-slate-50">
                    <div className="pt-3 flex justify-between">
                      <p className="text-xs text-slate-500">Investment + 8% reserve</p>
                      <p className="text-xs font-semibold text-slate-800">R{fmt(fees.bufferedBase)}</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-xs text-slate-500">Broker fee (0.25%)</p>
                      <p className="text-xs font-semibold text-slate-800">R{fmt(fees.brokerAmount)}</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-xs text-slate-500">Custody (R{ISIN_FEE_PER_ASSET} × {numAssets})</p>
                      <p className="text-xs font-semibold text-slate-800">R{fmt(fees.isinTotal)}</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-xs text-slate-500">Transaction fee (3.8%)</p>
                      <p className="text-xs font-semibold text-slate-800">R{fmt(fees.transactionAmount)}</p>
                    </div>
                    {isAdditionalStrategy && (
                      <div className="flex justify-between pt-1 border-t border-dashed border-violet-100">
                        <div>
                          <p className="text-xs text-violet-700 font-medium">Monthly Strategy Fee</p>
                          <p className="text-[10px] text-violet-500">From {firstBillingDate()}</p>
                        </div>
                        <p className="text-xs font-semibold text-violet-700">R{fmt(MONTHLY_STRATEGY_FEE)}/month</p>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-3.5 border-t border-slate-100" style={{ background: "linear-gradient(135deg,#f5f3ff,#ede9fe)" }}>
                  <p className="text-xs font-bold text-purple-700">Total Due Today</p>
                  <p className="text-base font-black text-purple-900">R{fmt(fees.totalCost)}</p>
                </div>
              </div>

              {/* Insufficient funds warning */}
              {insufficient && (
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 mb-4 flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                  <p className="text-xs font-semibold text-red-600">
                    Insufficient wallet balance — please top up before investing.
                  </p>
                </div>
              )}

              {/* Agreement */}
              <div className="mb-4 rounded-2xl border border-slate-100 bg-white p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreementChecked}
                    onChange={e => setAgreementChecked(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 flex-shrink-0"
                  />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      I agree to Risk Disclosure, Fee Schedule &{" "}
                      <button
                        type="button"
                        onClick={e => { e.preventDefault(); setShowMandateModal(true); }}
                        className="underline text-violet-600"
                      >
                        Strategy Mandate
                      </button>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      By continuing, you confirm you have reviewed and agree to all terms and conditions
                    </p>
                  </div>
                </label>
              </div>

              {/* Payment info notice */}
              <div className="mb-4 rounded-2xl px-4 py-3 flex items-start gap-3" style={{ background: "linear-gradient(135deg,#f5f3ff,#ede9fe)" }}>
                <svg className="h-4 w-4 text-violet-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
                </svg>
                <p className="text-xs text-violet-700 leading-relaxed">
                  You'll be guided through our secure payment process with multiple payment options available.
                </p>
              </div>

              {/* Send as a gift */}
              <div className="mb-5">
                <GiftToggleV2
                  enabled={isGift}
                  onToggle={setIsGift}
                  onDone={() => { setIsGift(false); onClose?.(); }}
                  security={{ id: strategy?.id, name: strategy?.name, symbol: strategy?.name }}
                  totalCostCents={totalCostCents}
                  amountDisplay={`R ${fmt(fees.totalCost)}`}
                  assetType="strategy"
                />
              </div>

              {/* CTA — hidden when gift mode is active */}
              {!isGift && (
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!agreementChecked || !minimum || insufficient}
                  className="w-full rounded-2xl py-4 text-sm font-bold text-white shadow-lg active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
                >
                  Continue
                </button>
              )}
            </div>
          </motion.div>

          {/* Strategy Mandate PDF — full-screen overlay above the sheet */}
          <AnimatePresence>
            {showMandateModal && (
              <motion.div
                key="mandate-overlay"
                className="fixed inset-0 flex flex-col bg-white"
                style={{ zIndex: 10000 }}
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowMandateModal(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <h2 className="text-sm font-semibold text-slate-900">Strategy Mandate</h2>
                  <a
                    href="/strategy-disclosures.pdf"
                    download="Strategy-Mandate.pdf"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </div>
                <div className="flex-1 overflow-hidden">
                  <PdfViewer file="/strategy-disclosures.pdf" style={{ height: "100%" }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>,
    portalTarget
  );
}
