import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "mint_baskets_explainer_seen";

const scenes = [
  {
    id: "basket",
    title: "What's a Mint Basket?",
    subtitle: "A ready-made collection of shares, built by our experts.",
  },
  {
    id: "stocks",
    title: "Multiple stocks in one tap",
    subtitle: "Each basket holds a curated mix of top JSE-listed companies.",
  },
  {
    id: "balance",
    title: "Built-in diversification",
    subtitle: "Spread your risk across sectors — automatically.",
  },
  {
    id: "chart",
    title: "Watch it grow",
    subtitle: "Track real-time performance and returns from day one.",
  },
  {
    id: "cta",
    title: "Start from as little as R100",
    subtitle: "Pick a basket, invest, and let the market do the work.",
  },
];

/* ── SVG scenes ─────────────────────────────────────────── */

function BasketSVG() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="drop-shadow-2xl">
      {/* handle arc */}
      <motion.path
        d="M30 55 Q60 18 90 55"
        stroke="#a78bfa"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
      {/* basket body */}
      <motion.rect
        x="20" y="55" width="80" height="52" rx="10"
        stroke="#c4b5fd"
        strokeWidth="4"
        fill="rgba(91,33,182,0.25)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.9, delay: 0.5, ease: "easeOut" }}
      />
      {/* weave lines vertical */}
      {[40, 60, 80].map((x, i) => (
        <motion.line
          key={x}
          x1={x} y1="55" x2={x} y2="107"
          stroke="#7c3aed"
          strokeWidth="2"
          strokeDasharray="4 4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 1.1 + i * 0.1 }}
        />
      ))}
      {/* weave lines horizontal */}
      {[68, 82, 96].map((y, i) => (
        <motion.line
          key={y}
          x1="20" y1={y} x2="100" y2={y}
          stroke="#7c3aed"
          strokeWidth="2"
          strokeDasharray="4 4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 1.4 + i * 0.1 }}
        />
      ))}
      {/* sparkle top */}
      <motion.circle
        cx="60" cy="12" r="4"
        fill="#fbbf24"
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.4, 1] }}
        transition={{ delay: 1.6, duration: 0.5 }}
      />
      <motion.text
        x="57" y="16"
        fontSize="8" fill="#fbbf24" fontWeight="bold"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.9 }}
      >✦</motion.text>
    </svg>
  );
}

const STOCK_ICONS = [
  { letter: "N", color: "#f97316", label: "Naspers" },
  { letter: "S", color: "#22c55e", label: "Sasol" },
  { letter: "A", color: "#3b82f6", label: "Anglo" },
  { letter: "F", color: "#ec4899", label: "FirstRand" },
];

function StocksSVG() {
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" fill="none">
      {/* basket outline at bottom */}
      <motion.rect
        x="25" y="90" width="90" height="44" rx="10"
        stroke="#c4b5fd"
        strokeWidth="3"
        fill="rgba(91,33,182,0.2)"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      />
      {/* handle */}
      <motion.path
        d="M40 90 Q70 66 100 90"
        stroke="#a78bfa"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5 }}
      />
      {/* stock coins dropping in */}
      {STOCK_ICONS.map((s, i) => (
        <motion.g
          key={s.letter}
          initial={{ y: -30, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{
            delay: 0.3 + i * 0.35,
            type: "spring",
            stiffness: 260,
            damping: 18,
          }}
        >
          <circle
            cx={35 + i * 24}
            cy={60}
            r="13"
            fill={s.color}
            opacity="0.9"
          />
          <text
            x={35 + i * 24}
            y={65}
            textAnchor="middle"
            fontSize="11"
            fill="white"
            fontWeight="800"
          >
            {s.letter}
          </text>
        </motion.g>
      ))}
    </svg>
  );
}

