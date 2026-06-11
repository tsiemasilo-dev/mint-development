import React, { useEffect, useState } from "react";
import { Gift, X } from "lucide-react";
import { useNotificationsContext } from "../lib/NotificationsContext.jsx";

export default function GiftReceivedPopup({ onClaim }) {
  const { notifications, markAsRead } = useNotificationsContext();
  const [visible, setVisible] = useState(null);

  useEffect(() => {
    // If the popup is already showing, check if it's been marked as read
    // (e.g. the user claimed via GiftCodeEntryPage and the notification was
    // marked read server-side). If so, dismiss without re-appearing.
    if (visible) {
      const stillUnread = notifications.find(n => n.id === visible.id && !n.read_at);
      if (!stillUnread) setVisible(null);
      return;
    }
    const gift = notifications.find(
      n => !n.read_at && n.payload?.action === "gift_received"
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-5" style={{ background: "rgba(10,10,20,0.75)", backdropFilter: "blur(8px)", animation: "grp-fade 0.3s ease" }}>
      <style>{`@keyframes grp-fade{from{opacity:0}to{opacity:1}} @keyframes grp-pop{0%{opacity:0;transform:scale(0.9) translateY(12px)}100%{opacity:1;transform:scale(1) translateY(0)}}`}</style>
      <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl" style={{ animation: "grp-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>
        <div className="bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-6 pt-8 pb-6 text-center relative">
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors"
          >
            <X size={12} className="text-white" />
          </button>
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 border border-white/20">
            <Gift size={28} className="text-white" />
          </div>
          <p className="text-white font-bold text-lg mb-1">You've been gifted!</p>
          {assetName && (
            <p className="text-violet-200 text-sm font-medium">{assetName}</p>
          )}
        </div>

        <div className="bg-white px-6 py-5 space-y-4">
          <p className="text-slate-500 text-sm text-center leading-relaxed">
            {visible.body || "Someone gifted you an investment on Mint. Claim it before it expires!"}
          </p>

          <button
            type="button"
            onClick={handleClaim}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#1a1a2e] to-[#44296b] text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg"
          >
            <Gift size={16} />
            Claim My Gift
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-2.5 rounded-2xl bg-slate-100 text-slate-500 text-sm font-semibold"
          >
            Remind me later
          </button>
        </div>
      </div>
    </div>
  );
}
