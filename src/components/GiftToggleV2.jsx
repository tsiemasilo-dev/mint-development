import React, { useState, useRef, useEffect, useCallback } from "react";
import { Gift, Copy, Check, AlertCircle, X, Search, Star, Hash, User, ChevronLeft, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

const CONFETTI_COLORS = ["#7c3aed","#a78bfa","#f59e0b","#10b981","#ef4444","#3b82f6","#ec4899","#f97316"];
const BENEFICIARIES_KEY = "mint_gift_beneficiaries";

function getBeneficiaries() {
  try { return JSON.parse(localStorage.getItem(BENEFICIARIES_KEY) || "[]"); }
  catch { return []; }
}

function saveBeneficiary({ firstName, lastName, email, mintNumber }) {
  try {
    const existing = getBeneficiaries();
    const key = email.toLowerCase();
    const filtered = existing.filter(b => b.email.toLowerCase() !== key);
    const updated = [{ firstName, lastName, email, mintNumber: mintNumber || null, usedAt: Date.now() }, ...filtered].slice(0, 20);
    localStorage.setItem(BENEFICIARIES_KEY, JSON.stringify(updated));
  } catch {}
}

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

function Row({ label, value, bold }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[11px] text-slate-400 shrink-0">{label}</span>
      <span className={`text-[11px] text-right ${bold ? "font-bold text-slate-800" : "text-slate-700"}`}>{value}</span>
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
  const [step, setStep] = useState("picker");
  const [inputMode, setInputMode] = useState("mint");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [giftCode, setGiftCode] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [celebrate, setCelebrate] = useState(false);

  const [mintSearch, setMintSearch] = useState("");
  const [mintSearching, setMintSearching] = useState(false);
  const [mintSearchResult, setMintSearchResult] = useState(null);
  const [mintSearchError, setMintSearchError] = useState(null);
  const mintDebounceRef = useRef(null);

  const [beneficiaries, setBeneficiaries] = useState([]);
  const [beneficiarySearch, setBeneficiarySearch] = useState("");
  const [showAddBeneficiaryPrompt, setShowAddBeneficiaryPrompt] = useState(false);
  const [beneficiarySaved, setBeneficiarySaved] = useState(false);
  const [askSaveBeneficiary, setAskSaveBeneficiary] = useState(false);
  const [pendingBeneficiary, setPendingBeneficiary] = useState(null);

  useEffect(() => {
    if (enabled) setBeneficiaries(getBeneficiaries());
  }, [enabled]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail.trim());
  const canProceed = firstName.trim() && lastName.trim() && emailValid;

  function resetForm() {
    setStep("picker");
    setInputMode("mint");
    setFirstName("");
    setLastName("");
    setRecipientEmail("");
    setMessage("");
    setGiftCode(null);
    setError(null);
    setMintSearch("");
    setMintSearchResult(null);
    setMintSearchError(null);
    setBeneficiarySearch("");
    setShowAddBeneficiaryPrompt(false);
    setBeneficiarySaved(false);
    setAskSaveBeneficiary(false);
    setPendingBeneficiary(null);
  }

  function handleToggle(val) {
    if (!val) resetForm();
    onToggle?.(val);
  }

  function handleClose() {
    resetForm();
    onToggle?.(false);
  }

  function handleSelectBeneficiary(b) {
    setFirstName(b.firstName || "");
    setLastName(b.lastName || "");
    setRecipientEmail(b.email || "");
    setStep("confirming");
  }

  const searchByMintNumber = useCallback(async (mintNum) => {
    if (!mintNum || mintNum.trim().length < 3) {
      setMintSearchResult(null);
      setMintSearchError(null);
      return;
    }
    setMintSearching(true);
    setMintSearchError(null);
    setMintSearchResult(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const res = await fetch(`/api/user/lookup-by-mint?mint_number=${encodeURIComponent(mintNum.trim())}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setMintSearchError(data.error || "User not found");
        setMintSearchResult(null);
      } else if (data.user) {
        setMintSearchResult(data.user);
        setMintSearchError(null);
      } else {
        setMintSearchError("No user found with that Mint number");
      }
    } catch {
      setMintSearchError("Search failed. Please try again.");
    } finally {
      setMintSearching(false);
    }
  }, []);

  function handleMintSearchChange(val) {
    setMintSearch(val);
    setMintSearchResult(null);
    setMintSearchError(null);
    clearTimeout(mintDebounceRef.current);
    mintDebounceRef.current = setTimeout(() => searchByMintNumber(val), 600);
  }

  async function handleConfirm() {
    setStep("loading");
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const senderEmail = sessionData?.session?.user?.email?.toLowerCase() || "";
      if (senderEmail && recipientEmail.trim().toLowerCase() === senderEmail) {
        setError("You cannot gift to yourself.");
        setStep("confirming");
        return;
      }
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

      const mintNum = mintSearchResult?.mint_number || null;
      setPendingBeneficiary({ firstName: firstName.trim(), lastName: lastName.trim(), email: recipientEmail.trim().toLowerCase(), mintNumber: mintNum });
      setAskSaveBeneficiary(true);

      setGiftCode(data.token);
      setExpiresAt(data.expires_at);
      setStep("success");
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 1600);
      try {
        window.dispatchEvent(new Event("wallet-updated"));
        window.dispatchEvent(new Event("profile-updated"));
        window.dispatchEvent(new Event("financial-data-updated"));
      } catch {}
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

  const filteredBeneficiaries = beneficiaries.filter(b => {
    if (!beneficiarySearch.trim()) return true;
    const q = beneficiarySearch.toLowerCase();
    return (
      `${b.firstName} ${b.lastName}`.toLowerCase().includes(q) ||
      (b.mintNumber || "").toLowerCase().includes(q) ||
      (b.email || "").toLowerCase().includes(q)
    );
  });

  const avatarColor = (name) => {
    const colors = ["bg-violet-200 text-violet-700","bg-emerald-100 text-emerald-700","bg-sky-100 text-sky-700","bg-amber-100 text-amber-700","bg-rose-100 text-rose-700","bg-fuchsia-100 text-fuchsia-700"];
    const idx = (name?.charCodeAt(0) || 0) % colors.length;
    return colors[idx];
  };

  return (
    <div className="mt-4">
      {/* Toggle row */}
      <button
        type="button"
        onClick={() => handleToggle(!enabled)}
        className="w-full flex items-center justify-between rounded-2xl px-4 py-3.5 bg-white border border-slate-200 shadow-sm active:scale-[0.99] transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100">
            <Gift size={16} className="text-violet-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-800">Send as a gift</p>
            <p className="text-[11px] text-slate-400">Recipient claims with their SA ID + code</p>
          </div>
        </div>
        <div
          className={`relative w-[52px] h-[30px] rounded-full flex items-center transition-colors ${enabled ? "bg-violet-600" : "bg-slate-200"}`}
          style={{ padding: 3 }}
        >
          <motion.div
            animate={{ x: enabled ? 22 : 0 }}
            transition={{ type: "spring", stiffness: 700, damping: 35 }}
            className="w-6 h-6 rounded-full bg-white flex items-center justify-center"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }}
          >
            <AnimatePresence mode="wait">
              {enabled ? (
                <motion.div key="check" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <Check size={12} strokeWidth={3} className="text-violet-600" />
                </motion.div>
              ) : (
                <motion.div key="dot" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </button>

      {/* Bottom sheet */}
      <AnimatePresence>
        {enabled && step !== "success" && (
          <>
            {/* Backdrop */}
            <motion.div
              key="gift-backdrop"
              className="fixed inset-0 z-40 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={handleClose}
            />

            {/* Sheet */}
            <motion.div
              key="gift-sheet"
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl overflow-hidden"
              style={{ maxHeight: "92vh" }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-slate-200" />
              </div>

              {/* ── PICKER STEP ── */}
              {step === "picker" && (
                <div className="flex flex-col" style={{ maxHeight: "calc(92vh - 20px)" }}>
                  {/* Header */}
                  <div className="px-5 pt-2 pb-4">
                    <h2 className="text-center text-[17px] font-bold text-slate-900 mb-4">Beneficiary</h2>

                    {/* Search + Plus row */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={beneficiarySearch}
                          onChange={e => setBeneficiarySearch(e.target.value)}
                          placeholder="Search for beneficiary"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-violet-400 focus:bg-white transition-colors"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => { setInputMode("mint"); setStep("form"); }}
                        className="w-11 h-11 rounded-xl bg-[#e63946] flex items-center justify-center shrink-0 active:scale-95 transition-all shadow-sm"
                      >
                        <Plus size={20} className="text-white" strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>

                  {/* Beneficiary list */}
                  <div className="flex-1 overflow-y-auto px-5 pb-2">
                    {filteredBeneficiaries.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                          <User size={24} className="text-slate-300" />
                        </div>
                        <p className="text-sm font-semibold text-slate-500">No saved recipients yet</p>
                        <p className="text-[11px] text-slate-400 mt-1">Tap <span className="font-bold text-[#e63946]">+</span> to find someone by MINT number</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {filteredBeneficiaries.map((b, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleSelectBeneficiary(b)}
                            className="w-full flex items-center gap-3.5 py-3.5 active:bg-slate-50 transition-colors text-left"
                          >
                            <div className={`w-11 h-11 rounded-full flex items-center justify-center text-base font-bold shrink-0 ${avatarColor(b.firstName)}`}>
                              {b.firstName?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                                {b.firstName} {b.lastName}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                                {b.mintNumber ? `MINT: ${b.mintNumber}` : b.email}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cancel */}
                  <div className="px-5 pb-8 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="w-full rounded-2xl border border-[#e63946] py-3.5 text-sm font-bold text-[#e63946] active:scale-[0.98] transition-all"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              )}

              {/* ── FORM STEP ── */}
              {step === "form" && (
                <div className="flex flex-col" style={{ maxHeight: "calc(92vh - 20px)" }}>
                  {/* Header */}
                  <div className="flex items-center px-4 pt-2 pb-3">
                    <button
                      type="button"
                      onClick={() => { setMintSearchResult(null); setMintSearch(""); setMintSearchError(null); setStep("picker"); }}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <h2 className="flex-1 text-center text-[17px] font-bold text-slate-900">New recipient</h2>
                    <div className="w-8" />
                  </div>

                  <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
                    {/* Tab toggle */}
                    <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
                      <button
                        type="button"
                        onClick={() => { setInputMode("mint"); setMintSearch(""); setMintSearchResult(null); setMintSearchError(null); }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${inputMode === "mint" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
                      >
                        <Hash size={11} />MINT number
                      </button>
                      <button
                        type="button"
                        onClick={() => setInputMode("manual")}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${inputMode === "manual" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
                      >
                        <User size={11} />Enter details
                      </button>
                    </div>

                    {/* MINT number tab */}
                    {inputMode === "mint" && (
                      <div className="space-y-3">
                        {!mintSearchResult && (
                          <div>
                            <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">Search by MINT number</label>
                            <div className="relative">
                              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                              <input
                                type="text"
                                value={mintSearch}
                                onChange={e => handleMintSearchChange(e.target.value)}
                                placeholder="e.g. TSI5260100626"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-violet-400 focus:bg-white transition-colors"
                              />
                              {mintSearching && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-violet-200 border-t-violet-600 animate-spin" />
                              )}
                            </div>
                            {mintSearchError && (
                              <p className="text-[11px] text-red-500 mt-1.5 flex items-center gap-1">
                                <AlertCircle size={10} />{mintSearchError}
                              </p>
                            )}
                            <p className="text-[11px] text-slate-400 mt-2">Enter the recipient's MINT number to find them.</p>
                          </div>
                        )}

                        {mintSearchResult && (
                          <>
                            {/* Found user card */}
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-violet-50 border border-violet-100">
                              <div className={`w-11 h-11 rounded-full flex items-center justify-center text-base font-bold shrink-0 ${avatarColor(mintSearchResult.first_name)}`}>
                                {mintSearchResult.first_name?.[0]?.toUpperCase() || "?"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-800">{mintSearchResult.first_name} {mintSearchResult.last_name}</p>
                                <p className="text-[11px] text-slate-400 font-mono">{mintSearchResult.mint_number}</p>
                                <p className="text-[11px] text-slate-400 truncate">{mintSearchResult.email}</p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {!beneficiarySaved ? (
                                  <button
                                    type="button"
                                    onClick={() => setShowAddBeneficiaryPrompt(p => !p)}
                                    className="w-7 h-7 rounded-full bg-violet-200 flex items-center justify-center text-violet-700 hover:bg-violet-300 transition-colors font-bold text-base leading-none"
                                  >
                                    +
                                  </button>
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                    <Check size={12} className="text-emerald-600" strokeWidth={3} />
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => { setMintSearchResult(null); setMintSearch(""); setMintSearchError(null); setShowAddBeneficiaryPrompt(false); setBeneficiarySaved(false); }}
                                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            </div>

                            {/* Inline save prompt */}
                            {showAddBeneficiaryPrompt && !beneficiarySaved && (
                              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-violet-200">
                                <p className="text-[11px] text-slate-700 font-medium flex-1">
                                  Save <span className="font-semibold text-violet-700">{mintSearchResult.first_name}</span> as a recipient?
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    saveBeneficiary({ firstName: mintSearchResult.first_name, lastName: mintSearchResult.last_name, email: mintSearchResult.email, mintNumber: mintSearchResult.mint_number });
                                    setBeneficiaries(getBeneficiaries());
                                    setShowAddBeneficiaryPrompt(false);
                                    setBeneficiarySaved(true);
                                  }}
                                  className="px-3 py-1 rounded-lg bg-violet-600 text-white text-[11px] font-semibold active:scale-95 transition-all"
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowAddBeneficiaryPrompt(false)}
                                  className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-semibold active:scale-95 transition-all"
                                >
                                  No
                                </button>
                              </div>
                            )}

                            {/* Message */}
                            <div>
                              <label className="text-[11px] font-semibold text-slate-500 mb-1 block">
                                Personal message <span className="text-slate-300 font-normal">(optional)</span>
                              </label>
                              <textarea
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                placeholder="Add a personal note…"
                                rows={3}
                                maxLength={200}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-violet-400 focus:bg-white transition-colors resize-none"
                              />
                            </div>

                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              Your wallet is debited immediately. The recipient has 4 hours to claim.
                            </p>

                            <button
                              type="button"
                              onClick={() => {
                                setFirstName(mintSearchResult.first_name || "");
                                setLastName(mintSearchResult.last_name || "");
                                setRecipientEmail(mintSearchResult.email || "");
                                setStep("confirming");
                              }}
                              className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-[#1a1a2e] to-[#44296b] shadow-lg active:scale-[0.98] transition-all"
                            >
                              <Gift size={15} /> Continue
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Manual entry tab */}
                    {inputMode === "manual" && (
                      <div className="space-y-3">
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
                          Your wallet is debited immediately. The recipient has 4 hours to claim.
                        </p>
                        <button
                          type="button"
                          onClick={() => setStep("confirming")}
                          disabled={!canProceed}
                          className={`w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white transition-all active:scale-[0.98] ${canProceed ? "bg-gradient-to-r from-[#1a1a2e] to-[#44296b] shadow-lg" : "bg-slate-300 cursor-not-allowed"}`}
                        >
                          <Gift size={15} /> Continue
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── CONFIRMING STEP ── */}
              {step === "confirming" && (
                <div className="flex flex-col" style={{ maxHeight: "calc(92vh - 20px)" }}>
                  <div className="flex items-center px-4 pt-2 pb-3">
                    <button
                      type="button"
                      onClick={() => setStep("form")}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <h2 className="flex-1 text-center text-[17px] font-bold text-slate-900">Confirm gift</h2>
                    <div className="w-8" />
                  </div>

                  <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-4">
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-100">
                      <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-700">Your wallet will be debited immediately once you confirm.</p>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 space-y-2.5">
                      <Row label="To" value={`${firstName} ${lastName}`} />
                      <Row label="Email" value={recipientEmail.trim().toLowerCase()} />
                      <Row label="Asset" value={security?.name || security?.symbol} />
                      {amountDisplay && <Row label="Amount" value={amountDisplay} bold />}
                      {message && (
                        <div className="pt-2 border-t border-slate-200">
                          <p className="text-[11px] text-slate-400 mb-0.5">Message</p>
                          <p className="text-xs text-slate-600 italic">"{message}"</p>
                        </div>
                      )}
                    </div>

                    {error && (
                      <p className="text-xs text-red-500 flex items-center gap-1.5">
                        <AlertCircle size={11} />{error}
                      </p>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button type="button" onClick={() => setStep("form")} className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600 active:scale-[0.98] transition-all">
                        Edit
                      </button>
                      <button type="button" onClick={handleConfirm} className="flex-1 rounded-xl bg-gradient-to-r from-[#1a1a2e] to-[#44296b] py-3 text-sm font-semibold text-white active:scale-[0.98] transition-all shadow-lg">
                        Confirm & Send
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── LOADING STEP ── */}
              {step === "loading" && (
                <div className="flex flex-col items-center justify-center gap-4 py-16 px-5">
                  <div className="w-10 h-10 rounded-full border-2 border-violet-200 border-t-violet-600 animate-spin" />
                  <p className="text-sm text-slate-500 font-medium">Creating your gift…</p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── SUCCESS MODAL ── */}
      {enabled && step === "success" && giftCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(10,10,20,0.6)", backdropFilter: "blur(12px)", animation: "gtv-fade 0.3s ease forwards" }}>
          <style>{`
            @keyframes gtv-fade { from { opacity:0 } to { opacity:1 } }
            @keyframes gtv-slide { 0% { opacity:0; transform:translateY(40px) } 100% { opacity:1; transform:translateY(0) } }
          `}</style>

          <ConfettiBurst active={celebrate} />

          <div className="w-full max-w-sm" style={{ animation: "gtv-slide 0.5s cubic-bezier(0.16,1,0.3,1) forwards" }}>
            <div className="bg-white rounded-[28px] overflow-hidden" style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04)" }}>
              <div className="h-1 bg-gradient-to-r from-violet-500 via-fuchsia-400 to-violet-500" />

              <div className="px-6 pt-5 pb-5 relative">
                <button
                  type="button"
                  onClick={() => { resetForm(); onDone?.(); }}
                  className="absolute top-4 right-5 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                >
                  <X size={14} className="text-slate-500" />
                </button>

                <div className="flex justify-center mb-3">
                  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="12" y="38" width="56" height="34" rx="6" fill="url(#giftBox)" />
                    <rect x="8" y="30" width="64" height="14" rx="5" fill="url(#giftLid)" />
                    <rect x="36" y="30" width="8" height="42" rx="1" fill="#e9d5ff" opacity="0.6" />
                    <rect x="8" y="35" width="64" height="4" rx="1" fill="#e9d5ff" opacity="0.4" />
                    <path d="M40 30C40 30 32 14 24 18C16 22 28 30 40 30Z" fill="#f0abfc" opacity="0.8" />
                    <path d="M40 30C40 30 48 14 56 18C64 22 52 30 40 30Z" fill="#f0abfc" opacity="0.8" />
                    <defs>
                      <linearGradient id="giftBox" x1="12" y1="38" x2="68" y2="72" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#8b5cf6" /><stop offset="1" stopColor="#6d28d9" />
                      </linearGradient>
                      <linearGradient id="giftLid" x1="8" y1="30" x2="72" y2="44" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#a78bfa" /><stop offset="1" stopColor="#7c3aed" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Gift sent! 🎉</h3>
                  <p className="text-[13px] text-slate-500">
                    Share the code below with <span className="font-semibold text-slate-700">{firstName}</span>
                  </p>
                  {expiresAt && (
                    <p className="text-[11px] text-slate-400 mt-1">Expires {formatExpiry(expiresAt)}</p>
                  )}
                </div>

                {/* Ask save beneficiary prompt */}
                {askSaveBeneficiary && pendingBeneficiary && (
                  <div className="mb-4 px-3 py-2.5 rounded-xl bg-violet-50 border border-violet-100">
                    <p className="text-[11px] font-semibold text-violet-800 mb-2">
                      Save {pendingBeneficiary.firstName} as a recipient?
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          saveBeneficiary(pendingBeneficiary);
                          setBeneficiaries(getBeneficiaries());
                          setAskSaveBeneficiary(false);
                          setPendingBeneficiary(null);
                        }}
                        className="flex-1 rounded-lg bg-violet-600 py-1.5 text-[11px] font-semibold text-white active:scale-95 transition-all"
                      >
                        Yes, save
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAskSaveBeneficiary(false); setPendingBeneficiary(null); }}
                        className="flex-1 rounded-lg bg-white border border-violet-200 py-1.5 text-[11px] font-semibold text-violet-600 active:scale-95 transition-all"
                      >
                        No thanks
                      </button>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 mb-4">
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.12em] mb-2.5 text-center">Claim code</p>
                  <div className="flex justify-center gap-1.5">
                    {giftCode.split("").map((char, i) => (
                      <div
                        key={i}
                        className="w-9 h-11 rounded-xl bg-white border-2 border-slate-200 flex items-center justify-center text-[18px] font-black text-violet-700 shadow-sm"
                        style={{ fontFamily: "monospace", letterSpacing: "0" }}
                      >
                        {char}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all active:scale-[0.98] mb-2 ${copied ? "bg-emerald-500 text-white" : "bg-gradient-to-r from-[#1a1a2e] to-[#44296b] text-white shadow-lg"}`}
                >
                  {copied ? <Check size={15} strokeWidth={3} /> : <Copy size={15} />}
                  {copied ? "Copied!" : "Copy code"}
                </button>

                <button
                  type="button"
                  onClick={() => { resetForm(); onDone?.(); }}
                  className="w-full rounded-xl py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
