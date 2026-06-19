import React, { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Gift, Copy, Check, Clock, CheckCircle2, XCircle, Timer, ChevronDown } from "lucide-react";
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

function CountdownBadge({ expiresAt, dark = false }) {
  const { h, m, s, isExpired, isLow } = useCountdown(expiresAt);
  if (isExpired) return (
    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${dark ? "text-red-300 bg-red-500/20 border border-red-400/20" : "text-red-600 bg-red-50"}`}>
      Expired
    </span>
  );
  const label = h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
  if (dark) {
    return (
      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${isLow ? "text-red-300 bg-red-500/20 border border-red-400/20" : "text-white/60 bg-white/10 border border-white/10"}`}>
        <Timer size={10} />{label}
      </span>
    );
  }
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${isLow ? "text-red-600 bg-red-50" : "text-slate-600 bg-slate-100"}`}>
      <Timer size={10} />{label}
    </span>
  );
}

const AUDIT_META = {
  created:   { label: () => "Gift sent",                        dot: "bg-violet-400",  text: "text-violet-700"  },
  extended:  { label: (e) => `+${e.ext === "10h" ? "10 hours" : "24 hours"} extended`, dot: "bg-amber-400", text: "text-amber-700" },
  cancelled: { label: () => "Gift cancelled",                   dot: "bg-red-400",     text: "text-red-600"    },
  claimed:   { label: () => "Gift claimed by recipient",        dot: "bg-emerald-400", text: "text-emerald-700" },
  expired:   { label: () => "Gift expired",                     dot: "bg-slate-300",   text: "text-slate-500"  },
};

function fmtEventTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" }) +
    " · " + d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
}

function GiftAuditTrail({ events, variant = "light" }) {
  const [open, setOpen] = useState(false);
  if (!events || events.length <= 1) return null;
  const dark = variant === "dark";
  return (
    <div className={`border-t ${dark ? "border-white/[0.07]" : "border-slate-100"}`}>
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className={`text-[11px] font-bold uppercase tracking-wider ${dark ? "text-white/30" : "text-slate-400"}`}>Activity</p>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${dark ? "bg-white/10 text-white/35" : "bg-slate-100 text-slate-500"}`}>
            {events.length}
          </span>
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full transition-all active:scale-95 ${
            dark
              ? open ? "bg-white/15 text-white/60" : "bg-white/[0.08] text-white/40 hover:bg-white/[0.12]"
              : open ? "bg-slate-100 text-slate-600" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
          }`}
        >
          {open ? "Hide" : "Show"}
          <ChevronDown size={11} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      {open && (
        <div className="px-4 pb-4">
          {events.map((e, i) => {
            const meta = AUDIT_META[e.type] || AUDIT_META.created;
            const label = meta.label(e);
            const time = fmtEventTime(e.at);
            const isLast = i === events.length - 1;
            return (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center w-3 shrink-0">
                  <div className={`w-2 h-2 rounded-full mt-0.5 shrink-0 ${meta.dot}`} />
                  {!isLast && <div className={`w-px flex-1 my-1 ${dark ? "bg-white/10" : "bg-slate-100"}`} />}
                </div>
                <div className="pb-3 min-w-0">
                  <p className={`text-xs font-semibold ${dark ? "text-white/70" : meta.text}`}>{label}</p>
                  {e.type === "extended" && e.fee != null && (
                    <p className={`text-[11px] mt-0.5 ${dark ? "text-white/30" : "text-slate-400"}`}>Fee: {fmt(e.fee)}</p>
                  )}
                  {time && <p className={`text-[11px] mt-0.5 ${dark ? "text-white/25" : "text-slate-400"}`}>{time}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ExtendConfirmSheet({ gift, extension, fee, walletBalance, walletLoading, extending, onConfirm, onClose }) {
  const feeRands = fee / 100;
  const balanceRands = walletBalance;
  const newBalanceRands = balanceRands !== null ? balanceRands - feeRands : null;
  const insufficient = balanceRands !== null && balanceRands < feeRands;
  const label = extension === "10h" ? "+10 hours" : "+24 hours";

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-white rounded-t-3xl px-5 pt-5 pb-8 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
            <Clock size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">Extend gift expiry</p>
            <p className="text-xs text-slate-400 mt-0.5">{gift.asset_name} · To {gift.recipient_name || "Recipient"}</p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl divide-y divide-slate-100 mb-4">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm text-slate-600">Extension</p>
            <p className="text-sm font-semibold text-violet-700">{label}</p>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm text-slate-600">Extension fee</p>
            <p className="text-sm font-bold text-red-600">− {fmt(fee)}</p>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm text-slate-600">Wallet balance</p>
            {walletLoading ? (
              <div className="w-16 h-4 bg-slate-200 rounded animate-pulse" />
            ) : (
              <p className={`text-sm font-semibold ${insufficient ? "text-red-600" : "text-slate-800"}`}>
                {balanceRands !== null ? fmt(Math.round(balanceRands * 100)) : "—"}
              </p>
            )}
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm text-slate-600">Balance after</p>
            {walletLoading ? (
              <div className="w-16 h-4 bg-slate-200 rounded animate-pulse" />
            ) : (
              <p className={`text-sm font-bold ${insufficient ? "text-red-600" : "text-emerald-700"}`}>
                {newBalanceRands !== null ? fmt(Math.round(newBalanceRands * 100)) : "—"}
              </p>
            )}
          </div>
        </div>

        {insufficient && (
          <div className="bg-red-50 rounded-xl px-4 py-3 mb-4">
            <p className="text-xs text-red-600 font-medium">Insufficient wallet balance. Please top up before extending.</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600 bg-white active:scale-95 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={insufficient || walletLoading || extending}
            className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-[#1a1a2e] to-[#44296b] shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {extending ? "Extending…" : `Confirm ${label}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActiveGiftCard({ gift, onExtend, onCancel }) {
  const [copied, setCopied] = useState(false);
  const [extending, setExtending] = useState(null);
  const [extendedKey, setExtendedKey] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [pendingExtend, setPendingExtend] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const { isLow, isExpired } = useCountdown(gift.expires_at);

  const fee10 = Math.round((gift.amount || 0) * 0.05);
  const fee24 = Math.round((gift.amount || 0) * 0.09);
  const pendingFee = pendingExtend === "10h" ? fee10 : fee24;

  function handleCopy() {
    navigator.clipboard.writeText(gift.token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function openExtendSheet(ext) {
    setPendingExtend(ext);
    setWalletBalance(null);
    setWalletLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", session.user.id)
          .maybeSingle();
        setWalletBalance(data?.balance ?? 0);
      }
    } catch { /* show sheet anyway, balance stays null */ }
    finally { setWalletLoading(false); }
  }

  async function handleExtendConfirm() {
    if (!pendingExtend) return;
    setExtending(pendingExtend);
    const ext = pendingExtend;
    setPendingExtend(null);
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
    <>
      {pendingExtend && (
        <ExtendConfirmSheet
          gift={gift}
          extension={pendingExtend}
          fee={pendingFee}
          walletBalance={walletBalance}
          walletLoading={walletLoading}
          extending={!!extending}
          onConfirm={handleExtendConfirm}
          onClose={() => setPendingExtend(null)}
        />
      )}

      <div className="bg-white rounded-3xl overflow-hidden shadow-sm" style={{ border: "1px solid rgba(0,0,0,0.07)" }}>
        <div className="h-[3px] bg-gradient-to-r from-violet-500 to-purple-500" />
        <div className="p-5">
          {/* Status row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Gift</span>
            </div>
            <CountdownBadge expiresAt={gift.expires_at} />
          </div>

          {/* Main info */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <p className="text-lg font-black text-slate-900 leading-snug truncate">{gift.asset_name}</p>
              <p className="text-xs text-slate-400 mt-0.5">To {gift.recipient_name || "Recipient"}</p>
              {gift.personal_message && (
                <p className="text-xs text-slate-400 italic mt-1.5 line-clamp-1">"{gift.personal_message}"</p>
              )}
            </div>
            <p className="text-2xl font-black text-slate-900 shrink-0">{fmt(gift.amount)}</p>
          </div>

          {/* Awaiting + fees row */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-100">
              <Clock size={10} />Awaiting claim
            </span>
            {gift.extension_fees > 0 && (
              <span className="text-[11px] text-slate-400">Fees: {fmt(gift.extension_fees)}</span>
            )}
          </div>

          {/* Token box */}
          <div className="bg-slate-900 rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] text-white/40 font-semibold uppercase tracking-widest mb-1.5">Gift Code</p>
              <p className="text-xl font-black tracking-[0.3em] text-white font-mono">{gift.token}</p>
            </div>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl transition-all active:scale-95 shrink-0 ${copied ? "bg-emerald-500 text-white" : "bg-white/[0.12] text-white/70 hover:bg-white/20"}`}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Extend buttons */}
        {!isExpired && (
          <div className="px-5 pb-5 space-y-2">
            {isLow && (
              <p className="text-[11px] font-semibold text-amber-600 text-center bg-amber-50 rounded-xl py-2 border border-amber-100">⚡ Expiring soon — extend to keep active</p>
            )}
            <div className="flex gap-2.5">
              <button
                onClick={() => openExtendSheet("10h")}
                disabled={!!extending}
                className={`flex-1 rounded-2xl py-3 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 ${extendedKey === "10h" ? "bg-emerald-500 text-white shadow-sm" : "bg-violet-50 text-violet-700 border border-violet-100 hover:bg-violet-100"}`}
              >
                {extending === "10h" ? "Extending…" : extendedKey === "10h" ? "✓ Extended" : `+10h · ${fmt(fee10)}`}
              </button>
              <button
                onClick={() => openExtendSheet("24h")}
                disabled={!!extending}
                className={`flex-1 rounded-2xl py-3 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 ${extendedKey === "24h" ? "bg-emerald-500 text-white shadow-sm" : "bg-violet-50 text-violet-700 border border-violet-100 hover:bg-violet-100"}`}
              >
                {extending === "24h" ? "Extending…" : extendedKey === "24h" ? "✓ Extended" : `+24h · ${fmt(fee24)}`}
              </button>
            </div>
          </div>
        )}

        <GiftAuditTrail events={gift.events} variant="light" />

        {/* Cancel footer */}
        <div className="border-t border-slate-100 px-5 py-3">
          {showCancelConfirm ? (
            <div className="flex items-center gap-2">
              <p className="text-xs text-slate-500 flex-1">Cancel this gift?</p>
              <button
                onClick={() => setShowCancelConfirm(false)}
                disabled={cancelling}
                className="text-xs font-semibold text-slate-500 px-3 py-1.5 rounded-xl bg-slate-100 active:scale-95 transition-all"
              >
                Keep
              </button>
              <button
                onClick={handleCancelConfirm}
                disabled={cancelling}
                className="text-xs font-semibold text-white px-3 py-1.5 rounded-xl bg-red-500 active:scale-95 transition-all disabled:opacity-60"
              >
                {cancelling ? "Cancelling…" : "Yes, cancel"}
              </button>
            </div>
          ) : (
            <div className="flex justify-end">
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors"
              >
                Cancel gift
              </button>
            </div>
          )}
        </div>
      </div>
    </>
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

  const accentBar = isClaimed
    ? "from-emerald-400 to-emerald-500"
    : gift.status === "cancelled"
    ? "from-red-400 to-rose-500"
    : "from-slate-200 to-slate-300";

  return (
    <div className="bg-white rounded-3xl shadow-sm overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
      <div className={`h-[3px] w-full bg-gradient-to-r ${accentBar}`} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${isClaimed ? "bg-emerald-50" : gift.status === "cancelled" ? "bg-red-50" : "bg-slate-100"}`}>
              <Gift size={16} className={isClaimed ? "text-emerald-500" : gift.status === "cancelled" ? "text-red-400" : "text-slate-400"} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{gift.asset_name}</p>
              <p className="text-xs text-slate-400 mt-0.5">To {gift.recipient_name || "Recipient"}</p>
              {sentDate && <p className="text-[11px] text-slate-300 mt-0.5">{sentDate}</p>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-base font-black text-slate-900">{fmt(gift.amount)}</p>
            <div className={`inline-flex items-center gap-1 mt-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${meta.color}`}>
              <Icon size={9} />{meta.label}
            </div>
          </div>
        </div>

        {isClaimed && (
          <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-2">
            <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
            <p className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{gift.recipient_name || "Recipient"}</span> claimed this
              {claimedDate && <span className="text-slate-400"> · {claimedDate}</span>}
            </p>
          </div>
        )}
      </div>
      <GiftAuditTrail events={gift.events} variant="light" />
    </div>
  );
}

function ReceivedActiveCard({ gift, onClaim }) {
  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-sm" style={{ border: "1px solid rgba(0,0,0,0.07)" }}>
      <div className="h-[3px] bg-gradient-to-r from-violet-500 to-purple-500" />
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse shrink-0" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gift for you</span>
          </div>
          <CountdownBadge expiresAt={gift.expires_at} />
        </div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-black text-slate-900 leading-snug truncate">{gift.asset_name}</p>
            <p className="text-xs text-slate-400 mt-0.5">From {gift.sender_name || "Someone"}</p>
            {gift.personal_message && (
              <p className="text-xs text-slate-400 italic mt-2 line-clamp-2">"{gift.personal_message}"</p>
            )}
          </div>
          <p className="text-2xl font-black text-slate-900 shrink-0">{fmt(gift.amount)}</p>
        </div>
      </div>
      {gift.unclaimed ? (
        <button
          onClick={() => onClaim?.()}
          className="w-full py-4 text-sm font-bold text-white text-center active:opacity-80 transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600"
        >
          <Gift size={15} />Claim Gift →
        </button>
      ) : (
        <div className="border-t border-violet-50 px-5 py-3 bg-violet-50/60">
          <p className="text-[11px] text-violet-600 font-medium text-center">Investment pending in your portfolio</p>
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
  const accentBar = isClaimed
    ? "from-violet-400 to-purple-500"
    : gift.status === "cancelled"
    ? "from-red-400 to-rose-500"
    : "from-slate-200 to-slate-300";

  return (
    <div className="bg-white rounded-3xl shadow-sm overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
      <div className={`h-[3px] w-full bg-gradient-to-r ${accentBar}`} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${isClaimed ? "bg-violet-50" : "bg-slate-100"}`}>
              <Gift size={16} className={isClaimed ? "text-violet-500" : "text-slate-400"} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{gift.asset_name}</p>
              <p className="text-xs text-slate-400 mt-0.5">From {gift.sender_name || "Someone"}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-base font-black text-slate-900">{fmt(gift.amount)}</p>
            <div className={`inline-flex items-center gap-1 mt-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${meta.color}`}>
              <Icon size={9} />{meta.label}
            </div>
          </div>
        </div>
        {isClaimed && (
          <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-2">
            <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
            <p className="text-xs text-slate-500">
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
    const userId = sessionData?.session?.user?.id;
    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

    const [sentRes, receivedRes] = await Promise.all([
      fetch("/api/gift/sent", { headers }),
      fetch("/api/gift/received", { headers }),
    ]);
    const [sentData, receivedData] = await Promise.all([sentRes.json(), receivedRes.json()]);
    if (sentData.error) throw new Error(sentData.error);

    const allSent = [...(sentData.active || []), ...(sentData.history || [])];
    let extMap = {};
    if (userId && allSent.length > 0) {
      try {
        const { data: extTxns } = await supabase
          .from("transactions")
          .select("store_reference, transaction_date, amount")
          .eq("user_id", userId)
          .like("store_reference", "GIFT2-EXT-%")
          .order("transaction_date", { ascending: true });
        const giftIdSet = new Set(allSent.map(g => g.id));
        (extTxns || []).forEach(tx => {
          for (const giftId of giftIdSet) {
            if (tx.store_reference === `GIFT2-EXT-${giftId}-10h` || tx.store_reference === `GIFT2-EXT-${giftId}-24h`) {
              const ext = tx.store_reference.endsWith("-10h") ? "10h" : "24h";
              if (!extMap[giftId]) extMap[giftId] = [];
              extMap[giftId].push({ type: "extended", ext, at: tx.transaction_date, fee: tx.amount });
              break;
            }
          }
        });
      } catch { /* degrade gracefully */ }
    }

    const attachEvents = (g) => {
      const events = [{ type: "created", at: g.created_at }];
      (extMap[g.id] || []).forEach(e => events.push(e));
      if (g.cancelled_at) events.push({ type: "cancelled", at: g.cancelled_at });
      else if (g.claimed_at) events.push({ type: "claimed", at: g.claimed_at });
      else if (g.status === "expired") events.push({ type: "expired", at: g.expires_at });
      return { ...g, events };
    };

    setSentActive((sentData.active || []).map(attachEvents));
    setSentHistory((sentData.history || []).map(attachEvents));
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
      const now = new Date().toISOString();
      setSentActive(prev => prev.map(g => {
        if (g.id !== giftId) return g;
        const feeAdded = extension === "10h" ? Math.round((g.amount || 0) * 0.05) : Math.round((g.amount || 0) * 0.09);
        const newEvent = { type: "extended", ext: extension, at: now, fee: feeAdded };
        const prevEvents = g.events || [{ type: "created", at: g.created_at }];
        return { ...g, expires_at: data.new_expires_at, extension_fees: (g.extension_fees || 0) + feeAdded, events: [...prevEvents, newEvent] };
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
      // Cancel refunds the wallet (reserve model) — refresh the balance UI.
      if (data.refunded_amount) {
        try {
          window.dispatchEvent(new Event("wallet-updated"));
          window.dispatchEvent(new Event("profile-updated"));
          window.dispatchEvent(new Event("financial-data-updated"));
        } catch {}
      }
      const cancelled = sentActive.find(g => g.id === giftId);
      if (cancelled) {
        const cancelledAt = new Date().toISOString();
        const prevEvents = cancelled.events || [{ type: "created", at: cancelled.created_at }];
        const cancelledGift = {
          ...cancelled,
          status: "cancelled",
          cancelled_at: cancelledAt,
          events: [...prevEvents, { type: "cancelled", at: cancelledAt }],
        };
        setSentActive(prev => prev.filter(g => g.id !== giftId));
        setSentHistory(prev => [cancelledGift, ...prev]);
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
