import React, { useState, useEffect } from "react";
import { ArrowLeft, Gift, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase";

const fmt = (cents) =>
  `R${(Number(cents) / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_META = {
  pending_claim: { label: "Pending", color: "text-violet-700 bg-violet-50", icon: Clock },
  pending_registration: { label: "Awaiting signup", color: "text-amber-700 bg-amber-50", icon: AlertCircle },
  claimed: { label: "Claimed", color: "text-emerald-700 bg-emerald-50", icon: CheckCircle2 },
  expired: { label: "Expired", color: "text-slate-500 bg-slate-100", icon: RefreshCw },
  cancelled: { label: "Cancelled", color: "text-red-600 bg-red-50", icon: XCircle },
};

function GiftCard({ gift, onCancel }) {
  const meta = STATUS_META[gift.status] || STATUS_META.pending_claim;
  const Icon = meta.icon;
  const canCancel = gift.status === "pending_claim" || gift.status === "pending_registration";
  const expiryDate = gift.expires_at ? new Date(gift.expires_at).toLocaleDateString("en-ZA") : null;
  const sentDate = gift.created_at ? new Date(gift.created_at).toLocaleDateString("en-ZA") : null;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{gift.asset_name}</p>
          <p className="text-xs text-slate-500 mt-0.5 truncate">To: {gift.recipient_identifier}</p>
          {gift.message && <p className="text-xs text-slate-400 italic mt-1 line-clamp-1">"{gift.message}"</p>}
        </div>
        <div className="text-right shrink-0">
          <p className="text-base font-bold text-slate-800">{fmt(gift.amount)}</p>
          <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
            <Icon size={10} />{meta.label}
          </div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
        <p className="text-xs text-slate-400">Sent {sentDate}{canCancel && expiryDate && ` · Expires ${expiryDate}`}</p>
        {canCancel && (
          <button onClick={() => onCancel(gift.id)} className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors">
            Cancel & refund
          </button>
        )}
      </div>
    </div>
  );
}

export default function SentGiftsPage({ onBack }) {
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadGifts() {
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
      setGifts(data.gifts || []);
    } catch (e) {
      setError(e.message || "Failed to load gifts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadGifts(); }, []);

  async function handleCancel(giftId) {
    if (!window.confirm("Cancel this gift? The amount will be refunded to your wallet.")) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const res = await fetch("/api/gift/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({ gift_id: giftId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to cancel.");
      setGifts((prev) => prev.map((g) => g.id === giftId ? { ...g, status: "cancelled" } : g));
    } catch (e) {
      alert(e.message || "Failed to cancel gift.");
    }
  }

  const active = gifts.filter((g) => g.status === "pending_claim" || g.status === "pending_registration");
  const past = gifts.filter((g) => !["pending_claim", "pending_registration"].includes(g.status));

  return (
    <div className="min-h-screen bg-[#f8f6fa]">
      <div className="bg-white px-4 pt-12 pb-4 flex items-center gap-3 shadow-sm">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
          <ArrowLeft size={20} className="text-slate-700" />
        </button>
        <h1 className="text-lg font-bold text-slate-800">Sent Gifts</h1>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
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
        {!loading && !error && gifts.length === 0 && (
          <div className="bg-white rounded-3xl p-10 text-center shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
              <Gift size={24} className="text-violet-500" />
            </div>
            <h2 className="text-base font-bold text-slate-800 mb-1">No gifts sent yet</h2>
            <p className="text-sm text-slate-400">When you send an investment gift, it'll appear here.</p>
          </div>
        )}
        {active.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Active</p>
            <div className="space-y-3">{active.map((g) => <GiftCard key={g.id} gift={g} onCancel={handleCancel} />)}</div>
          </div>
        )}
        {past.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">History</p>
            <div className="space-y-3">{past.map((g) => <GiftCard key={g.id} gift={g} onCancel={handleCancel} />)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
