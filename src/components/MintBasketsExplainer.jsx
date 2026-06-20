import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "mint_baskets_explainer_seen";
export { STORAGE_KEY as BASKETS_EXPLAINER_KEY };

/* ── Typewriter hook ─────────────────────────────────── */
function useTypewriter(text, speed = 42, active = true) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    if (!active) { setDisplayed(text); return; }
    setDisplayed("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, active]);
  return displayed;
}

/* ── Confetti ────────────────────────────────────────── */
const CONFETTI_COLORS = ["#FF6B6B","#FFD93D","#6BCB77","#4D96FF","#FF922B","#CC5DE8","#20C997"];
function Confetti() {
  const pieces = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    x: Math.random() * 100,
    delay: Math.random() * 0.6,
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
    shape: i % 3 === 0 ? "circle" : i % 3 === 1 ? "rect" : "thin",
  }));
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: p.rotation }}
          animate={{ y: "105vh", opacity: [1, 1, 0], rotate: p.rotation + 360 }}
          transition={{ delay: p.delay, duration: 2.2, ease: "easeIn" }}
          style={{
            position: "absolute",
            top: 0,
            width: p.shape === "thin" ? p.size / 3 : p.size,
            height: p.shape === "thin" ? p.size * 2.5 : p.size,
            borderRadius: p.shape === "circle" ? "50%" : 2,
            background: p.color,
          }}
        />
      ))}
    </div>
  );
}

/* ── Background blobs (match reference teal/mint) ────── */
function Blobs() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      {/* large teal bottom-right blob */}
      <path d="M390 620 Q390 844 200 844 Q60 844 0 720 Q-30 620 50 560 Q130 500 220 530 Q360 560 390 620Z" fill="#00C9A7" opacity="0.85"/>
      {/* medium mint upper-left */}
      <path d="M0 0 Q0 160 80 180 Q160 200 160 120 Q160 40 80 0Z" fill="#B2F0E8" opacity="0.7"/>
      {/* small triangle accent */}
      <path d="M300 80 L390 80 L390 200 Z" fill="#4ECDC4" opacity="0.5"/>
      {/* soft mid-left blob */}
      <path d="M-40 380 Q0 300 80 340 Q140 370 100 450 Q60 510 -20 490Z" fill="#A8EDEA" opacity="0.55"/>
    </svg>
  );
}

/* ── Flat character illustration (SVG) ──────────────── */
function Character({ celebrate = false }) {
  return (
    <svg width="110" height="185" viewBox="0 0 110 185" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* body / sweater */}
      <ellipse cx="55" cy="148" rx="38" ry="42" fill="#F5CBA7"/>
      {/* sweater detail */}
      <path d="M20 148 Q30 165 55 168 Q80 165 90 148 Q80 155 55 158 Q30 155 20 148Z" fill="#E8B896"/>
      {/* neck */}
      <rect x="48" y="102" width="14" height="18" rx="5" fill="#FDBCB4"/>
      {/* head */}
      <circle cx="55" cy="85" r="32" fill="#FDBCB4"/>
      {/* hair back */}
      <path d="M24 82 Q22 50 55 44 Q88 50 86 82 Q88 115 80 132 Q68 148 55 150 Q42 148 30 132 Q22 115 24 82Z" fill="#1D1D5C"/>
      {/* face — skin re-overlay on hair */}
      <circle cx="55" cy="88" r="28" fill="#FDBCB4"/>
      {/* hair fringe */}
      <path d="M28 80 Q32 58 55 54 Q78 58 82 80 Q68 70 55 72 Q42 70 28 80Z" fill="#1D1D5C"/>
      {/* hair sides flowing down */}
      <path d="M26 86 Q20 105 22 128 Q28 148 35 152 Q28 138 27 115 Q26 95 30 88Z" fill="#1D1D5C"/>
      <path d="M84 86 Q90 105 88 128 Q82 148 75 152 Q82 138 83 115 Q84 95 80 88Z" fill="#1D1D5C"/>
      {/* eyes */}
      <ellipse cx="44" cy="87" rx="4.5" ry="5.5" fill="#1D1D5C"/>
      <ellipse cx="66" cy="87" rx="4.5" ry="5.5" fill="#1D1D5C"/>
      {/* eye shine */}
      <circle cx="46" cy="85" r="1.5" fill="white"/>
      <circle cx="68" cy="85" r="1.5" fill="white"/>
      {/* smile */}
      <path d="M44 99 Q55 110 66 99" stroke="#C0705A" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
      {/* cheek blush */}
      <ellipse cx="36" cy="97" rx="6" ry="4" fill="#FFB6B6" opacity="0.5"/>
      <ellipse cx="74" cy="97" rx="6" ry="4" fill="#FFB6B6" opacity="0.5"/>
      {/* earrings */}
      <circle cx="23" cy="91" r="5" fill="none" stroke="#D4AC0D" strokeWidth="2"/>
      <circle cx="23" cy="91" r="2" fill="#D4AC0D"/>
      <circle cx="87" cy="91" r="5" fill="none" stroke="#D4AC0D" strokeWidth="2"/>
      <circle cx="87" cy="91" r="2" fill="#D4AC0D"/>
      {/* left arm + phone */}
      <path d="M18 140 Q10 160 15 175 Q22 185 30 182 Q35 180 40 170 L50 155 Q35 148 18 140Z" fill="#F5CBA7"/>
      {/* phone in hand */}
      <rect x="30" y="155" width="26" height="42" rx="5" fill="#1D1D5C"/>
      <rect x="32" y="157" width="22" height="38" rx="3" fill="#4ECDC4"/>
      {/* phone screen lines */}
      <rect x="34" y="160" width="18" height="3" rx="1" fill="white" opacity="0.7"/>
      <rect x="34" y="165" width="14" height="2" rx="1" fill="white" opacity="0.4"/>
      <rect x="34" y="170" width="16" height="2" rx="1" fill="white" opacity="0.4"/>
      {/* right arm pointing/waving */}
      {celebrate ? (
        <path d="M88 135 Q100 110 98 90 Q97 80 92 82 Q88 84 90 95 Q85 88 80 90 Q76 93 80 100 Q75 95 70 98 Q67 102 72 108 L88 135Z" fill="#FDBCB4"/>
      ) : (
        <path d="M88 135 Q100 125 105 142 Q108 155 98 160 L88 155 Q85 148 88 135Z" fill="#F5CBA7"/>
      )}
    </svg>
  );
}

