import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, Gift, Clock, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

const HOME_BG = {
  backgroundColor: '#f8f6fa',
  backgroundImage: 'linear-gradient(180deg, #0d0d12 0%, #0e0a14 0.5%, #100b18 1%, #120c1c 1.5%, #150e22 2%, #181028 2.5%, #1c122f 3%, #201436 3.5%, #25173e 4%, #2a1a46 5%, #301d4f 6%, #362158 7%, #3d2561 8%, #44296b 9%, #4c2e75 10%, #54337f 11%, #5d3889 12%, #663e93 13%, #70449d 14%, #7a4aa7 15%, #8451b0 16%, #8e58b9 17%, #9860c1 18%, #a268c8 19%, #ac71ce 20%, #b57ad3 21%, #be84d8 22%, #c68edc 23%, #cd98e0 24%, #d4a2e3 25%, #daace6 26%, #dfb6e9 27%, #e4c0eb 28%, #e8c9ed 29%, #ecd2ef 30%, #efdaf1 31%, #f2e1f3 32%, #f4e7f5 33%, #f6ecf7 34%, #f8f0f9 35%, #f9f3fa 36%, #faf5fb 38%, #fbf7fc 40%, #fcf9fd 42%, #fdfafd 45%, #faf8fc 55%, #f8f6fa 100%)',
  backgroundRepeat: 'no-repeat',
  backgroundSize: '100% 100vh',
};

const CONFETTI_COLORS = ["#7c3aed", "#a78bfa", "#c4b5fd", "#ddd6fe", "#6d28d9", "#ede9fe", "#fbbf24", "#f9a8d4"];

function Confetti({ count = 80 }) {
  const particles = useRef(
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: 40 + Math.random() * 20,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 6 + Math.random() * 8,
      dx: (Math.random() - 0.5) * 160,
      dy: -(120 + Math.random() * 160),
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

function GiftOpenAnimation({ assetName, onDone }) {
  const [phase, setPhase] = useState("box");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("open"), 600);
    const t2 = setTimeout(() => setPhase("text"), 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-gradient-to-b from-[#0d0d12] via-[#2a1a46] to-[#5b21b6]">
      <Confetti count={90} />

      <div className="relative flex flex-col items-center">
        <motion.div
          className="relative z-10 flex items-center justify-center"
          animate={phase !== "box" ? { y: -80, opacity: 0, rotate: -15 } : { y: 0, opacity: 1, rotate: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="w-40 h-14 rounded-t-xl bg-gradient-to-r from-violet-400 to-purple-500 shadow-xl flex items-center justify-center">
            <div className="absolute inset-x-0 top-0 h-1.5 rounded-t-xl bg-white/20" />
            <div className="absolute left-1/2 -translate-x-1/2 w-5 h-full bg-white/20 rounded" />
            <motion.div
              className="absolute -top-5 left-1/2 -translate-x-1/2 flex gap-1"
              animate={phase !== "box" ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-8 h-8 rounded-full bg-fuchsia-400 opacity-80" style={{ transform: "rotate(-30deg) scale(0.8,1)" }} />
              <div className="w-8 h-8 rounded-full bg-fuchsia-400 opacity-80" style={{ transform: "rotate(30deg) scale(0.8,1)" }} />
            </motion.div>
          </div>
        </motion.div>

        <div className="w-44 h-36 rounded-b-xl bg-gradient-to-b from-violet-500 to-purple-700 shadow-2xl flex items-center justify-center -mt-1">
          <div className="absolute left-1/2 -translate-x-1/2 w-5 h-full bg-white/15 rounded" />
          <AnimatePresence>
            {phase === "text" && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
              >
                <Gift size={40} className="text-white/90" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {phase === "text" && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-10 text-center px-8"
          >
            <p className="text-violet-300 text-xs font-semibold uppercase tracking-[0.2em] mb-2">You were gifted</p>
            <p className="text-white text-2xl font-extrabold leading-tight">{assetName}</p>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              onClick={onDone}
              className="mt-8 px-10 py-3.5 rounded-2xl bg-white text-slate-900 font-bold text-sm active:scale-[0.98] transition-all shadow-lg"
            >
              View My Portfolio
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function GiftPreviewPage({ code, idNumber, giftPreview, onBack, onNavigate }) {
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [onboardingRequired, setOnboardingRequired] = useState(false);

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
        if (data.kyc_required || data.mint_number_required || data.onboarding_incomplete) {
          setError(data.error || "Please complete all onboarding steps before claiming a gift.");
          setOnboardingRequired(true);
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

  const expiryLabel = formatExpiry(expires_at);

  return (
    <div className="min-h-screen flex flex-col" style={HOME_BG}>
      <header className="rounded-b-[36px] bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 pb-8 pt-12 text-white">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-white/10 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold">Your Gift</h1>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-4 border border-white/20">
            <Gift size={28} className="text-white" />
          </div>
          <p className="text-violet-200 text-sm">
            <span className="font-semibold text-white">{sender_name || "Someone"}</span> gifted you
          </p>
          <p className="text-xl font-extrabold text-white mt-1">{asset_name}</p>
        </div>
      </header>

      <div className="flex-1 px-4 pt-6 pb-10 max-w-sm mx-auto w-full space-y-4">
        {message && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-slate-600 text-sm italic text-center leading-relaxed">"{message}"</p>
          </div>
        )}

        {expiryLabel && (
          <div className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center justify-center gap-2">
            <Clock size={14} className={expiryLabel === "Expired" ? "text-red-500" : "text-amber-500"} />
            <p className={`text-xs font-semibold ${expiryLabel === "Expired" ? "text-red-600" : "text-amber-700"}`}>
              {expiryLabel}
            </p>
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck size={14} className="text-blue-600" />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              <span className="font-semibold text-slate-700">FICA verification required.</span> You must be a verified Mint client to claim this investment gift.
            </p>
          </div>
        </div>

        {onboardingRequired && (
          <div className="bg-amber-50 rounded-2xl p-5">
            <p className="text-amber-800 font-semibold text-sm mb-1">Complete onboarding to claim</p>
            <p className="text-amber-700 text-xs leading-relaxed mb-3">{error}</p>
            <button
              type="button"
              onClick={() => onNavigate?.("userOnboarding")}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#1a1a2e] to-[#44296b] text-white font-semibold text-sm"
            >
              Complete Onboarding
            </button>
          </div>
        )}

        {error && !onboardingRequired && (
          <div className="bg-red-50 rounded-2xl px-4 py-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {!onboardingRequired && (
          <div className="pt-2 space-y-3">
            <button
              type="button"
              onClick={handleClaim}
              disabled={claiming}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#1a1a2e] to-[#44296b] text-white font-bold text-sm disabled:opacity-60 active:scale-[0.98] transition-all shadow-lg"
            >
              {claiming ? "Claiming…" : "Claim My Gift"}
            </button>

            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              Your investment will appear as pending in your portfolio after claiming.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
