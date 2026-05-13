import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

// ── Confetti particle ────────────────────────────────────────────────────────
const COLORS = ["#7c3aed", "#a78bfa", "#c4b5fd", "#ddd6fe", "#6d28d9", "#ede9fe", "#fbbf24", "#f9a8d4"];

function Confetti({ count = 80 }) {
  const particles = useRef(
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: 40 + Math.random() * 20,       // start near center-ish
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 6 + Math.random() * 8,
      dx: (Math.random() - 0.5) * 160,  // horizontal spread (vw units via %)
      dy: -(120 + Math.random() * 160), // upward burst
      rotate: Math.random() * 720 - 360,
      delay: Math.random() * 0.3,
      shape: Math.random() > 0.5 ? "rect" : "circle",
    }))
  ).current;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ x: `${p.x}vw`, y: "60vh", opacity: 1, rotate: 0, scale: 1 }}
          animate={{
            x: `calc(${p.x}vw + ${p.dx}px)`,
            y: `calc(60vh + ${p.dy}px)`,
            opacity: [1, 1, 0],
            rotate: p.rotate,
            scale: [1, 1.2, 0.8],
          }}
          transition={{ duration: 1.4 + Math.random() * 0.6, delay: p.delay, ease: "easeOut" }}
          style={{
            position: "absolute",
            width: p.size,
            height: p.shape === "rect" ? p.size * 0.5 : p.size,
            borderRadius: p.shape === "circle" ? "50%" : 2,
            background: p.color,
          }}
        />
      ))}
    </div>
  );
}

