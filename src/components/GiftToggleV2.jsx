import React, { useState } from "react";
import { Gift, Copy, Check, AlertCircle } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function GiftToggleV2({
  enabled,
  onToggle,
  security,
  totalCostCents,
  amountDisplay,
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState("form"); // form | confirming | loading | success
  const [giftCode, setGiftCode] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const canProceed = firstName.trim() && lastName.trim();

  function handleToggle(val) {
    setStep("form");
    setFirstName("");
    setLastName("");
    setMessage("");
    setGiftCode(null);
    setError(null);
    onToggle?.(val);
  }

  async function handleConfirm() {
    setStep("loading");
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const res = await fetch("/api/gift/create-v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          asset_type: "stock",
          security_id: security?.id,
          security_symbol: security?.symbol,
          asset_name: security?.name || security?.symbol,
          amount: totalCostCents,
          recipient_first_name: firstName.trim(),
          recipient_last_name: lastName.trim(),
          message: message.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Failed to send gift.");
        setStep("confirming");
        return;
      }
      setGiftCode(data.token);
      setExpiresAt(data.expires_at);
      setStep("success");
    } catch {
      setError("Something went wrong. Please try again.");
      setStep("confirming");
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(giftCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function formatExpiry(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }) +
      " on " + d.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" });
  }

  return (
    <div className="mt-4">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => handleToggle(!enabled)}
        className="w-full flex items-center justify-between bg-violet-50 hover:bg-violet-100 transition-colors rounded-2xl px-4 py-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
            <Gift size={16} className="text-violet-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-800">Send as a gift</p>
            <p className="text-xs text-slate-500">Recipient claims with their SA ID + code</p>
          </div>
        </div>
        <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${enabled ? "bg-violet-600" : "bg-slate-200"}`}>
          <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-4" : "translate-x-0"}`} />
        </div>
      </button>

      {/* Form */}
      {enabled && step === "form" && (
        <div className="mt-3 space-y-3 bg-slate-50 rounded-2xl p-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-600 mb-1 block">First Name <span className="text-red-500">*</span></label>
              <input
                type="text" value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="John"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Last Name <span className="text-red-500">*</span></label>
              <input
                type="text" value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Doe"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">
              Personal message <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Add a personal note…" rows={2} maxLength={200}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
            />
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
            <p className="text-xs text-amber-800 leading-relaxed">
              <span className="font-semibold">Your wallet is debited immediately.</span> The recipient has 4 hours to claim using their SA ID number and the code you share with them.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStep("confirming")}
            disabled={!canProceed}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all active:scale-95 ${canProceed ? "bg-violet-600" : "bg-slate-300 cursor-not-allowed"}`}
          >
            <Gift size={15} /> Continue
          </button>
        </div>
      )}

      {/* Confirmation */}
      {enabled && step === "confirming" && (
        <div className="mt-3 bg-violet-50 border border-violet-200 rounded-2xl p-4 space-y-4">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={17} className="text-violet-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-slate-800">Confirm gift details</p>
              <p className="text-xs text-slate-500 mt-0.5">Your wallet will be debited immediately. This cannot be undone.</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 space-y-2">
            <Row label="To" value={`${firstName} ${lastName}`} />
            <Row label="Asset" value={security?.name || security?.symbol} />
            {amountDisplay && <Row label="Amount" value={amountDisplay} valueClass="text-violet-700 font-bold" />}
            {message && (
              <div className="pt-1 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-0.5">Message</p>
                <p className="text-xs text-slate-700 italic">"{message}"</p>
              </div>
            )}
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep("form")} className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 active:scale-95 transition-all">
              Edit
            </button>
            <button type="button" onClick={handleConfirm} className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white active:scale-95 transition-all">
              Confirm & Send
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {enabled && step === "loading" && (
        <div className="mt-3 bg-violet-50 border border-violet-200 rounded-2xl p-6 flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-violet-300 border-t-violet-600 animate-spin" />
          <p className="text-sm text-slate-600">Creating your gift…</p>
        </div>
      )}

      {/* Success — show code */}
      {enabled && step === "success" && giftCode && (
        <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-4">
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-800 mb-1">Gift sent!</p>
            <p className="text-xs text-slate-500">
              Share this code with {firstName}. It expires at {formatExpiry(expiresAt)}.
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 flex flex-col items-center gap-3 border border-emerald-100">
            <p className="text-4xl font-black tracking-[0.4em] text-slate-900 font-mono">{giftCode}</p>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white active:scale-95 transition-all"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied!" : "Copy Code"}
            </button>
          </div>
          <p className="text-xs text-slate-400 text-center leading-relaxed">
            The recipient enters this code + their SA ID number on the Mint app to claim their investment.
          </p>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, valueClass = "font-semibold text-slate-900" }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-xs ${valueClass} text-right max-w-[60%]`}>{value}</span>
    </div>
  );
}