function BalanceSVG() {
  return (
    <svg width="140" height="130" viewBox="0 0 140 130" fill="none">
      {/* pole */}
      <motion.line
        x1="70" y1="20" x2="70" y2="110"
        stroke="#a78bfa"
        strokeWidth="4"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5 }}
      />
      {/* beam */}
      <motion.line
        x1="20" y1="50" x2="120" y2="50"
        stroke="#c4b5fd"
        strokeWidth="4"
        strokeLinecap="round"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.4, duration: 0.5, ease: "backOut" }}
        style={{ transformOrigin: "70px 50px" }}
      />
      {/* left pan + coins */}
      <motion.g
        initial={{ y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
      >
        <line x1="30" y1="50" x2="30" y2="78" stroke="#a78bfa" strokeWidth="2" />
        <ellipse cx="30" cy="82" rx="18" ry="7" fill="rgba(167,139,250,0.25)" stroke="#a78bfa" strokeWidth="2" />
        <circle cx="24" cy="76" r="5" fill="#f97316" opacity="0.85" />
        <circle cx="36" cy="76" r="5" fill="#22c55e" opacity="0.85" />
      </motion.g>
      {/* right pan + coins */}
      <motion.g
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.0, type: "spring", stiffness: 200 }}
      >
        <line x1="110" y1="50" x2="110" y2="78" stroke="#a78bfa" strokeWidth="2" />
        <ellipse cx="110" cy="82" rx="18" ry="7" fill="rgba(167,139,250,0.25)" stroke="#a78bfa" strokeWidth="2" />
        <circle cx="104" cy="76" r="5" fill="#3b82f6" opacity="0.85" />
        <circle cx="116" cy="76" r="5" fill="#ec4899" opacity="0.85" />
      </motion.g>
      {/* balanced tick */}
      <motion.path
        d="M60 108 L66 115 L82 100"
        stroke="#4ade80"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 1.4, duration: 0.5 }}
      />
    </svg>
  );
}

const CHART_POINTS = [
  [0, 80], [18, 72], [36, 75], [54, 60], [72, 52], [90, 42], [108, 30], [120, 20],
];

