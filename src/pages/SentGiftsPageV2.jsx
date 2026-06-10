import React, { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Gift, Copy, Check, Clock, CheckCircle2, XCircle, Timer } from "lucide-react";
import { supabase } from "../lib/supabase";

const HOME_BG = {
  backgroundColor: '#f8f6fa',
  backgroundImage: 'linear-gradient(180deg, #0d0d12 0%, #0e0a14 0.5%, #100b18 1%, #120c1c 1.5%, #150e22 2%, #181028 2.5%, #1c122f 3%, #201436 3.5%, #25173e 4%, #2a1a46 5%, #301d4f 6%, #362158 7%, #3d2561 8%, #44296b 9%, #4c2e75 10%, #54337f 11%, #5d3889 12%, #663e93 13%, #70449d 14%, #7a4aa7 15%, #8451b0 16%, #8e58b9 17%, #9860c1 18%, #a268c8 19%, #ac71ce 20%, #b57ad3 21%, #be84d8 22%, #c68edc 23%, #cd98e0 24%, #d4a2e3 25%, #daace6 26%, #dfb6e9 27%, #e4c0eb 28%, #e8c9ed 29%, #ecd2ef 30%, #efdaf1 31%, #f2e1f3 32%, #f4e7f5 33%, #f6ecf7 34%, #f8f0f9 35%, #f9f3fa 36%, #faf5fb 38%, #fbf7fc 40%, #fcf9fd 42%, #fdfafd 45%, #faf8fc 55%, #f8f6fa 100%)',
  backgroundRepeat: 'no-repeat',
  backgroundSize: '100% 100vh',
};

const fmt = (cents) =>
  `R${(Number(cents) / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${isLow ? "text-red-600 bg-red-50" : "text-slate-600 bg-slate-100"}`}>
      <Timer size={10} />{label}
    </span>
  );
}

