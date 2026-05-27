import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ShieldCheck, Receipt, Landmark, FileText, TrendingUp, Info, CreditCard } from "lucide-react";

const fmtR = (v) => {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return `R${Number(v).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatLongDate = (dateString) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }) + " · " + date.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
};

const FeeRow = ({ icon: Icon, label, sublabel, amount, accent }) => (
  <div className="flex items-start gap-3 py-3">
    <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${accent?.bg || "bg-slate-100"}`}>
      <Icon className={`h-4 w-4 ${accent?.text || "text-slate-500"}`} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-slate-800">{label}</p>
      {sublabel ? <p className="text-[11px] text-slate-400 mt-0.5">{sublabel}</p> : null}
    </div>
    <p className="text-sm font-semibold tabular-nums text-slate-900 flex-shrink-0">{amount}</p>
  </div>
);

const TransactionDetailSheet = ({ isOpen, onClose, transaction }) => {
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!transaction) return null;

  const fb = transaction.feeBreakdown || {};
  const hasBreakdown = (fb.baseCents ?? 0) > 0 || (fb.bufferCents ?? 0) > 0;

  const baseR        = (fb.baseCents || 0) / 100;
  const bufferR      = (fb.bufferCents || 0) / 100;
  const bufferUsedR  = (fb.bufferConsumedCents || 0) / 100;
  const bufferLeftR  = Math.max(0, bufferR - bufferUsedR);
  const brokerR      = (fb.brokerFeeCents || 0) / 100;
  const isinR        = (fb.isinFeeCents || 0) / 100;
  const txFeeR       = (fb.transactionFeeCents || 0) / 100;
  const feesTotalR   = brokerR + isinR + txFeeR;
  const totalR       = (transaction.rawAmountCents || 0) / 100;

  const isCredit = transaction.direction === "credit";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            className="fixed inset-x-0 bottom-0 z-[81] mx-auto w-full max-w-md rounded-t-[28px] bg-white shadow-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex items-center justify-center pt-3 pb-1">
              <span className="h-1.5 w-10 rounded-full bg-slate-200" />
            </div>

            <div className="flex items-start justify-between px-5 pt-2 pb-4">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {isCredit ? "Money in" : "Purchase"}
                </p>
                <h2 className="text-lg font-bold text-slate-900 mt-0.5 truncate">
                  {transaction.title}
                </h2>
                <p className="text-[11px] text-slate-400 mt-1">
                  {formatLongDate(transaction.date)}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 ml-3"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-5 pb-6">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {isCredit ? "Amount received" : "Total deducted"}
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                  {fmtR(totalR)}
                </p>
                {transaction.status ? (
                  <span className={`inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    transaction.status === "successful" || transaction.status === "completed" || transaction.status === "posted"
                      ? "bg-emerald-100 text-emerald-700"
                      : transaction.status === "pending"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-200 text-slate-600"
                  }`}>
                    {transaction.status === "successful" || transaction.status === "completed" || transaction.status === "posted"
                      ? "Completed"
                      : transaction.status === "pending"
                      ? "Awaiting confirmation"
                      : transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                  </span>
                ) : null}
              </div>

              {hasBreakdown ? (
                <>
                  <p className="mt-5 mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
                    Breakdown
                  </p>
                  <div className="rounded-2xl border border-slate-100 bg-white divide-y divide-slate-100 px-4">
                    <FeeRow
                      icon={TrendingUp}
                      label="Investment amount"
                      sublabel="Goes into your position"
                      amount={fmtR(baseR)}
                      accent={{ bg: "bg-violet-50", text: "text-violet-600" }}
                    />
                    {bufferR > 0 ? (
                      <FeeRow
                        icon={ShieldCheck}
                        label="Execution Reserve"
                        sublabel={bufferUsedR > 0
                          ? `R${bufferUsedR.toFixed(2)} used · R${bufferLeftR.toFixed(2)} refundable`
                          : "Refunded on cancel or sale"}
                        amount={fmtR(bufferR)}
                        accent={{ bg: "bg-emerald-50", text: "text-emerald-600" }}
                      />
                    ) : null}
                    {brokerR > 0 ? (
                      <FeeRow
                        icon={Landmark}
                        label="Brokerage fee"
                        sublabel="0.25% of order value"
                        amount={fmtR(brokerR)}
                        accent={{ bg: "bg-blue-50", text: "text-blue-600" }}
                      />
                    ) : null}
                    {isinR > 0 ? (
                      <FeeRow
                        icon={FileText}
                        label="ISIN fee"
                        sublabel="Per security in your order"
                        amount={fmtR(isinR)}
                        accent={{ bg: "bg-amber-50", text: "text-amber-600" }}
                      />
                    ) : null}
                    {txFeeR > 0 ? (
                      <FeeRow
                        icon={Receipt}
                        label="Transaction fee"
                        sublabel="3.8% of order value"
                        amount={fmtR(txFeeR)}
                        accent={{ bg: "bg-rose-50", text: "text-rose-500"}}
                      />
                    ) : null}
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-900 px-4 py-3">
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Total charged</span>
                    <span className="text-base font-bold text-white tabular-nums">{fmtR(totalR)}</span>
                  </div>

                  {feesTotalR > 0 ? (
                    <p className="mt-3 text-[11px] text-slate-400 px-1 leading-relaxed">
                      <Info className="inline h-3 w-3 mr-1 -mt-0.5" />
                      Fees total <span className="font-semibold text-slate-500">{fmtR(feesTotalR)}</span>. The Execution Reserve covers fill-price slippage; any unused portion is refunded.
                    </p>
                  ) : null}
                </>
              ) : (
                <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-slate-400" />
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Details</p>
                  </div>
                  {transaction.description ? (
                    <p className="text-sm text-slate-700 mt-2">{transaction.description}</p>
                  ) : (
                    <p className="text-sm text-slate-500 mt-2">No additional details for this transaction.</p>
                  )}
                </div>
              )}

              {transaction.storeReference ? (
                <p className="mt-4 text-[10px] text-slate-400 text-center font-mono">
                  Ref · {transaction.storeReference}
                </p>
              ) : null}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TransactionDetailSheet;
