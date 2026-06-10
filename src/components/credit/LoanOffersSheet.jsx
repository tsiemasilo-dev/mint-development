import React, { useState } from "react";
import {
  X, ChevronRight, TrendingDown, AlertCircle,
  CheckCircle2, Loader2, Clock,
} from "lucide-react";

function fmtZar(n) {
  return `R ${Number(n).toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const SCORE_BAND = (score) => {
  if (score >= 767) return { label: "Excellent", color: "text-emerald-600", bg: "bg-emerald-50" };
  if (score >= 681) return { label: "Good",      color: "text-sky-600",     bg: "bg-sky-50" };
  if (score >= 614) return { label: "Fair",      color: "text-amber-600",   bg: "bg-amber-50" };
  return               { label: "Poor",       color: "text-rose-600",    bg: "bg-rose-50" };
};

// ─── Single offer card ────────────────────────────────────────────────────────
const OfferCard = ({ offer, rank, onAccept, accepting }) => {
  const [expanded, setExpanded] = useState(false);
  const isFirst = rank === 0;

  return (
    <div
      className={`rounded-[20px] border transition-all mb-3 overflow-hidden ${
        isFirst
          ? "border-violet-200 shadow-lg shadow-violet-100"
          : "border-slate-100"
      }`}
    >
      {/* Best deal badge */}
      {isFirst && (
        <div className="bg-violet-600 px-4 py-1.5 flex items-center gap-1.5">
          <TrendingDown size={11} className="text-violet-200" />
          <p className="text-[10px] font-black uppercase tracking-widest text-white">
            Cheapest monthly repayment
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-3 px-4 py-4 text-left bg-white active:bg-slate-50 transition-colors"
      >
        {/* Rank bubble */}
        <span
          className={`h-7 w-7 rounded-full text-[11px] font-black flex items-center justify-center shrink-0 ${
            isFirst ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          {rank + 1}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-slate-900 leading-tight truncate">
            {offer.lenderName}
          </p>
          {offer.tagline && (
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">{offer.tagline}</p>
          )}
        </div>

        <div className="text-right shrink-0">
          <p className="text-[15px] font-black text-slate-900">
            {fmtZar(offer.monthlyInstallment)}
            <span className="text-[10px] font-medium text-slate-400">/mo</span>
          </p>
          <p className="text-[10px] text-slate-400">{offer.offeredRatePct}% p.a.</p>
        </div>

        <ChevronRight
          size={14}
          className={`text-slate-300 shrink-0 transition-transform ml-1 ${expanded ? "rotate-90" : ""}`}
        />
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 bg-white">
          <div className="ml-10 rounded-xl border border-slate-100 bg-slate-50 p-3 mb-3">
            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
              {[
                { label: "Offered amount",   value: fmtZar(offer.offeredAmount) },
                { label: "Term",             value: `${offer.termMonths} months` },
                { label: "Monthly payment",  value: fmtZar(offer.monthlyInstallment) },
                { label: "Total repayment",  value: fmtZar(offer.totalRepayment) },
                { label: "Initiation fee",   value: fmtZar(offer.initiationFee) },
                { label: "Interest rate",    value: `${offer.offeredRatePct}% p.a.` },
              ].map((d) => (
                <React.Fragment key={d.label}>
                  <p className="text-[11px] text-slate-500">{d.label}</p>
                  <p className="text-[11px] font-semibold text-slate-900 text-right">{d.value}</p>
                </React.Fragment>
              ))}
            </div>
            {offer.avgTurnaroundDays && (
              <div className="mt-2.5 pt-2.5 border-t border-slate-200 flex items-center gap-1.5">
                <Clock size={10} className="text-slate-400 shrink-0" />
                <p className="text-[10px] text-slate-400">
                  Typical turnaround ~{offer.avgTurnaroundDays} business day{offer.avgTurnaroundDays !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onAccept(offer)}
            disabled={accepting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-[14px] bg-violet-600 text-white text-[13px] font-bold tracking-wide disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {accepting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCircle2 size={14} />
            )}
            {accepting ? "Processing…" : "Choose this offer"}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Main sheet ───────────────────────────────────────────────────────────────
/**
 * LoanOffersSheet
 *
 * Props:
 *   isOpen        — boolean
 *   onClose       — () => void
 *   offers        — Offer[]  (from AlgoLend evaluate response)
 *   declines      — { lender, reason }[]
 *   totalLenders  — number
 *   requestId     — string   (needed for acceptance)
 *   creditScore   — number   (Experian score to display)
 *   isLoading     — boolean  (while fetching offers)
 *   error         — string | null
 *   onAccept      — (offer) => void  (called after acceptance recorded)
 */
const LoanOffersSheet = ({
  isOpen,
  onClose,
  offers = [],
  declines = [],
  totalLenders = 0,
  requestId,
  creditScore,
  isLoading,
  error,
  onAccept,
}) => {
  const [accepting, setAccepting] = useState(false);
  const [acceptedOffer, setAcceptedOffer] = useState(null);

  if (!isOpen) return null;

  const band = creditScore ? SCORE_BAND(creditScore) : null;

  const handleAccept = async (offer) => {
    if (accepting) return;
    setAccepting(true);
    try {
      await onAccept(offer);
      setAcceptedOffer(offer);
    } catch {
      // parent handles error toasting
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div className="absolute inset-x-0 bottom-0 max-h-[92vh] flex flex-col bg-white rounded-t-[28px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="px-5 pb-4 pt-2 flex items-start justify-between shrink-0">
          <div>
            <h2 className="text-[15px] font-black text-slate-900">Loan offers for you</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isLoading
                ? "Checking with our lender network…"
                : offers.length > 0
                  ? `${offers.length} offer${offers.length !== 1 ? "s" : ""} from ${totalLenders} lender${totalLenders !== 1 ? "s" : ""} · ranked cheapest first`
                  : `${totalLenders} lender${totalLenders !== 1 ? "s" : ""} evaluated`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 shrink-0 active:scale-95 transition-transform"
          >
            <X size={15} />
          </button>
        </div>

        {/* Credit score strip */}
        {creditScore && band && (
          <div className={`mx-5 mb-3 px-3 py-2 rounded-xl flex items-center gap-2 ${band.bg} shrink-0`}>
            <p className="text-[11px] text-slate-500 flex-1">Your Experian score</p>
            <span className={`text-[13px] font-black ${band.color}`}>{creditScore}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${band.bg} ${band.color}`}>
              {band.label}
            </span>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-8">

          {/* Loading */}
          {isLoading && (
            <div className="py-16 flex flex-col items-center gap-3">
              <Loader2 size={28} className="animate-spin text-violet-500" />
              <p className="text-[13px] text-slate-500 font-medium">
                Matching your profile with {totalLenders || "our"} lenders…
              </p>
            </div>
          )}

          {/* Error */}
          {!isLoading && error && (
            <div className="py-10 flex flex-col items-center gap-3 text-center">
              <div className="h-12 w-12 rounded-full bg-rose-50 flex items-center justify-center">
                <AlertCircle size={22} className="text-rose-500" />
              </div>
              <p className="text-[13px] text-slate-700 font-medium">{error}</p>
            </div>
          )}

          {/* Accepted state */}
          {!isLoading && !error && acceptedOffer && (
            <div className="py-10 flex flex-col items-center gap-4 text-center">
              <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 size={30} className="text-emerald-500" />
              </div>
              <div>
                <p className="text-[15px] font-black text-slate-900 mb-1">Offer selected!</p>
                <p className="text-[12px] text-slate-500 max-w-[260px]">
                  <strong>{acceptedOffer.lenderName}</strong> will be in touch within{" "}
                  {acceptedOffer.avgTurnaroundDays ?? 2} business day{acceptedOffer.avgTurnaroundDays !== 1 ? "s" : ""}.
                </p>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                {fmtZar(acceptedOffer.monthlyInstallment)}/mo · {acceptedOffer.offeredRatePct}% p.a. · {acceptedOffer.termMonths} months
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-8 py-3 rounded-full bg-slate-900 text-white text-[13px] font-bold active:scale-95 transition-transform"
              >
                Done
              </button>
            </div>
          )}

          {/* Offers list */}
          {!isLoading && !error && !acceptedOffer && offers.length > 0 && (
            <div>
              {offers.map((offer, i) => (
                <OfferCard
                  key={`${offer.lenderId}-${i}`}
                  offer={offer}
                  rank={i}
                  onAccept={handleAccept}
                  accepting={accepting}
                />
              ))}
            </div>
          )}

          {/* No offers */}
          {!isLoading && !error && !acceptedOffer && offers.length === 0 && (
            <div className="py-12 flex flex-col items-center gap-3 text-center">
              <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center">
                <AlertCircle size={22} className="text-slate-400" />
              </div>
              <p className="text-[13px] font-semibold text-slate-700">No offers right now</p>
              <p className="text-[11px] text-slate-400 max-w-[240px]">
                Based on your current credit profile, none of our lender partners have a matching product.
                Improving your score or reducing your existing debt may open more options.
              </p>
            </div>
          )}

          {/* Declines (collapsed by default) */}
          {!isLoading && !error && !acceptedOffer && declines.length > 0 && (
            <details className="mt-2">
              <summary className="text-[11px] text-slate-400 font-medium cursor-pointer select-none">
                {declines.length} lender{declines.length !== 1 ? "s" : ""} could not offer — see reasons
              </summary>
              <div className="mt-2 space-y-1.5">
                {declines.map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 py-2 px-3 rounded-xl bg-slate-50"
                  >
                    <p className="text-[11px] text-slate-600 font-medium">{d.lender}</p>
                    <span className="text-[10px] text-rose-500 font-semibold shrink-0">{d.reason}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoanOffersSheet;