function ChartSVG() {
  const d = CHART_POINTS.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x + 10} ${y + 10}`).join(" ");
  const area = d + ` L${CHART_POINTS[CHART_POINTS.length - 1][0] + 10} 100 L10 100 Z`;
  return (
    <svg width="140" height="115" viewBox="0 0 140 115" fill="none">
      {/* grid lines */}
      {[30, 55, 80].map((y) => (
        <motion.line
          key={y}
          x1="8" y1={y} x2="132" y2={y}
          stroke="rgba(167,139,250,0.2)"
          strokeWidth="1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        />
      ))}
      {/* area fill */}
      <motion.path
        d={area}
        fill="url(#chartGrad)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.8 }}
      />
      {/* line */}
      <motion.path
        d={d}
        stroke="#a78bfa"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
      />
      {/* end dot */}
      <motion.circle
        cx={CHART_POINTS[CHART_POINTS.length - 1][0] + 10}
        cy={CHART_POINTS[CHART_POINTS.length - 1][1] + 10}
        r="5"
        fill="#ffffff"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1.1, type: "spring" }}
      />
      <motion.circle
        cx={CHART_POINTS[CHART_POINTS.length - 1][0] + 10}
        cy={CHART_POINTS[CHART_POINTS.length - 1][1] + 10}
        r="3"
        fill="#7c3aed"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1.2, type: "spring" }}
      />
      {/* upward label */}
      <motion.text
        x="95" y="22"
        fontSize="9"
        fill="#4ade80"
        fontWeight="700"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.3 }}
      >▲ +24.6%</motion.text>
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function CtaSVG() {
  const coins = [
    { cx: 36, cy: 68, color: "#f97316" },
    { cx: 60, cy: 55, color: "#a78bfa" },
    { cx: 84, cy: 68, color: "#22c55e" },
    { cx: 48, cy: 82, color: "#3b82f6" },
    { cx: 72, cy: 82, color: "#ec4899" },
  ];
  return (
    <svg width="120" height="115" viewBox="0 0 120 115" fill="none">
      {/* R100 label */}
      <motion.rect
        x="22" y="10" width="76" height="32" rx="10"
        fill="rgba(91,33,182,0.35)"
        stroke="#a78bfa"
        strokeWidth="2"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
      />
      <motion.text
        x="60" y="32"
        textAnchor="middle"
        fontSize="16"
        fontWeight="800"
        fill="#ffffff"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >R100</motion.text>
      {/* coins cascade */}
      {coins.map((c, i) => (
        <motion.g key={i} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4 + i * 0.15, type: "spring", stiffness: 300, damping: 20 }}>
          <circle cx={c.cx} cy={c.cy} r="14" fill={c.color} opacity="0.85" />
          <circle cx={c.cx} cy={c.cy} r="10" fill="rgba(255,255,255,0.12)" />
        </motion.g>
      ))}
      {/* arrow down into coins */}
      <motion.path
        d="M60 44 L60 52"
        stroke="#c4b5fd"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      />
      <motion.path
        d="M55 49 L60 54 L65 49"
        stroke="#c4b5fd"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.5, duration: 0.25 }}
      />
    </svg>
  );
}

const SCENE_SVGS = [BasketSVG, StocksSVG, BalanceSVG, ChartSVG, CtaSVG];

/* ── Dot indicator ─────────────────────────────────────── */
function Dots({ total, current }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ width: i === current ? 20 : 6, opacity: i === current ? 1 : 0.4 }}
          transition={{ duration: 0.3 }}
          className="h-1.5 rounded-full bg-white"
        />
      ))}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────── */
export default function MintBasketsExplainer({ onDone }) {
  const [scene, setScene] = useState(0);
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef(null);
  const isLast = scene === scenes.length - 1;

  const advance = () => {
    if (isLast) {
      finish();
    } else {
      setScene((s) => s + 1);
    }
  };

  const finish = () => {
    setExiting(true);
    localStorage.setItem(STORAGE_KEY, "1");
    setTimeout(() => onDone?.(), 420);
  };

  useEffect(() => {
    if (isLast) return;
    timerRef.current = setTimeout(advance, 2800);
    return () => clearTimeout(timerRef.current);
  }, [scene]);

  const SceneSVG = SCENE_SVGS[scene];

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="explainer-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[999] flex flex-col items-center justify-center"
          style={{
            background:
              "linear-gradient(160deg, #111111 0%, #3b1b7a 45%, #5b21b6 100%)",
          }}
        >
          {/* Skip */}
          <button
            onClick={finish}
            className="absolute right-5 top-12 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-widest uppercase text-white/60 backdrop-blur-sm transition hover:bg-white/20 hover:text-white"
          >
            Skip
          </button>

          {/* Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={scene}
              initial={{ opacity: 0, y: 28, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.97 }}
              transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
              className="flex w-[88vw] max-w-xs flex-col items-center gap-6 rounded-3xl border border-white/10 bg-white/5 px-8 py-10 shadow-2xl backdrop-blur-md"
            >
              {/* SVG illustration */}
              <div className="flex h-36 items-center justify-center">
                <SceneSVG />
              </div>

              {/* Text */}
              <div className="space-y-2 text-center">
                <h2 className="text-xl font-bold leading-tight text-white">
                  {scenes[scene].title}
                </h2>
                <p className="text-sm leading-relaxed text-white/60">
                  {scenes[scene].subtitle}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Dots + button */}
          <div className="mt-8 flex flex-col items-center gap-6">
            <Dots total={scenes.length} current={scene} />

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={advance}
              className="rounded-2xl px-10 py-3.5 text-sm font-semibold text-white shadow-lg transition-all"
              style={{
                background: isLast
                  ? "linear-gradient(135deg, #7c3aed, #5b21b6)"
                  : "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              {isLast ? "Let's explore baskets →" : "Next"}
            </motion.button>
          </div>

          {/* Ambient glow blobs */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-20 top-1/4 h-64 w-64 rounded-full bg-violet-600/20 blur-3xl" />
            <div className="absolute -right-20 bottom-1/4 h-56 w-56 rounded-full bg-purple-500/15 blur-3xl" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { STORAGE_KEY as BASKETS_EXPLAINER_KEY };
