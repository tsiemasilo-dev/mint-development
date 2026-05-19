import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Gift, Copy, Check, Clock, CheckCircle2, XCircle, Timer, AlertTriangle, Sparkles, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

const HOME_BG = {
  backgroundColor: '#f8f6fa',
  backgroundImage: 'linear-gradient(180deg, #0d0d12 0%, #0e0a14 0.5%, #100b18 1%, #120c1c 1.5%, #150e22 2%, #181028 2.5%, #1c122f 3%, #201436 3.5%, #25173e 4%, #2a1a46 5%, #301d4f 6%, #362158 7%, #3d2561 8%, #44296b 9%, #4c2e75 10%, #54337f 11%, #5d3889 12%, #663e93 13%, #70449d 14%, #7a4aa7 15%, #8451b0 16%, #8e58b9 17%, #9860c1 18%, #a268c8 19%, #ac71ce 20%, #b57ad3 21%, #be84d8 22%, #c68edc 23%, #cd98e0 24%, #d4a2e3 25%, #daace6 26%, #dfb6e9 27%, #e4c0eb 28%, #e8c9ed 29%, #ecd2ef 30%, #efdaf1 31%, #f2e1f3 32%, #f4e7f5 33%, #f6ecf7 34%, #f8f0f9 35%, #f9f3fa 36%, #faf5fb 38%, #fbf7fc 40%, #fcf9fd 42%, #fdfafd 45%, #faf8fc 55%, #f8f6fa 100%)',
  backgroundRepeat: 'no-repeat',
  backgroundSize: '100% 100vh',
};

const fmt = (cents) =>
  `R${(Number(cents) / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const listItem = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: (i) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.06, type: "spring", stiffness: 300, damping: 28 },
  }),
  exit: { opacity: 0, y: -10, scale: 0.97, transition: { duration: 0.2 } },
};

const tabContent = {
  initial: { opacity: 0, x: 10 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, x: -10, transition: { duration: 0.15 } },
};

function useCountdown(expiresAt) {
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(expiresAt) - Date.now()));

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => {
      const left = Math.max(0, new Date(expiresAt) - Date.now());
      setRemaining(left);
      if (left === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  const isExpired = remaining === 0;
  const isLow = remaining > 0 && remaining < 60 * 60 * 1000;

  return { h, m, s, isExpired, isLow, remaining };
}

function CountdownBadge({ expiresAt }) {
  const { h, m, s, isExpired, isLow } = useCountdown(expiresAt);
  if (isExpired) return <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">Expired</span>;
  const label = h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${isLow ? "text-red-600 bg-red-50" : "text-violet-600 bg-violet-50"}`}>
      <Timer size={10} />{label}
    </span>
  );
}

function ClaimCodeDisplay({ code }) {
  const isShortCode = /^\d{4,8}$/.test(code);
  if (isShortCode) {
    return (
      <div className="flex justify-center gap-1.5">
        {String(code).split("").map((digit, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, type: "spring", stiffness: 400, damping: 25 }}
            className="w-9 h-11 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm"
          >
            <span className="text-lg font-bold text-slate-900 font-mono">{digit}</span>
          </motion.div>
        ))}
      </div>
    );
  }
  return (
    <p className="text-[11px] font-mono text-slate-500 break-all leading-relaxed bg-white rounded-lg px-3 py-2 border border-slate-100 text-center">{code}</p>
  );
}