/* ── Animated hand pointer ─────────────────────────── */
function HandPointer({ visible, targetX, targetY }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="hand"
          style={{ position: "absolute", left: targetX, top: targetY, zIndex: 20 }}
          initial={{ opacity: 0, scale: 0.7, rotate: -15 }}
          animate={{
            opacity: 1, scale: [0.9, 1, 0.92, 1], rotate: [-10, 0],
            y: [0, -6, 0, -4, 0],
          }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.6 }}
        >
          <svg width="52" height="58" viewBox="0 0 52 58" fill="none">
            {/* palm */}
            <path d="M14 28 Q12 14 18 10 Q24 6 26 14 L26 28 Q30 22 34 22 Q40 22 40 30 Q40 32 38 34 Q42 34 42 40 Q42 46 36 47 Q34 54 24 54 Q14 54 10 46 Q6 38 14 28Z" fill="#FDBCB4" stroke="#E8A090" strokeWidth="1.2"/>
            {/* knuckle lines */}
            <line x1="26" y1="28" x2="26" y2="38" stroke="#E8A090" strokeWidth="1" strokeLinecap="round"/>
            <line x1="32" y1="30" x2="32" y2="40" stroke="#E8A090" strokeWidth="1" strokeLinecap="round"/>
            <line x1="38" y1="34" x2="38" y2="42" stroke="#E8A090" strokeWidth="1" strokeLinecap="round"/>
            {/* click pulse ring */}
            <motion.circle
              cx="26" cy="14" r="8"
              stroke="#4ECDC4" strokeWidth="2" fill="none" opacity="0.6"
              animate={{ r: [8, 16], opacity: [0.7, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 1.0 }}
            />
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Phone mockup scenes ─────────────────────────────── */

function PhoneBasketsList() {
  const barData = [
    { label: "NPN", h: 72, color: "#FF6B6B" },
    { label: "SBK", h: 58, color: "#4D96FF" },
    { label: "SOL", h: 45, color: "#4ECDC4" },
    { label: "AGL", h: 64, color: "#FFD93D" },
    { label: "FSR", h: 38, color: "#CC5DE8" },
    { label: "MTN", h: 52, color: "#FF922B" },
  ];
  return (
    <div className="flex h-full flex-col bg-white">
      {/* phone header */}
      <div className="bg-white px-3 pb-2 pt-3 shadow-sm">
        <p className="text-center text-[9px] font-semibold text-slate-700">Mint Baskets</p>
      </div>
      <div className="flex-1 overflow-hidden px-3 pt-2">
        <p className="text-[10px] font-bold text-slate-800">Growth Strategies</p>
        <p className="text-[7px] text-slate-400">Expert-curated JSE portfolios</p>
        {/* bar chart */}
        <div className="mt-2 flex items-end gap-1">
          {barData.map((b) => (
            <div key={b.label} className="flex flex-col items-center gap-0.5 flex-1">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: b.h * 0.6 }}
                transition={{ duration: 0.7, delay: 0.1 * barData.indexOf(b) }}
                style={{ width: "100%", background: b.color, borderRadius: "3px 3px 0 0" }}
              />
              <span style={{ fontSize: 5.5, color: "#94a3b8" }}>{b.label}</span>
            </div>
          ))}
        </div>
        {/* explore button */}
        <motion.div
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.4 }}
          className="mt-3 rounded-lg py-1.5 text-center text-[9px] font-bold text-white"
          style={{ background: "linear-gradient(90deg, #4ECDC4, #00B4D8)" }}
        >
          Explore Baskets
        </motion.div>
        {/* income row */}
        <p className="mt-2 text-[10px] font-bold text-slate-800">Income Strategies</p>
        <div className="mt-1 flex items-end gap-1">
          {barData.slice(0, 4).reverse().map((b, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5 flex-1">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: (b.h * 0.45) }}
                transition={{ duration: 0.7, delay: 0.6 + 0.1 * i }}
                style={{ width: "100%", background: b.color, borderRadius: "3px 3px 0 0", opacity: 0.75 }}
              />
              <span style={{ fontSize: 5.5, color: "#94a3b8" }}>{b.label}</span>
            </div>
          ))}
        </div>
      </div>
      {/* bottom tab bar */}
      <div className="flex border-t border-slate-100 bg-white py-1">
        {["Markets","Invest","Credit","Help"].map((t, i) => (
          <div key={t} className={`flex flex-1 flex-col items-center gap-0.5 ${i === 1 ? "text-teal-500" : "text-slate-400"}`}>
            <div className={`h-2 w-2 rounded-full ${i === 1 ? "bg-teal-400" : "bg-slate-200"}`}/>
            <span style={{ fontSize: 5 }}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PhoneCategories() {
  const cats = [
    { label: "Growth", pct: "18%", color: "#FF6B6B", bg: "#FFF0F0" },
    { label: "Balanced", pct: "12%", color: "#4D96FF", bg: "#EFF4FF" },
    { label: "Income", pct: "9%", color: "#4ECDC4", bg: "#EDFBF9" },
  ];
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="bg-white px-3 pb-2 pt-3 shadow-sm">
        <p className="text-center text-[9px] font-semibold text-slate-700">Mint Baskets</p>
      </div>
      <div className="flex-1 px-3 pt-2">
        <p className="text-[10px] font-bold text-slate-800">Choose a Basket Type</p>
        <p className="text-[7px] text-slate-400 mb-2">Pick your risk level & strategy</p>
        {cats.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 + i * 0.25 }}
            className="mb-2 flex items-center gap-2 rounded-xl p-2"
            style={{ background: c.bg }}
          >
            {/* mini pie */}
            <svg width="28" height="28" viewBox="0 0 28 28">
              <circle cx="14" cy="14" r="12" fill={c.bg}/>
              <motion.circle
                cx="14" cy="14" r="12"
                fill="none"
                stroke={c.color}
                strokeWidth="6"
                strokeDasharray={`${parseInt(c.pct) * 0.75} 75`}
                strokeDashoffset="19"
                initial={{ strokeDasharray: "0 75" }}
                animate={{ strokeDasharray: `${parseInt(c.pct) * 0.75} 75` }}
                transition={{ delay: 0.4 + i * 0.25, duration: 0.7 }}
              />
              <text x="14" y="17" textAnchor="middle" fontSize="6.5" fill={c.color} fontWeight="700">{c.pct}</text>
            </svg>
            <div>
              <p className="text-[9px] font-bold text-slate-800">{c.label}</p>
              <p className="text-[6.5px] text-slate-400">From R100 · {parseInt(c.pct) + 3}+ shares</p>
            </div>
          </motion.div>
        ))}
        <motion.div
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.4 }}
          className="mt-1 rounded-lg py-1.5 text-center text-[9px] font-bold text-white"
          style={{ background: "linear-gradient(90deg, #4ECDC4, #00B4D8)" }}
        >
          Start Investing →
        </motion.div>
      </div>
      <div className="flex border-t border-slate-100 bg-white py-1">
        {["Markets","Invest","Credit","Help"].map((t, i) => (
          <div key={t} className={`flex flex-1 flex-col items-center gap-0.5 ${i === 1 ? "text-teal-500" : "text-slate-400"}`}>
            <div className={`h-2 w-2 rounded-full ${i === 1 ? "bg-teal-400" : "bg-slate-200"}`}/>
            <span style={{ fontSize: 5 }}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PhoneGrowthChart() {
  const points = [[10,58],[25,50],[40,53],[55,38],[70,30],[85,22],[100,14],[115,8]];
  const lineD = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ");
  const areaD = lineD + ` L115 68 L10 68 Z`;
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="bg-white px-3 pb-2 pt-3 shadow-sm">
        <p className="text-center text-[9px] font-semibold text-slate-700">Mint Baskets</p>
      </div>
      <div className="flex-1 px-3 pt-2">
        <p className="text-[10px] font-bold text-slate-800">Watch Your Basket Grow</p>
        <p className="text-[7px] text-slate-400 mb-2">Real-time returns tracking</p>
        {/* chart */}
        <svg width="100%" height="76" viewBox="0 0 130 78">
          <defs>
            <linearGradient id="growGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4ECDC4" stopOpacity="0.5"/>
              <stop offset="100%" stopColor="#4ECDC4" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <motion.path d={areaD} fill="url(#growGrad)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}/>
          <motion.path
            d={lineD}
            stroke="#4ECDC4"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
          <motion.circle cx="115" cy="8" r="4" fill="white" stroke="#4ECDC4" strokeWidth="2"
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.1, type: "spring" }}/>
          <motion.text x="80" y="6" fontSize="7" fill="#20C997" fontWeight="700"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>▲ +24.6%</motion.text>
        </svg>
        {/* stats row */}
        <div className="mt-1 flex gap-2">
          {[["Value","R1,245"],["Return","+R204"],["Baskets","3"]].map(([l, v]) => (
            <motion.div key={l} className="flex-1 rounded-lg bg-slate-50 p-1.5 text-center"
              initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.0 }}>
              <p style={{ fontSize: 6.5 }} className="text-slate-400">{l}</p>
              <p style={{ fontSize: 9 }} className="font-bold text-slate-800">{v}</p>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="flex border-t border-slate-100 bg-white py-1">
        {["Markets","Invest","Credit","Help"].map((t, i) => (
          <div key={t} className={`flex flex-1 flex-col items-center gap-0.5 ${i === 1 ? "text-teal-500" : "text-slate-400"}`}>
            <div className={`h-2 w-2 rounded-full ${i === 1 ? "bg-teal-400" : "bg-slate-200"}`}/>
            <span style={{ fontSize: 5 }}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PHONE_SCREENS = [PhoneBasketsList, PhoneCategories, PhoneGrowthChart];

/* ── Scene data ─────────────────────────────────────── */
const SCENES = [
  {
    headline: "Choose Your Basket\n& Invest Your Way",
    sub: "Ready-made collections of top JSE shares — built by our experts.",
    showHand: true,
    handX: "54%",
    handY: "46%",
    confetti: false,
  },
  {
    headline: "Pick a Strategy,\nStart from R100",
    sub: "Growth, Balanced or Income — there's a basket for every goal.",
    showHand: true,
    handX: "50%",
    handY: "52%",
    confetti: false,
  },
  {
    headline: "Watch Your\nBasket Grow",
    sub: "Track real-time performance and returns from day one.",
    showHand: false,
    confetti: true,
  },
];

/* ── Dots ───────────────────────────────────────────── */
function Dots({ total, current }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ width: i === current ? 22 : 7, opacity: i === current ? 1 : 0.35 }}
          transition={{ duration: 0.25 }}
          style={{ height: 7, borderRadius: 4, background: "#1D1D5C" }}
        />
      ))}
    </div>
  );
}

