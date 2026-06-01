import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, X, ChevronDown, ChevronUp, Download, Info } from "lucide-react";
import { formatCurrency } from "../lib/formatCurrency";
import { useOnboardingStatus } from "../lib/useOnboardingStatus";
import PdfViewer from "./PdfViewer";
import { supabase } from "../lib/supabase.js";
import { calculateMinInvestmentSync, buildHoldingsBySymbol, getHoldingsArray } from "../lib/strategyUtils";

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

export default function AdultInvestModal({
  isOpen,
  onClose,
  strategy,
  onContinue,
  onGiftDone,
}) {
  const currency = strategy?.currency || "R";
  const isAdditionalStrategy = !!strategy?.isAdditionalStrategy;

  const [minimum, setMinimum] = useState(strategy?.calculatedMinInvestment || null);
  const [amount, setAmount] = useState(strategy?.calculatedMinInvestment || 0);
  const [feeExpanded, setFeeExpanded] = useState(false);
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [showMandateModal, setShowMandateModal] = useState(false);

  const { onboardingComplete: isFullyOnboarded, loading: isLoadingStatus } = useOnboardingStatus();

  // Sync minimum & amount when strategy changes
  useEffect(() => {
    if (!isOpen) return;
    const min = strategy?.calculatedMinInvestment || strategy?.min_investment || null;
    if (min) {
      setMinimum(min);
      setAmount(min);
      return;
    }
    if (!strategy || !supabase) return;
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
        const calc = calculateMinInvestmentSync(strategy, hMap);
        setMinimum(calc);
        setAmount(calc || 0);
      } catch { setMinimum(null); }
    })();
  }, [isOpen, strategy]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setFeeExpanded(false);
      setAgreementChecked(false);
      setShowMandateModal(false);
    }
  }, [isOpen]);

  const holdingsData = strategy?.holdingsWithLogos || strategy?.holdings || [];
  const numAssets = holdingsData.length || 0;
  const extraHoldings = holdingsData.length > 3 ? holdingsData.length - 3 : 0;

  const fees = useMemo(() => {
    const bufferedBase = amount * (1 + CASH_BUFFER_RATE);
    const brokerAmount = bufferedBase * BROKER_FEE_RATE;
    const isinTotal = ISIN_FEE_PER_ASSET * numAssets;
    const transactionAmount = bufferedBase * TRANSACTION_FEE_RATE;
    const totalCost = bufferedBase + brokerAmount + isinTotal + transactionAmount;
    return { bufferedBase, brokerAmount, isinTotal, transactionAmount, totalCost };
  }, [amount, numAssets]);

  const step = minimum || 0;
  const handleIncrement = () => { if (step > 0) setAmount(p => p + step); };
  const handleDecrement = () => { if (step > 0 && amount > step) setAmount(p => p - step); };

  const handleConfirm = () => {
    const sharePrice = strategy?.price_per_share || strategy?.pricePerShare || null;
    const shareCount = sharePrice && sharePrice > 0 ? Math.floor(amount / sharePrice) : null;
    onContinue?.(fees.totalCost, amount, shareCount, fees);
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
            className="fixed inset-x-0 bottom-0 flex flex-col rounded-t-[28px] bg-white shadow-2xl overflow-hidden"
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

            {/* Scrollable body */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pb-6" style={{ WebkitOverflowScrolling: "touch" }}>

              {/* Strategy Card */}
              <div className="mb-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-200 overflow-hidden">
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
                    <p className="text-xs font-semibold text-slate-600 mt-1">
                      {minimum ? `Min. ${formatCurrency(minimum, currency)}` : "Calculating..."}
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
                            <img src={h.logo_url} alt={sym} className="h-full w-full object-cover" onError={e => { e.target.style.display = "none"; e.target.parentElement.textContent = sym.charAt(0); }} />
                          ) : (
                            <span className="text-[9px] font-bold text-slate-500">{String(sym).charAt(0)}</span>
                          )}
                        </div>
                      );
                    })}
                    {extraHoldings > 0 && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-300 text-white text-[9px] font-bold flex-shrink-0">
                        +{extraHoldings}
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">Holdings snapshot</span>
                </div>
              </div>

              {/* Amount stepper */}
              <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-semibold text-slate-500 text-center mb-2 uppercase tracking-wide">Investment Amount</p>
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={!minimum || amount <= minimum || !isFullyOnboarded}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition active:scale-95"
                  >
                    <span className="text-lg font-light leading-none">−</span>
                  </button>
                  <p className="text-3xl font-bold text-slate-900 flex-1 text-center">
                    {formatCurrency(amount * (1 + CASH_BUFFER_RATE), currency)}
                  </p>
                  <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={!isFullyOnboarded}
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed transition active:scale-95"
                    style={{ background: "linear-gradient(135deg,#5b21b6,#7c3aed)" }}
                  >
                    <span className="text-lg font-light leading-none">+</span>
                  </button>
                </div>
              </div>

              {/* Fee Breakdown */}
              <div className="mb-4 rounded-2xl border border-slate-100 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setFeeExpanded(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3"
                >
                  <span className="text-xs font-semibold text-slate-600">Fee Breakdown</span>
                  {feeExpanded
                    ? <ChevronUp className="h-4 w-4 text-slate-400" />
                    : <ChevronDown className="h-4 w-4 text-slate-400" />
                  }
                </button>
                {feeExpanded && (
                  <div className="px-4 pb-4 space-y-2 border-t border-slate-100">
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-xs text-slate-500">Investment + 8% reserve</p>
                      <p className="text-xs font-semibold text-slate-800">{formatCurrency(fees.bufferedBase, currency)}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500">Broker Fee (0.25%)</p>
                      <p className="text-xs font-semibold text-slate-800">{formatCurrency(fees.brokerAmount, currency)}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500">Custody Fee ({formatCurrency(ISIN_FEE_PER_ASSET, currency)} × {numAssets} asset{numAssets !== 1 ? "s" : ""})</p>
                      <p className="text-xs font-semibold text-slate-800">{formatCurrency(fees.isinTotal, currency)}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500">Transaction Fee (3.8%)</p>
                      <p className="text-xs font-semibold text-slate-800">{formatCurrency(fees.transactionAmount, currency)}</p>
                    </div>
                    {isAdditionalStrategy && (
                      <div className="flex items-center justify-between pt-1 border-t border-dashed border-violet-100">
                        <div>
                          <p className="text-xs text-violet-700 font-medium">Monthly Strategy Fee</p>
                          <p className="text-[10px] text-violet-500">From {firstBillingDate()}</p>
                        </div>
                        <p className="text-xs font-semibold text-violet-700">{formatCurrency(MONTHLY_STRATEGY_FEE, currency)}/month</p>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-100">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Total Due Today</p>
                    {isAdditionalStrategy && (
                      <p className="text-[10px] text-violet-600">R29/month from {firstBillingDate()}</p>
                    )}
                  </div>
                  <p className="text-sm font-bold text-slate-900">{formatCurrency(fees.totalCost, currency)}</p>
                </div>
              </div>

              {/* Agreement checkbox */}
              <div className="mb-4 rounded-2xl border border-slate-100 bg-white p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreementChecked}
                    onChange={e => setAgreementChecked(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 flex-shrink-0"
                  />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-900">
                      I agree to Risk Disclosure, Fee Schedule &{" "}
                      <button
                        type="button"
                        onClick={e => { e.preventDefault(); setShowMandateModal(true); }}
                        className="underline text-violet-700"
                      >
                        Strategy Mandate
                      </button>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      By continuing you confirm you have reviewed and agree to all terms
                      {isAdditionalStrategy && <span className="text-violet-700 font-medium">, including the R29/month recurring fee</span>}.
                    </p>
                  </div>
                </label>
              </div>

              {/* Info banner */}
              <div className="mb-4 flex items-start gap-2 rounded-xl bg-violet-50 px-3 py-2.5">
                <Info className="h-4 w-4 flex-shrink-0 text-violet-500 mt-0.5" />
                <p className="text-xs text-violet-700">You'll be guided through our secure payment process with multiple options available.</p>
              </div>

              {/* CTA */}
              {!isLoadingStatus && !isFullyOnboarded ? (
                <div className="w-full rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center">
                  <p className="text-sm font-semibold text-rose-800 mb-1">Onboarding Required</p>
                  <p className="text-xs text-rose-600 mb-3">Complete your profile and identity verification before investing.</p>
                  <button
                    type="button"
                    onClick={() => { onClose(); window.dispatchEvent(new CustomEvent("navigate-within-app", { detail: { page: "userOnboarding" } })); }}
                    className="w-full rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white transition active:scale-95"
                  >
                    Complete Onboarding
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!agreementChecked || isLoadingStatus || !minimum}
                  className="w-full rounded-2xl py-3.5 text-sm font-bold text-white shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg,#5b21b6,#7c3aed)" }}
                >
                  {isLoadingStatus ? "Checking status…" : "Continue"}
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