function ActiveGiftCard({ gift, onExtend, onCancel }) {
  const [copied, setCopied] = useState(false);
  const [extending, setExtending] = useState(null);
  const { isLow, isExpired } = useCountdown(gift.expires_at);
  const recipientName = gift.recipient_name || gift.recipient_first_name || null;

  function handleCopy() {
    navigator.clipboard.writeText(gift.token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleExtend(ext) {
    setExtending(ext);
    await onExtend(gift.id, ext);
    setExtending(null);
  }

  return (
    <motion.div
      layout
      className="bg-white rounded-2xl overflow-hidden"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(124,58,237,0.06)" }}
    >
      <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-400" />
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-md shadow-violet-200/50">
                <Gift size={20} className="text-white" />
              </div>
              {!isExpired && (
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-slate-900 truncate">{gift.asset_name}</p>
              {recipientName && <p className="text-xs text-slate-400 mt-0.5">To {recipientName}</p>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-extrabold text-slate-900 tabular-nums">{fmt(gift.amount)}</p>
            <div className="mt-1.5"><CountdownBadge expiresAt={gift.expires_at} /></div>
          </div>
        </div>

        {gift.personal_message && (
          <div className="bg-violet-50/50 rounded-xl px-4 py-2.5 border border-violet-100/50">
            <p className="text-xs text-violet-600 italic leading-relaxed">"{gift.personal_message}"</p>
          </div>
        )}

        <div className="bg-gradient-to-b from-slate-50/80 to-white rounded-2xl p-4 border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.14em] mb-3 text-center">Claim code</p>
          <ClaimCodeDisplay code={gift.token} />
          <motion.button
            onClick={handleCopy}
            whileTap={{ scale: 0.97 }}
            className="mt-3 w-full flex items-center justify-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all"
            style={{
              background: copied ? "#059669" : "#0f172a",
              color: "#fff",
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={copied ? "check" : "copy"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Copied!" : "Copy Code"}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {!isExpired && (
        <div className="px-5 pb-5 space-y-3">
          <AnimatePresence>
            {isLow && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-center gap-2 bg-amber-50 rounded-xl py-2.5 px-3 border border-amber-100"
              >
                <AlertTriangle size={12} className="text-amber-500 shrink-0" />
                <p className="text-[11px] font-semibold text-amber-700">Expiring soon — extend to keep active</p>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex gap-2">
            {[
              { key: "10h", label: "+10h", fee: Math.round(gift.amount * 0.05) },
              { key: "24h", label: "+24h", fee: Math.round(gift.amount * 0.09) },
            ].map(opt => (
              <motion.button
                key={opt.key}
                onClick={() => handleExtend(opt.key)}
                disabled={!!extending}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-xs font-semibold text-slate-700 disabled:opacity-50 transition-colors hover:border-violet-200 hover:bg-violet-50/30"
              >
                {extending === opt.key ? (
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  >Extending…</motion.span>
                ) : (
                  <span>{opt.label} <span className="text-slate-400 font-normal">({fmt(opt.fee)})</span></span>
                )}
              </motion.button>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 text-center leading-relaxed">Fees are charged from your wallet and added to the gift value</p>
        </div>
      )}

      <div className="border-t border-slate-100 px-5 py-3 flex justify-end">
        <motion.button
          onClick={() => onCancel(gift.id)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          className="text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors px-3 py-1 rounded-lg hover:bg-red-50"
        >
          Cancel gift
        </motion.button>
      </div>
    </motion.div>
  );
}

const HISTORY_META = {
  claimed: { label: "Claimed", color: "text-emerald-700", pillBg: "bg-emerald-50 border-emerald-200/60", iconBg: "from-emerald-400 to-teal-500", statusIcon: CheckCircle2, stripe: "from-emerald-400 via-emerald-500 to-teal-400" },
  expired: { label: "Expired", color: "text-amber-700", pillBg: "bg-amber-50 border-amber-200/60", iconBg: "from-amber-400 to-orange-500", statusIcon: Clock, stripe: "from-amber-400 via-orange-400 to-amber-300" },
  cancelled: { label: "Cancelled", color: "text-red-600", pillBg: "bg-red-50 border-red-200/60", iconBg: "from-red-400 to-rose-500", statusIcon: XCircle, stripe: "from-red-400 via-rose-400 to-red-300" },
};

function HistoryCard({ gift, onClaimToSelf }) {
  const meta = HISTORY_META[gift.status] || HISTORY_META.expired;
  const StatusIcon = meta.statusIcon;
  const sentDate = gift.created_at ? new Date(gift.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : null;
  const [claiming, setClaiming] = useState(false);
  const canClaimToSelf = gift.status === "expired" || gift.status === "cancelled";

  async function handleClaimToSelf() {
    if (!window.confirm(`Add ${gift.asset_name} to your own portfolio? ${fmt(gift.amount)} will be deducted from your wallet.`)) return;
    setClaiming(true);
    const success = await onClaimToSelf(gift.id);
    if (!success) setClaiming(false);
  }

  return (
    <motion.div
      layout
      className="rounded-2xl overflow-hidden bg-white"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05), 0 4px 14px rgba(0,0,0,0.04)" }}
    >
      <div className={`h-[3px] bg-gradient-to-r ${meta.stripe}`} />

      <div className="p-5">
        <div className="flex items-center gap-3.5">
          <div className="relative shrink-0">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${meta.iconBg} flex items-center justify-center shadow-md`}
              style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
            >
              <Gift size={20} className="text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm">
              <StatusIcon size={12} className={meta.color} />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-slate-900 truncate">{gift.asset_name}</p>
                {(gift.recipient_name || gift.recipient_first_name) && (
                  <p className="text-[12px] text-slate-400 mt-0.5">To {gift.recipient_name || gift.recipient_first_name}</p>
                )}
              </div>
              <p className="text-[15px] font-extrabold text-slate-900 tabular-nums shrink-0">{fmt(gift.amount)}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between bg-slate-50/80 rounded-xl px-3.5 py-2.5">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${meta.pillBg} ${meta.color}`}>
            <StatusIcon size={11} />
            {meta.label}
          </div>
          {sentDate && (
            <div className="flex items-center gap-1.5">
              <Clock size={10} className="text-slate-300" />
              <p className="text-[11px] text-slate-400 font-medium">{sentDate}</p>
            </div>
          )}
        </div>
      </div>

      {canClaimToSelf && (
        <div className="px-5 pb-5 space-y-2.5">
          <motion.button
            onClick={handleClaimToSelf}
            disabled={claiming}
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #312e81 50%, #44296b 100%)", boxShadow: "0 4px 14px rgba(49,46,129,0.3)" }}
          >
            {claiming ? (
              <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.2, repeat: Infinity }}>
                Adding to portfolio…
              </motion.span>
            ) : (
              <>
                <Sparkles size={14} className="text-violet-300" />
                <span>Add to my portfolio</span>
                <ArrowRight size={14} className="text-white/40 ml-0.5" />
              </>
            )}
          </motion.button>
          <p className="text-[10px] text-slate-400 text-center">{fmt(gift.amount)} will be deducted from your wallet</p>
        </div>
      )}
    </motion.div>
  );
}

export default function SentGiftsPageV2({ onBack }) {
  const [active, setActive] = useState([]);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadGifts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const res = await fetch("/api/gift/sent", {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setActive(data.active || []);
      setHistory(data.history || []);
    } catch (e) {
      setError(e.message || "Failed to load gifts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGifts(); }, [loadGifts]);

  async function handleExtend(giftId, extension) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const res = await fetch("/api/gift/extend", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({ gift_id: giftId, extension }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { alert(data.error || "Failed to extend."); return; }
      setActive(prev => prev.map(g => g.id === giftId ? { ...g, expires_at: data.new_expires_at, amount: g.amount + (data.fee_charged || 0) } : g));
    } catch { alert("Something went wrong. Please try again."); }
  }

  async function handleCancel(giftId) {
    if (!window.confirm("Cancel this gift? The held amount will be returned to your wallet.")) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const res = await fetch("/api/gift/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({ gift_id: giftId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { alert(data.error || "Failed to cancel."); return; }
      const cancelled = active.find(g => g.id === giftId);
      if (cancelled) {
        setActive(prev => prev.filter(g => g.id !== giftId));
        setHistory(prev => [{ ...cancelled, status: "cancelled" }, ...prev]);
      }
    } catch { alert("Something went wrong."); }
  }

  async function handleClaimToSelf(giftId) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const res = await fetch("/api/gift/claim-to-self", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({ gift_id: giftId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { alert(data.error || "Failed to add to portfolio."); return false; }
      setHistory(prev => prev.map(g => g.id === giftId ? { ...g, status: "claimed" } : g));
      alert(`${data.asset_name} has been added to your portfolio!`);
      return true;
    } catch { alert("Something went wrong."); return false; }
  }

  const items = tab === "active" ? active : history;

  return (
    <div className="min-h-screen" style={HOME_BG}>
      <header className="rounded-b-[36px] bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 pb-8 pt-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #fff 1px, transparent 1px), radial-gradient(circle at 60% 80%, #fff 0.5px, transparent 0.5px)", backgroundSize: "120px 120px, 80px 80px, 60px 60px" }} />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <motion.button
              onClick={onBack}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 -ml-2 rounded-xl hover:bg-white/10 transition-colors"
            >
              <ArrowLeft size={20} />
            </motion.button>
            <h1 className="text-lg font-bold flex-1">Sent Gifts</h1>
            <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
              <Gift size={12} className="text-violet-300" />
              <span className="text-[11px] font-semibold text-white/80">{active.length + history.length} total</span>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="relative flex bg-white/[0.08] backdrop-blur-md rounded-2xl p-1 w-full max-w-[260px] border border-white/10">
              <motion.div
                className="absolute top-1 bottom-1 rounded-xl bg-white"
                initial={false}
                animate={{ left: tab === "active" ? 4 : "50%", width: "calc(50% - 4px)" }}
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
                style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
              />
              {["active", "history"].map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="relative z-10 flex-1 py-2.5 text-[13px] font-semibold transition-colors duration-200 capitalize flex items-center justify-center gap-1.5"
                  style={{ color: tab === t ? "#1e1b4b" : "rgba(255,255,255,0.55)" }}
                >
                  {t}
                  {t === "active" && active.length > 0 && (
                    <motion.span
                      layout
                      className={`text-[10px] rounded-full min-w-[18px] text-center px-1 py-0.5 ${tab === t ? "bg-violet-100 text-violet-700" : "bg-white/15 text-white/70"}`}
                    >{active.length}</motion.span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-5 max-w-lg mx-auto">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <motion.div
              className="w-10 h-10 rounded-full border-[3px] border-violet-200 border-t-violet-600"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            />
            <p className="text-xs text-slate-400">Loading gifts…</p>
          </div>
        )}

        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 text-center shadow-sm mt-4"
          >
            <p className="text-red-600 text-sm mb-3">{error}</p>
            <motion.button
              onClick={loadGifts}
              whileTap={{ scale: 0.97 }}
              className="text-xs font-semibold text-violet-600 bg-violet-50 px-4 py-2 rounded-lg"
            >
              Try again
            </motion.button>
          </motion.div>
        )}

        {!loading && !error && (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              variants={tabContent}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-3"
            >
              {items.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  className="bg-white rounded-2xl p-10 text-center mt-4"
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(124,58,237,0.06)" }}
                >
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${tab === "active" ? "bg-violet-50" : "bg-slate-50"}`}>
                    {tab === "active" ? <Gift size={26} className="text-violet-400" /> : <Clock size={26} className="text-slate-300" />}
                  </div>
                  <h2 className="text-sm font-bold text-slate-800 mb-1">
                    {tab === "active" ? "No active gifts" : "No gift history"}
                  </h2>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-[220px] mx-auto">
                    {tab === "active"
                      ? "When you send a gift, it will appear here with its claim code."
                      : "Claimed, expired, and cancelled gifts appear here."}
                  </p>
                </motion.div>
              ) : (
                items.map((g, i) => (
                  <motion.div
                    key={g.id}
                    custom={i}
                    variants={listItem}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    {tab === "active"
                      ? <ActiveGiftCard gift={g} onExtend={handleExtend} onCancel={handleCancel} />
                      : <HistoryCard gift={g} onClaimToSelf={handleClaimToSelf} />
                    }
                  </motion.div>
                ))
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
