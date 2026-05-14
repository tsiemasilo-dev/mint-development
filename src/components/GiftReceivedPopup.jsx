import React, { useEffect, useState } from "react";
import { Gift, X } from "lucide-react";
import { useNotificationsContext } from "../lib/NotificationsContext.jsx";

export default function GiftReceivedPopup({ onClaim }) {
  const { notifications, markAsRead } = useNotificationsContext();
  const [visible, setVisible] = useState(null); // the notification object

  useEffect(() => {
    if (visible) return; // already showing one
    const gift = notifications.find(
      n => !n.read_at && n.type === "investment" && n.payload?.action === "gift_received"
    );
    if (gift) setVisible(gift);
  }, [notifications, visible]);

  if (!visible) return null;

  function handleDismiss() {
    markAsRead(visible.id);
    setVisible(null);
  }

  function handleClaim() {
    markAsRead(visible.id);
    setVisible(null);
    onClaim?.();
  }

  const assetName = visible.payload?.asset_name;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6" style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", animation: "gfade 0.3s ease" }}>
      <style>{`@keyframes gfade{from{opacity:0}to{opacity:1}} @keyframes gpop{0%{opacity:0;transform:scale(0.85) translateY(16px)}100%{opacity:1;transform:scale(1) translateY(0)}}`}</style>
      <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl" style={{ animation: "gpop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>
        {/* Header */}
        <div className="bg-gradient-to-br from-violet-600 to-indigo-700 px-6 pt-8 pb-6 text-center relative">
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X size={14} className="text-white" />
          </button>
          <div className="text-5xl mb-3" style={{ animation: "gpop 0.5s 0.15s cubic-bezier(0.34,1.56,0.64,1) both" }}>🎁</div>
          <p className="text-white font-black text-xl mb-1">You've been gifted!</p>
          {assetName && (
            <p className="text-violet-200 text-sm font-medium">{assetName}</p>
          )}
        </div>

        {/* Body */}
        <div className="bg-white px-6 py-5 space-y-4">
          <p className="text-slate-600 text-sm text-center leading-relaxed">
            {visible.body || "Someone gifted you an investment on Mint. Claim it before it expires!"}
          </p>

          <button
            type="button"
            onClick={handleClaim}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Gift size={16} />
            Claim My Gift
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-2.5 rounded-2xl border border-slate-200 text-slate-500 text-sm font-semibold"
          >
            Remind me later
          </button>
        </div>
      </div>
    </div>
  );
}
