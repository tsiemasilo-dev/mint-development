import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Gift, Copy, Check, Clock, CheckCircle2, XCircle, Timer } from "lucide-react";
import { supabase } from "../lib/supabase";

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
  const isLow = remaining > 0 && remaining < 60 * 60 * 1000; // < 1h

  return { h, m, s, isExpired, isLow, remaining };
}

function CountdownBadge({ expiresAt }) {
  const { h, m, s, isExpired, isLow } = useCountdown(expiresAt);
  if (isExpired) return <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Expired</span>;
  const label = h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${isLow ? "text-red-600 bg-red-50" : "text-violet-700 bg-violet-50"}`}>
      <Timer size={10} />{label}
    </span>
  );
}

function ActiveGiftCard({ gift, onExtend, onCancel }) {
  const [copied, setCopied] = useState(false);
  const [extending, setExtending] = useState(null);
  const { isLow, isExpired } = useCountdown(gift.expires_at);

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
    <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{gift.asset_name}</p>
          <p className="text-xs text-slate-500 mt-0.5">To: {gift.recipient_name || "Recipient"}</p>
          {gift.personal_message && (
            <p className="text-xs text-slate-400 italic mt-0.5 line-clamp-1">"{gift.personal_message}"</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-base font-bold text-slate-800">{fmt(gift.amount)}</p>
          <div className="mt-1"><CountdownBadge expiresAt={gift.expires_at} /></div>
        </div>
      </div>

      {/* Code display */}
      <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between gap-3">
        <p className="text-xl font-black tracking-[0.35em] text-slate-900 font-mono">{gift.token}</p>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition-all shrink-0"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {/* Extension buttons — shown when < 1h or always */}
      {!isExpired && (
        <div className="space-y-2">
          {isLow && (
            <p className="text-xs font-semibold text-amber-700 text-center">Expiring soon — extend to keep active</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => handleExtend("10h")}
              disabled={!!extending}
              className="flex-1 rounded-xl border border-violet-200 bg-violet-50 py-2 text-xs font-semibold text-violet-700 active:scale-95 transition-all disabled:opacity-60"
            >
              {extending === "10h" ? "…" : "+10h — 5% fee"}
            </button>
            <button
              onClick={() => handleExtend("24h")}
              disabled={!!extending}
              className="flex-1 rounded-xl border border-violet-200 bg-violet-50 py-2 text-xs font-semibold text-violet-700 active:scale-95 transition-all disabled:opacity-60"
            >
              {extending === "24h" ? "…" : "+24h — 9% fee"}
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-1">
        <button
          onClick={() => onCancel(gift.id)}
          className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
        >
          Cancel gift
        </button>
      </div>
    </div>
  );
}

const HISTORY_META = {
  claimed: { label: "Claimed", color: "text-emerald-700 bg-emerald-50", icon: CheckCircle2 },
  expired: { label: "Expired", color: "text-slate-500 bg-slate-100", icon: Clock },
  cancelled: { label: "Cancelled", color: "text-red-600 bg-red-50", icon: XCircle },
};

function HistoryCard({ gift }) {
  const meta = HISTORY_META[gift.status] || HISTORY_META.expired;
  const Icon = meta.icon;
  const sentDate = gift.created_at ? new Date(gift.created_at).toLocaleDateString("en-ZA") : null;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{gift.asset_name}</p>
        <p className="text-xs text-slate-500 mt-0.5">To: {gift.recipient_name || "Recipient"}</p>
        {sentDate && <p className="text-xs text-slate-400 mt-0.5">Sent {sentDate}</p>}
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-slate-800">{fmt(gift.amount)}</p>
        <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
          <Icon size={10} />{meta.label}
        </div>
      </div>
    </div>
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
      setActive(prev => prev.map(g => g.id === giftId ? { ...g, expires_at: data.new_expires_at } : g));
    } catch { alert("Something went wrong. Please try again."); }
  }

  async function handleCancel(giftId) {
    if (!window.confirm("Cancel this gift? No refund will be issued.")) return;
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

  return (
    <div className="min-h-screen bg-[#f8f6fa]">
      <div className="bg-white px-4 pt-12 pb-4 flex items-center gap-3 shadow-sm">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
          <ArrowLeft size={20} className="text-slate-700" />
        </button>
        <h1 className="text-lg font-bold text-slate-800">Sent Gifts</h1>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-4">
        <div className="flex bg-slate-100 rounded-2xl p-1 max-w-xs">
          {["active", "history"].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${tab === t ? "bg-white shadow-sm text-slate-800" : "text-slate-500"}`}
            >
              {t}
              {t === "active" && active.length > 0 && (
                <span className="ml-1.5 bg-violet-600 text-white text-xs rounded-full px-1.5 py-0.5">{active.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-5 max-w-lg mx-auto space-y-3">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
          </div>
        )}
        {error && !loading && (
          <div className="bg-red-50 rounded-2xl p-5 text-center">
            <p className="text-red-600 text-sm">{error}</p>
            <button onClick={loadGifts} className="mt-3 text-xs font-semibold text-red-500">Try again</button>
          </div>
        )}

        {!loading && !error && tab === "active" && (
          active.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
                <Gift size={24} className="text-violet-500" />
              </div>
              <h2 className="text-base font-bold text-slate-800 mb-1">No active gifts</h2>
              <p className="text-sm text-slate-400">Active gifts and their claim codes appear here.</p>
            </div>
          ) : (
            active.map(g => (
              <ActiveGiftCard key={g.id} gift={g} onExtend={handleExtend} onCancel={handleCancel} />
            ))
          )
        )}

        {!loading && !error && tab === "history" && (
          history.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center shadow-sm">
              <p className="text-sm text-slate-400">No gift history yet.</p>
            </div>
          ) : (
            history.map(g => <HistoryCard key={g.id} gift={g} />)
          )
        )}
      </div>
    </div>
  );
}