function ActiveGiftCard({ gift, onExtend, onCancel }) {
  const [copied, setCopied] = useState(false);
  const [extending, setExtending] = useState(null);
  const [extendedKey, setExtendedKey] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { isLow, isExpired } = useCountdown(gift.expires_at);

  const fee10 = Math.round((gift.amount || 0) * 0.05);
  const fee24 = Math.round((gift.amount || 0) * 0.09);

  function handleCopy() {
    navigator.clipboard.writeText(gift.token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleExtend(ext) {
    setExtending(ext);
    setExtendedKey(null);
    const success = await onExtend(gift.id, ext);
    setExtending(null);
    if (success) {
      setExtendedKey(ext);
      setTimeout(() => setExtendedKey(null), 2500);
    }
  }

  async function handleCancelConfirm() {
    setCancelling(true);
    await onCancel(gift.id);
    setCancelling(false);
    setShowCancelConfirm(false);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
              <Gift size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{gift.asset_name}</p>
              <p className="text-xs text-slate-400 mt-0.5">To: {gift.recipient_name || "Recipient"}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-slate-800">{fmt(gift.amount)}</p>
            <div className="mt-1"><CountdownBadge expiresAt={gift.expires_at} /></div>
          </div>
        </div>

        {gift.personal_message && (
          <p className="text-xs text-slate-400 italic line-clamp-1 pl-[52px]">"{gift.personal_message}"</p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-amber-700 bg-amber-50">
            <Clock size={10} />Waiting to be claimed
          </span>
          {gift.extension_fees > 0 && (
            <span className="text-[11px] text-slate-400">Fees paid: {fmt(gift.extension_fees)}</span>
          )}
        </div>

        <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between gap-3">
          <p className="text-lg font-black tracking-[0.3em] text-slate-900 font-mono">{gift.token}</p>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-semibold px-3.5 py-2 rounded-lg active:scale-95 transition-all shrink-0"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {!isExpired && (
        <div className="px-4 pb-4 space-y-2">
          {isLow && (
            <p className="text-[11px] font-semibold text-amber-700 text-center">Expiring soon — extend to keep active</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => handleExtend("10h")}
              disabled={!!extending}
              className={`flex-1 rounded-xl border py-2.5 text-xs font-semibold active:scale-95 transition-all disabled:opacity-60 ${extendedKey === "10h" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-700"}`}
            >
              {extending === "10h" ? "Extending…" : extendedKey === "10h" ? "✓ Extended" : `+10 hours (${fmt(fee10)})`}
            </button>
            <button
              onClick={() => handleExtend("24h")}
              disabled={!!extending}
              className={`flex-1 rounded-xl border py-2.5 text-xs font-semibold active:scale-95 transition-all disabled:opacity-60 ${extendedKey === "24h" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-700"}`}
            >
              {extending === "24h" ? "Extending…" : extendedKey === "24h" ? "✓ Extended" : `+24 hours (${fmt(fee24)})`}
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-slate-100 px-4 py-2.5">
        {showCancelConfirm ? (
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-500 flex-1">Cancel this gift?</p>
            <button
              onClick={() => setShowCancelConfirm(false)}
              disabled={cancelling}
              className="text-xs font-semibold text-slate-500 px-3 py-1.5 rounded-lg bg-slate-100 active:scale-95 transition-all"
            >
              Keep
            </button>
            <button
              onClick={handleCancelConfirm}
              disabled={cancelling}
              className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg bg-red-500 active:scale-95 transition-all disabled:opacity-60"
            >
              {cancelling ? "Cancelling…" : "Yes, cancel"}
            </button>
          </div>
        ) : (
          <div className="flex justify-end">
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
            >
              Cancel gift
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const HISTORY_META = {
  claimed: { label: "Claimed", color: "text-emerald-700 bg-emerald-50", icon: CheckCircle2 },
  expired: { label: "Expired", color: "text-slate-500 bg-slate-100", icon: Clock },
  cancelled: { label: "Cancelled", color: "text-red-600 bg-red-50", icon: XCircle },
};

function HistoryCard({ gift, onClaimToSelf }) {
  const meta = HISTORY_META[gift.status] || HISTORY_META.expired;
  const Icon = meta.icon;
  const sentDate = gift.created_at ? new Date(gift.created_at).toLocaleDateString("en-ZA") : null;
  const claimedDate = gift.claimed_at ? new Date(gift.claimed_at).toLocaleDateString("en-ZA") : null;
  const [claiming, setClaiming] = useState(false);
  const canClaimToSelf = gift.status === "expired" || gift.status === "cancelled";
  const isClaimed = gift.status === "claimed";

  async function handleClaimToSelf() {
    if (!window.confirm(`Add ${gift.asset_name} to your own portfolio? R${(gift.amount / 100).toFixed(2)} will be deducted from your wallet.`)) return;
    setClaiming(true);
    const success = await onClaimToSelf(gift.id);
    if (!success) setClaiming(false);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isClaimed ? "bg-emerald-50" : "bg-slate-100"}`}>
              <Gift size={16} className={isClaimed ? "text-emerald-500" : "text-slate-400"} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{gift.asset_name}</p>
              <p className="text-xs text-slate-400 mt-0.5">To: {gift.recipient_name || "Recipient"}</p>
              {sentDate && <p className="text-[11px] text-slate-300 mt-0.5">Sent {sentDate}</p>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-slate-800">{fmt(gift.amount)}</p>
            <div className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${meta.color}`}>
              <Icon size={10} />{meta.label}
            </div>
          </div>
        </div>

        {isClaimed && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
            <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
            <p className="text-xs text-slate-600">
              <span className="font-semibold">{gift.recipient_name || "Recipient"}</span> claimed this gift
              {claimedDate && <span className="text-slate-400"> · {claimedDate}</span>}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ReceivedActiveCard({ gift, onClaim }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
              <Gift size={16} className="text-violet-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{gift.asset_name}</p>
              <p className="text-xs text-slate-400 mt-0.5">From: {gift.sender_name || "Someone"}</p>
              {gift.personal_message && (
                <p className="text-xs text-slate-500 mt-1 italic">"{gift.personal_message}"</p>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-slate-800">{fmt(gift.amount)}</p>
            <div className="mt-1.5">
              <CountdownBadge expiresAt={gift.expires_at} />
            </div>
          </div>
        </div>
      </div>
      {gift.unclaimed ? (
        <button
          onClick={() => onClaim?.()}
          className="w-full border-t border-violet-100 px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-bold text-center active:opacity-80 transition-opacity"
        >
          Claim Gift →
        </button>
      ) : (
        <div className="border-t border-violet-100 px-4 py-2.5 bg-violet-50/50">
          <p className="text-[11px] text-violet-600 font-medium">Investment pending in your portfolio</p>
        </div>
      )}
    </div>
  );
}

const RECEIVED_HISTORY_META = {
  claimed: { label: "Claimed", color: "text-emerald-700 bg-emerald-50", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "text-red-600 bg-red-50", icon: XCircle },
  expired: { label: "Expired", color: "text-slate-500 bg-slate-100", icon: Clock },
};

function ReceivedHistoryCard({ gift }) {
  const claimedDate = gift.claimed_at ? new Date(gift.claimed_at).toLocaleDateString("en-ZA") : null;
  const isClaimed = gift.status === "claimed";
  const meta = RECEIVED_HISTORY_META[gift.status] || RECEIVED_HISTORY_META.expired;
  const Icon = meta.icon;
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isClaimed ? "bg-emerald-50" : "bg-slate-100"}`}>
              <Gift size={16} className={isClaimed ? "text-emerald-500" : "text-slate-400"} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{gift.asset_name}</p>
              <p className="text-xs text-slate-400 mt-0.5">From: {gift.sender_name || "Someone"}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-slate-800">{fmt(gift.amount)}</p>
            <div className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${meta.color}`}>
              <Icon size={10} />{meta.label}
            </div>
          </div>
        </div>
        {isClaimed && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
            <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
            <p className="text-xs text-slate-600">
              You claimed this gift
              {claimedDate && <span className="text-slate-400"> · {claimedDate}</span>}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SentGiftsPageV2({ onBack, onNavigate }) {
  const [sentActive, setSentActive] = useState([]);
  const [sentHistory, setSentHistory] = useState([]);
  const [receivedActive, setReceivedActive] = useState([]);
  const [receivedHistory, setReceivedHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  const fetchGiftData = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
    const [sentRes, receivedRes] = await Promise.all([
      fetch("/api/gift/sent", { headers }),
      fetch("/api/gift/received", { headers }),
    ]);
    const [sentData, receivedData] = await Promise.all([sentRes.json(), receivedRes.json()]);
    if (sentData.error) throw new Error(sentData.error);
    setSentActive(sentData.active || []);
    setSentHistory(sentData.history || []);
    setReceivedActive(receivedData.active || []);
    setReceivedHistory(receivedData.history || []);
  }, []);

  const loadGifts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchGiftData();
    } catch (e) {
      setError(e.message || "Failed to load gifts.");
    } finally {
      setLoading(false);
    }
  }, [fetchGiftData]);

  useEffect(() => {
    loadGifts();
    pollRef.current = setInterval(() => { fetchGiftData().catch(() => {}); }, 15000);
    return () => clearInterval(pollRef.current);
  }, [loadGifts, fetchGiftData]);

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
      if (!res.ok || data.error) { alert(data.error || "Failed to extend."); return false; }
      setSentActive(prev => prev.map(g => {
        if (g.id !== giftId) return g;
        const feeAdded = extension === "10h" ? Math.round((g.amount || 0) * 0.05) : Math.round((g.amount || 0) * 0.09);
        return { ...g, expires_at: data.new_expires_at, extension_fees: (g.extension_fees || 0) + feeAdded };
      }));
      return true;
    } catch { alert("Something went wrong. Please try again."); return false; }
  }

  async function handleCancel(giftId) {
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
      const cancelled = sentActive.find(g => g.id === giftId);
      if (cancelled) {
        setSentActive(prev => prev.filter(g => g.id !== giftId));
        setSentHistory(prev => [{ ...cancelled, status: "cancelled" }, ...prev]);
      }
    } catch { alert("Something went wrong."); }
  }

  const hasAnything = sentActive.length > 0 || sentHistory.length > 0 || receivedActive.length > 0 || receivedHistory.length > 0;

  const HISTORY_PAGE_SIZE = 5;
  const [historyPage, setHistoryPage] = useState(1);
  const allHistory = [...receivedHistory, ...sentHistory];
  const visibleHistory = allHistory.slice(0, historyPage * HISTORY_PAGE_SIZE);
  const hasMoreHistory = visibleHistory.length < allHistory.length;

  return (
    <div className="min-h-screen" style={HOME_BG}>
      <header className="rounded-b-[36px] bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 pb-6 pt-12 text-white">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-white/10 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Gifts</h1>
          </div>
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
            <Gift size={16} className="text-white/80" />
          </div>
        </div>
      </header>

      <div className="px-4 py-5 max-w-lg mx-auto space-y-6">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
          </div>
        )}

        {error && !loading && (
          <div className="bg-white rounded-2xl p-5 text-center shadow-sm">
            <p className="text-red-600 text-sm">{error}</p>
            <button onClick={loadGifts} className="mt-3 text-xs font-semibold text-violet-600">Try again</button>
          </div>
        )}

        {!loading && !error && !hasAnything && (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Gift size={22} className="text-slate-400" />
            </div>
            <h2 className="text-sm font-bold text-slate-800 mb-1">No gifts yet</h2>
            <p className="text-xs text-slate-400">Gifts you send or receive will appear here.</p>
          </div>
        )}

        {!loading && !error && receivedActive.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Received</p>
            {receivedActive.map(g => (
              <ReceivedActiveCard
                key={g.id}
                gift={g}
                onClaim={() => onNavigate?.("giftClaim")}
              />
            ))}
          </div>
        )}

        {!loading && !error && sentActive.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sent — Active</p>
            {sentActive.map(g => (
              <ActiveGiftCard key={g.id} gift={g} onExtend={handleExtend} onCancel={handleCancel} />
            ))}
          </div>
        )}

        {!loading && !error && allHistory.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              History <span className="text-slate-400 normal-case font-normal">({allHistory.length})</span>
            </p>
            {visibleHistory.map(g =>
              g.sender_name !== undefined
                ? <ReceivedHistoryCard key={g.id} gift={g} />
                : <HistoryCard key={g.id} gift={g} />
            )}
            {hasMoreHistory && (
              <button
                onClick={() => setHistoryPage(p => p + 1)}
                className="w-full py-3 rounded-2xl bg-white border border-slate-200 text-xs font-semibold text-slate-600 shadow-sm active:scale-95 transition-all"
              >
                Show more ({allHistory.length - visibleHistory.length} remaining)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
