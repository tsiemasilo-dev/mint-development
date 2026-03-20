import React, { useState, useEffect } from "react";
import { ArrowLeft, CreditCard, Zap, Building2, Copy, Check, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";

const STANDARD_BANK_LOGO = "/standard-bank-logo.png";

const PaymentMethodPage = ({ onBack, amount, strategyName, onSelectPaystack, onSelectOzow, onEFTConfirm }) => {
  const [eftExpanded, setEftExpanded] = useState(false);
  const [mintNumber, setMintNumber] = useState(null);
  const [copied, setCopied] = useState(null);
  const [ozowLoading, setOzowLoading] = useState(false);

  useEffect(() => {
    const fetchMintNumber = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("profiles")
          .select("mint_number")
          .eq("id", user.id)
          .maybeSingle();
        if (data?.mint_number) setMintNumber(data.mint_number);
      } catch (_) {}
    };
    fetchMintNumber();
  }, []);

  const handleCopy = (value, label) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const CopyBtn = ({ value, label }) => (
    <button
      type="button"
      onClick={() => handleCopy(value, label)}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
        copied === label
          ? "bg-emerald-50 text-emerald-600"
          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
      }`}
    >
      {copied === label
        ? <><Check className="h-3.5 w-3.5" />Copied</>
        : <><Copy className="h-3.5 w-3.5" />Copy</>}
    </button>
  );

  const formatAmount = (amt) => {
    if (!amt) return "R0.00";
    return `R${Number(amt).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <div className="bg-gradient-to-br from-[#31005e] to-[#5b21b6] px-6 pt-14 pb-12">
        <div className="flex items-center gap-3 mb-5">
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
        <p className="text-white/60 text-sm mb-1">Payment for</p>
        <h1 className="text-2xl font-bold text-white">{strategyName || "Investment"}</h1>
        <div className="mt-3 inline-flex items-center bg-white/15 rounded-full px-4 py-2">
          <span className="text-white font-bold text-lg">{formatAmount(amount)}</span>
        </div>
      </div>

      <div className="px-4 -mt-5 space-y-3">
        <p className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold px-1 pt-1">
          Choose payment method
        </p>

        <button
          type="button"
          onClick={() => onSelectPaystack?.()}
          className="w-full rounded-2xl bg-white shadow-sm border border-slate-100 px-5 py-4 flex items-center gap-4 text-left transition active:scale-[0.98]"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 flex-shrink-0">
            <CreditCard className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900">Paystack</p>
            <p className="text-xs text-slate-400 mt-0.5">Card, instant EFT, bank transfer & more</p>
          </div>
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-full px-2.5 py-1 flex-shrink-0">
            Instant
          </span>
        </button>

        <button
          type="button"
          onClick={async () => {
            setOzowLoading(true);
            try {
              await onSelectOzow?.();
            } finally {
              setOzowLoading(false);
            }
          }}
          disabled={ozowLoading}
          className="w-full rounded-2xl bg-white shadow-sm border border-slate-100 px-5 py-4 flex items-center gap-4 text-left transition active:scale-[0.98] disabled:opacity-60"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 flex-shrink-0">
            {ozowLoading
              ? <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              : <Zap className="h-5 w-5 text-blue-600" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900">Ozow</p>
            <p className="text-xs text-slate-400 mt-0.5">Instant bank-to-bank payment</p>
          </div>
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 rounded-full px-2.5 py-1 flex-shrink-0">
            Instant
          </span>
        </button>

        <div className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
          <button
            type="button"
            onClick={() => setEftExpanded(!eftExpanded)}
            className="w-full px-5 py-4 flex items-center gap-4 text-left transition active:scale-[0.98]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 flex-shrink-0">
              <Building2 className="h-5 w-5 text-slate-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900">Direct EFT</p>
              <p className="text-xs text-slate-400 mt-0.5">Manual bank transfer · 1–2 business days</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-xs text-slate-400 font-medium">Manual</span>
              {eftExpanded
                ? <ChevronUp className="h-4 w-4 text-slate-400" />
                : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </div>
          </button>

          {eftExpanded && (
            <div className="border-t border-slate-100">
              <div className="flex items-center justify-between px-5 py-3 bg-[#001f5b]">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/50 mb-0.5">Receiving Bank</p>
                  <p className="text-xs text-white/70">EFT / Bank Transfer</p>
                </div>
                <img src={STANDARD_BANK_LOGO} alt="Standard Bank" className="h-7 object-contain" />
              </div>

              <div className="px-5 py-4 space-y-2.5">
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-slate-400">Account Holder</p>
                    <p className="text-xs font-semibold text-slate-900">MINT PLATFORMS (PTY) LTD</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-slate-400">Account Type</p>
                    <p className="text-xs font-semibold text-slate-900">Business Current Account</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-slate-400">Branch</p>
                    <p className="text-xs font-semibold text-slate-900">Sandton City</p>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5">
                  <div>
                    <p className="text-[10px] text-slate-400 mb-0.5">Account Number</p>
                    <p className="text-sm font-bold text-slate-900 tracking-widest">02 154 470 0</p>
                  </div>
                  <CopyBtn value="021544700" label="Account Number" />
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5">
                  <div>
                    <p className="text-[10px] text-slate-400 mb-0.5">Branch Code</p>
                    <p className="text-sm font-bold text-slate-900 tracking-widest">002064</p>
                  </div>
                  <CopyBtn value="002064" label="Branch Code" />
                </div>

                <div className="flex items-center justify-between rounded-xl bg-violet-50 px-3.5 py-2.5">
                  <div>
                    <p className="text-[10px] text-violet-500 mb-0.5">Your Reference (Mint Number)</p>
                    <p className="text-sm font-bold text-violet-900 tracking-widest">
                      {mintNumber ?? "Loading..."}
                    </p>
                  </div>
                  {mintNumber && <CopyBtn value={mintNumber} label="Mint Number" />}
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Always use your Mint number as the payment reference so we can allocate your deposit correctly. Deposits reflect within 1–2 business days.
                </p>

                <button
                  type="button"
                  onClick={() => onEFTConfirm?.()}
                  className="w-full mt-1 py-3.5 rounded-xl bg-slate-900 text-white text-sm font-semibold transition active:scale-95"
                >
                  I've sent the payment
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodPage;