/* ── Main component ─────────────────────────────────── */
export default function MintBasketsExplainer({ onDone }) {
  const [scene, setScene] = useState(0);
  const [exiting, setExiting] = useState(false);
  const isLast = scene === SCENES.length - 1;
  const timerRef = useRef(null);

  const advance = useCallback(() => {
    if (isLast) { finish(); return; }
    setScene((s) => s + 1);
  }, [isLast]);

  const finish = useCallback(() => {
    setExiting(true);
    localStorage.setItem(STORAGE_KEY, "1");
    setTimeout(() => onDone?.(), 380);
  }, [onDone]);

  // auto-advance on non-last scenes
  useEffect(() => {
    if (isLast) return;
    timerRef.current = setTimeout(advance, 3200);
    return () => clearTimeout(timerRef.current);
  }, [scene, isLast, advance]);

  const { headline, sub, showHand, handX, handY, confetti } = SCENES[scene];
  const typedHeadline = useTypewriter(headline, 38, true);
  const PhoneScreen = PHONE_SCREENS[scene];

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="explainer-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.32 }}
          className="fixed inset-0 z-[999] flex flex-col overflow-hidden"
          style={{ background: "#F0FDFB" }}
        >
          {/* background blobs */}
          <Blobs />

          {/* confetti */}
          {confetti && <Confetti />}

          {/* Skip button */}
          <button
            onClick={finish}
            className="absolute right-5 top-12 z-30 rounded-full bg-white/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-slate-400 shadow-sm backdrop-blur-sm transition hover:bg-white hover:text-slate-600"
          >
            Skip
          </button>

          {/* main content */}
          <div className="relative z-10 flex flex-1 flex-col items-center px-6 pt-14">

            {/* Headline — typewriter */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`headline-${scene}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="mb-4 w-full max-w-sm"
              >
                <h1
                  className="text-[26px] font-extrabold leading-tight text-[#1D1D5C]"
                  style={{ minHeight: 68, whiteSpace: "pre-line" }}
                >
                  {typedHeadline}
                  <span className="animate-pulse text-teal-400">|</span>
                </h1>
              </motion.div>
            </AnimatePresence>

            {/* Phone + character row */}
            <div className="relative flex w-full max-w-sm items-end justify-center">

              {/* Character — bottom left */}
              <motion.div
                key={`char-${scene}`}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="absolute bottom-0 left-0 z-10"
                style={{ marginBottom: -8 }}
              >
                <Character celebrate={confetti} />
              </motion.div>

              {/* iPhone mockup */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`phone-${scene}`}
                  initial={{ y: 18, opacity: 0, scale: 0.96 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: -12, opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
                  className="relative z-20 ml-16"
                  style={{
                    width: 175,
                    height: 310,
                    background: "#fff",
                    borderRadius: 24,
                    boxShadow: "0 12px 40px rgba(0,0,0,0.18), inset 0 0 0 2px #E2E8F0",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  {/* notch */}
                  <div style={{
                    position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                    width: 60, height: 12, background: "#1D1D5C", borderRadius: "0 0 10px 10px", zIndex: 5,
                  }}/>
                  {/* status bar */}
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: 20,
                    background: "white", zIndex: 4, display: "flex", alignItems: "center",
                    justifyContent: "space-between", padding: "0 10px",
                  }}>
                    <span style={{ fontSize: 7, fontWeight: 700, color: "#1D1D5C" }}>12:25</span>
                    <span style={{ fontSize: 6, color: "#94a3b8" }}>●●● ▲ ■</span>
                  </div>
                  {/* screen content */}
                  <div style={{ position: "absolute", inset: 0, top: 20, overflow: "hidden" }}>
                    <PhoneScreen />
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* animated hand pointer */}
              <HandPointer
                visible={showHand}
                targetX={handX}
                targetY={handY}
              />
            </div>

          </div>

          {/* Bottom: sub-text, dots, button */}
          <div className="relative z-10 flex flex-col items-center gap-4 pb-10 pt-5">
            <AnimatePresence mode="wait">
              <motion.p
                key={`sub-${scene}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.4, duration: 0.35 }}
                className="px-8 text-center text-[13px] leading-relaxed text-[#1D1D5C]/60"
              >
                {sub}
              </motion.p>
            </AnimatePresence>

            <Dots total={SCENES.length} current={scene} />

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={advance}
              className="rounded-2xl px-12 py-3.5 text-[14px] font-bold tracking-wide text-white shadow-lg"
              style={{
                background: isLast
                  ? "linear-gradient(135deg, #00C9A7, #00B4D8)"
                  : "linear-gradient(135deg, #4ECDC4, #00B4D8)",
              }}
            >
              {isLast ? "Let's explore Baskets →" : "Next"}
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
