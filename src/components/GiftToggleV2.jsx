import React, { useState, useRef } from "react";
import { Gift, Copy, Check, AlertCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

const CONFETTI_COLORS = ["#7c3aed","#a78bfa","#f59e0b","#10b981","#ef4444","#3b82f6","#ec4899","#f97316"];

function ConfettiBurst({ active }) {
  const particles = useRef(
    Array.from({ length: 48 }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      x: (Math.random() - 0.5) * 320,
      y: -(80 + Math.random() * 220),
      rotate: Math.random() * 720,
      scale: 0.6 + Math.random() * 0.8,
      delay: Math.random() * 0.3,
      shape: Math.random() > 0.5 ? "rect" : "circle",
    }))
  ).current;

  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden" style={{ zIndex: 50 }}>
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            width: p.shape === "circle" ? 10 : 8,
            height: p.shape === "circle" ? 10 : 14,
            borderRadius: p.shape === "circle" ? "50%" : 2,
            background: p.color,
            animation: `confetti-fly 1.1s ease-out ${p.delay}s forwards`,
            "--tx": `${p.x}px`,
            "--ty": `${p.y}px`,
            "--rot": `${p.rotate}deg`,
            transform: "scale(0)",
            opacity: 1,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fly {
          0%   { transform: scale(0) translate(0,0) rotate(0deg); opacity: 1; }
          60%  { opacity: 1; }
          100% { transform: scale(var(--s,1)) translate(var(--tx), var(--ty)) rotate(var(--rot)); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default function GiftToggleV2({
  enabled,
  onToggle,
  onDone,
  security,
  totalCostCents,
  amountDisplay,
  assetType = "stock",
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState("form");
  const [giftCode, setGiftCode] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [celebrate, setCelebrate] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail.trim());
  const canProceed = firstName.trim() && lastName.trim() && emailValid;

  function handleToggle(val) {
    setStep("form");
    setFirstName("");
    setLastName("");
    setRecipientEmail("");
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
          asset_type: assetType,
          ...(assetType === "strategy"
            ? { strategy_id: security?.id }
            : { security_id: security?.id }),
          security_symbol: security?.symbol,
          asset_name: security?.name || security?.symbol,
          amount: totalCostCents,
          recipient_identifier: recipientEmail.trim().toLowerCase(),
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
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 1600);
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
      <button
        type="button"
        onClick={() => handleToggle(!enabled)}
        className={`w-full flex items-center justify-between rounded-2xl px-4 py-3.5 transition-all duration-300 ${enabled ? "bg-violet-50 border border-violet-200 shadow-md shadow-violet-100/50" : "bg-white border border-slate-200 shadow-sm"}`}
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={{
              backgroundColor: enabled ? "rgb(237 233 254)" : "rgb(241 245 249)",
              scale: enabled ? 1.05 : 1,
            }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
          >
            <motion.div
              animate={{ rotate: enabled ? [0, -15, 15, -10, 5, 0] : 0 }}
              transition={{ duration: 0.5 }}
            >
              <Gift size={16} className={enabled ? "text-violet-600" : "text-slate-500"} />
            </motion.div>
          </motion.div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-800">Send as a gift</p>
            <p className="text-[11px] text-slate-400">Recipient claims with their SA ID + code</p>
          </div>
        </div>

        {/* iOS-style animated toggle */}
        <motion.div
          animate={{ backgroundColor: enabled ? "#7c3aed" : "#e2e8f0" }}
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
          className="relative w-[52px] h-[30px] rounded-full flex items-center cursor-pointer"
          style={{ padding: 3 }}
        >
          <motion.div
            animate={{ x: enabled ? 22 : 0 }}
            transition={{ type: "spring", stiffness: 700, damping: 35 }}
            className="w-6 h-6 rounded-full bg-white flex items-center justify-center"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)" }}
          >
            <AnimatePresence mode="wait">
              {enabled ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Check size={12} strokeWidth={3} className="text-violet-600" />
                </motion.div>
              ) : (
                <motion.div
                  key="dot"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="w-1.5 h-1.5 rounded-full bg-slate-300"
                />
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </button>

      <AnimatePresence mode="wait">
      {enabled && step === "form" && (
        <motion.div
          key="gift-form"
          initial={{ opacity: 0, height: 0, marginTop: 0 }}
          animate={{ opacity: 1, height: "auto", marginTop: 12 }}
          exit={{ opacity: 0, height: 0, marginTop: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
          className="overflow-hidden"
        >
        <div className="space-y-3 bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-slate-500 mb-1 block">First Name</label>
              <input
                type="text" value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="John"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-violet-400 focus:bg-white transition-colors"
              />
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Last Name</label>
              <input
                type="text" value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Doe"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-violet-400 focus:bg-white transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Recipient Email</label>
            <input
              type="email" value={recipientEmail}
              onChange={e => setRecipientEmail(e.target.value)}
              placeholder="john@example.com"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-violet-400 focus:bg-white transition-colors"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">
              Personal message <span className="text-slate-300 font-normal">(optional)</span>
            </label>
            <textarea
              value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Add a personal note…" rows={2} maxLength={200}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-violet-400 focus:bg-white transition-colors resize-none"
            />
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Your wallet is debited immediately. The recipient has 4 hours to claim using their SA ID and the code you share.
          </p>
          <button
            type="button"
            onClick={() => setStep("confirming")}
            disabled={!canProceed}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] ${canProceed ? "bg-gradient-to-r from-[#1a1a2e] to-[#44296b] shadow-lg" : "bg-slate-300 cursor-not-allowed"}`}
          >
            <Gift size={15} /> Continue
          </button>
        </div>
        </motion.div>
      )}

      {enabled && step === "confirming" && (
        <motion.div
          key="gift-confirm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="mt-3"
        >
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 shadow-sm">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle size={14} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Confirm gift details</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Your wallet will be debited immediately.</p>
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 space-y-2">
            <Row label="To" value={`${firstName} ${lastName}`} />
            <Row label="Email" value={recipientEmail.trim().toLowerCase()} />
            <Row label="Asset" value={security?.name || security?.symbol} />
            {amountDisplay && <Row label="Amount" value={amountDisplay} bold />}
            {message && (
              <div className="pt-1 border-t border-slate-200">
                <p className="text-[11px] text-slate-400 mb-0.5">Message</p>
                <p className="text-xs text-slate-600 italic">"{message}"</p>
              </div>
            )}
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep("form")} className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 active:scale-[0.98] transition-all">
              Edit
            </button>
            <button type="button" onClick={handleConfirm} className="flex-1 rounded-xl bg-gradient-to-r from-[#1a1a2e] to-[#44296b] py-2.5 text-sm font-semibold text-white active:scale-[0.98] transition-all shadow-lg">
              Confirm & Send
            </button>
          </div>
        </div>
        </motion.div>
      )}

      {enabled && step === "loading" && (
        <motion.div
          key="gift-loading"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          className="mt-3 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center gap-3 shadow-sm"
        >
          <div className="w-8 h-8 rounded-full border-2 border-violet-200 border-t-violet-600 animate-spin" />
          <p className="text-sm text-slate-500">Creating your gift…</p>
        </motion.div>
      )}
      </AnimatePresence>

      {enabled && step === "success" && giftCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: "rgba(10,10,20,0.75)", backdropFilter: "blur(8px)", animation: "gtv-fade 0.3s ease forwards" }}>
          <style>{`
            @keyframes gtv-fade { from { opacity:0 } to { opacity:1 } }
            @keyframes gtv-pop  { 0% { opacity:0; transform:scale(0.9) translateY(16px) } 100% { opacity:1; transform:scale(1) translateY(0) } }
          `}</style>

          <ConfettiBurst active={celebrate} />

          <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl" style={{ animation: "gtv-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>
            <div className="bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-6 pt-7 pb-6 text-center relative">
              <button
                type="button"
                onClick={() => { setStep("form"); setGiftCode(null); onDone?.(); }}
                className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors"
              >
                <X size={12} className="text-white" />
              </button>
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-3 border border-white/20">
                <Gift size={24} className="text-white" />
              </div>
              <p className="text-lg font-bold text-white mb-1">Gift Sent</p>
              <p className="text-xs text-violet-200 leading-relaxed">
                Share this code with {firstName} — they'll need it and their SA ID to claim.
                {expiresAt ? ` Expires ${formatExpiry(expiresAt)}.` : ""}
              </p>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="bg-slate-50 rounded-2xl p-5 text-center">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.15em] mb-2">Claim Code</p>
                <p className="text-4xl font-black tracking-[0.35em] text-slate-900 font-mono">{giftCode}</p>
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white active:scale-[0.98] transition-all"
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? "Copied!" : "Copy Code"}
              </button>

              <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                Recipient enters this code + SA ID on the Mint app to claim their investment.
              </p>

              <button
                type="button"
                onClick={() => { setStep("form"); setGiftCode(null); onDone?.(); }}
                className="w-full py-3 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold active:scale-[0.98] transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[11px] text-slate-400">{label}</span>
      <span className={`text-xs text-right max-w-[60%] ${bold ? "font-bold text-slate-900" : "font-semibold text-slate-700"}`}>{value}</span>
    </div>
  );
}