// ── Gift box open animation ───────────────────────────────────────────────────
function GiftOpenAnimation({ assetName, onDone }) {
  const [phase, setPhase] = useState("box"); // box → open → text

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("open"), 600);
    const t2 = setTimeout(() => setPhase("text"), 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-gradient-to-br from-violet-950 via-violet-900 to-indigo-900">
      <Confetti count={90} />

      {/* Gift box */}
      <div className="relative flex flex-col items-center">
        {/* Lid */}
        <motion.div
          className="relative z-10 flex items-center justify-center"
          animate={phase !== "box" ? { y: -80, opacity: 0, rotate: -15 } : { y: 0, opacity: 1, rotate: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="w-40 h-14 rounded-t-xl bg-gradient-to-r from-violet-500 to-purple-600 shadow-xl flex items-center justify-center">
            <div className="absolute inset-x-0 top-0 h-1.5 rounded-t-xl bg-violet-300/40" />
            {/* Ribbon */}
            <div className="absolute left-1/2 -translate-x-1/2 w-5 h-full bg-violet-300/60 rounded" />
            {/* Bow */}
            <motion.div
              className="absolute -top-5 left-1/2 -translate-x-1/2 flex gap-1"
              animate={phase !== "box" ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-8 h-8 rounded-full bg-fuchsia-400 opacity-90" style={{ transform: "rotate(-30deg) scale(0.8,1)" }} />
              <div className="w-8 h-8 rounded-full bg-fuchsia-400 opacity-90" style={{ transform: "rotate(30deg) scale(0.8,1)" }} />
            </motion.div>
          </div>
        </motion.div>

        {/* Box body */}
        <div className="w-44 h-36 rounded-b-xl bg-gradient-to-b from-violet-600 to-purple-700 shadow-2xl flex items-center justify-center -mt-1">
          <div className="absolute left-1/2 -translate-x-1/2 w-5 h-full bg-violet-300/40 rounded" />
          <AnimatePresence>
            {phase === "text" && (
              <motion.div
                initial={{ scale: 0, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
                className="text-5xl select-none"
              >
                🎉
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Text reveal */}
      <AnimatePresence>
        {phase === "text" && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-10 text-center px-8"
          >
            <p className="text-violet-200 text-sm font-medium mb-2 uppercase tracking-widest">You were gifted</p>
            <p className="text-white text-2xl font-extrabold leading-tight">{assetName}</p>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              onClick={onDone}
              className="mt-8 px-10 py-3.5 rounded-2xl bg-white text-violet-900 font-bold text-sm active:scale-95 transition-all shadow-lg"
            >
              View My Portfolio
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GiftPreviewPage({ code, idNumber, giftPreview, onBack, onNavigate }) {
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState(null);
  const [showAnimation, setShowAnimation] = useState(false);

  const { asset_name, sender_name, message, expires_at } = giftPreview || {};

  function formatExpiry(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    const now = new Date();
    const diffMs = d - now;
    if (diffMs <= 0) return "Expired";
    const diffH = Math.floor(diffMs / 3600000);
    const diffM = Math.floor((diffMs % 3600000) / 60000);
    if (diffH > 0) return `${diffH}h ${diffM}m remaining`;
    return `${diffM}m remaining`;
  }

  async function handleClaim() {
    setClaiming(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) { onNavigate?.("auth"); return; }
      const res = await fetch("/api/gift/claim-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ code, id_number: idNumber }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        if (data.kyc_required || data.mint_number_required) {
          setError("You must complete FICA verification and Mint account setup before claiming a gift. Please finish onboarding first.");
          return;
        }
        setError(data.error || "Failed to claim gift.");
        return;
      }
      setShowAnimation(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setClaiming(false);
    }
  }

  if (showAnimation) {
    return (
      <GiftOpenAnimation
        assetName={asset_name}
        onDone={() => onNavigate?.("investments")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f6fa] flex flex-col">
      <div className="bg-white px-4 pt-12 pb-4 flex items-center gap-3 shadow-sm">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
          <ArrowLeft size={20} className="text-slate-700" />
        </button>
        <h1 className="text-lg font-bold text-slate-800">Your Gift</h1>
      </div>

      <div className="flex-1 flex items-start justify-center px-5 pt-8">
        <div className="w-full max-w-sm space-y-5">
          {/* Gift card */}
          <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-3xl p-6">
            <div className="text-center">
              <div className="text-4xl mb-3">🎁</div>
              <p className="text-slate-600 text-sm mb-1">
                <span className="font-semibold text-slate-800">{sender_name || "Someone"}</span> gifted you
              </p>
              <p className="text-2xl font-extrabold text-slate-900 mt-2">{asset_name}</p>
            </div>
            {message && (
              <div className="mt-4 bg-white/70 rounded-2xl px-4 py-3">
                <p className="text-slate-600 text-sm italic text-center">"{message}"</p>
              </div>
            )}
          </div>

          {/* Expiry */}
          {expires_at && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 text-center">
              <p className="text-amber-800 text-xs font-semibold">{formatExpiry(expires_at)}</p>
            </div>
          )}

          {/* FICA warning */}
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
            <ShieldAlert size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              <span className="font-semibold">FICA verification required.</span> You must be a verified Mint client to claim this investment gift.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
              <p className="text-red-600 text-sm">{error}</p>
              {error.includes("FICA") || error.includes("onboarding") ? (
                <button
                  type="button"
                  onClick={() => onNavigate?.("userOnboarding")}
                  className="mt-2 text-xs font-semibold text-red-700 underline"
                >
                  Complete FICA verification →
                </button>
              ) : null}
            </div>
          )}

          <button
            type="button"
            onClick={handleClaim}
            disabled={claiming}
            className="w-full py-4 rounded-2xl bg-gradient-to-br from-[#1e1b4b] to-[#312e81] text-white font-bold text-base disabled:opacity-60 active:scale-95 transition-all"
          >
            {claiming ? "Claiming…" : "Claim My Gift"}
          </button>

          <p className="text-xs text-slate-400 text-center leading-relaxed">
            Your investment will appear as pending in your portfolio after claiming.
          </p>
        </div>
      </div>
    </div>
  );
}
