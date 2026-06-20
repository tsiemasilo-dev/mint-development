import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const BASKETS_EXPLAINER_KEY = "mint_baskets_explainer_seen";

/* ── Brand tokens ───────────────────────────────────── */
const BRAND = {
  bg: "#0f0b1e",
  deep: "#1a0f3a",
  purple: "#3b1b7a",
  violet: "#5b21b6",
  lavender: "#a78bfa",
  white: "#ffffff",
  muted: "rgba(167,139,250,0.5)",
};

/* ── Pulsing ring around tab ─────────────────────────── */
function TabRing({ rect }) {
  if (!rect) return null;
  const pad = 8;
  return (
    <div
      className="pointer-events-none fixed z-[1002]"
      style={{
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }}
    >
      {/* static ring */}
      <motion.div
        className="absolute inset-0 rounded-[16px]"
        style={{ border: `2.5px solid ${BRAND.lavender}` }}
        initial={{ opacity: 0, scale: 1.3 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: "backOut" }}
      />
      {/* pulse ring 1 */}
      <motion.div
        className="absolute inset-0 rounded-[16px]"
        style={{ border: `2px solid ${BRAND.lavender}` }}
        animate={{ opacity: [0.7, 0], scale: [1, 1.6] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
      />
      {/* pulse ring 2 */}
      <motion.div
        className="absolute inset-0 rounded-[16px]"
        style={{ border: `2px solid ${BRAND.lavender}` }}
        animate={{ opacity: [0.5, 0], scale: [1, 1.9] }}
        transition={{ duration: 1.4, delay: 0.4, repeat: Infinity, ease: "easeOut" }}
      />
      {/* glow */}
      <div
        className="absolute inset-0 rounded-[16px]"
        style={{ boxShadow: `0 0 18px 4px ${BRAND.lavender}55` }}
      />
      {/* arrow pointing up at the ring */}
      <motion.div
        className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: [0, -4, 0] }}
        transition={{ delay: 0.5, duration: 1.2, repeat: Infinity }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 14 L9 4 M4 9 L9 4 L14 9" stroke={BRAND.lavender} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </motion.div>
    </div>
  );
}

/* ── 9:16 SVG Scene A — Basket of stocks ─────────────── */
function BasketSVG() {
  return (
    <svg
      viewBox="0 0 270 480"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%" }}
    >
      {/* background */}
      <rect width="270" height="480" fill={BRAND.bg} />

      {/* ambient glow blobs */}
      <ellipse cx="135" cy="240" rx="130" ry="130" fill={BRAND.purple} opacity="0.18" />
      <ellipse cx="60" cy="380" rx="80" ry="80" fill={BRAND.violet} opacity="0.12" />
      <ellipse cx="210" cy="100" rx="70" ry="70" fill={BRAND.violet} opacity="0.10" />

      {/* grid lines */}
      {[120, 200, 280, 360].map((y) => (
        <line key={y} x1="30" y1={y} x2="240" y2={y} stroke={BRAND.lavender} strokeOpacity="0.08" strokeWidth="1" />
      ))}

      {/* basket body */}
      <motion.rect
        x="55" y="230" width="160" height="110" rx="18"
        fill="rgba(91,33,182,0.3)"
        stroke={BRAND.lavender}
        strokeWidth="2.5"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
      {/* weave lines */}
      {[95, 135, 175].map((x, i) => (
        <motion.line key={x} x1={x} y1="230" x2={x} y2="340"
          stroke={BRAND.violet} strokeWidth="1.5" strokeOpacity="0.6"
          strokeDasharray="5 5"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.9 + i * 0.12 }}
        />
      ))}
      {[255, 278, 300, 322].map((y, i) => (
        <motion.line key={y} x1="55" y1={y} x2="215" y2={y}
          stroke={BRAND.violet} strokeWidth="1.5" strokeOpacity="0.6"
          strokeDasharray="5 5"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 1.1 + i * 0.1 }}
        />
      ))}
      {/* handle */}
      <motion.path
        d="M80 230 Q135 175 190 230"
        stroke={BRAND.lavender} strokeWidth="3.5" strokeLinecap="round" fill="none"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 0.7, delay: 0.1 }}
      />

      {/* stock coins dropping into basket */}
      {[
        { letter: "N", color: "#FF6B6B", label: "NPN",  cx: 90,  cy: 185, delay: 0.5 },
        { letter: "S", color: "#22c55e", label: "SOL",  cx: 135, cy: 170, delay: 0.75 },
        { letter: "B", color: "#3b82f6", label: "BHP",  cx: 180, cy: 185, delay: 1.0 },
        { letter: "F", color: "#f59e0b", label: "FSR",  cx: 112, cy: 155, delay: 1.25 },
      ].map(({ letter, color, label, cx, cy, delay }) => (
        <motion.g key={label}
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay, type: "spring", stiffness: 240, damping: 20 }}
        >
          {/* coin glow */}
          <circle cx={cx} cy={cy} r="22" fill={color} opacity="0.15" />
          <circle cx={cx} cy={cy} r="17" fill={color} opacity="0.9" />
          <circle cx={cx} cy={cy} r="13" fill="rgba(255,255,255,0.12)" />
          <text x={cx} y={cy + 5} textAnchor="middle" fontSize="12" fontWeight="800" fill="white">{letter}</text>
          {/* label badge */}
          <motion.rect x={cx - 13} y={cy + 19} width="26" height="11" rx="5"
            fill={color} opacity="0.25"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: delay + 0.3 }}
          />
          <motion.text x={cx} y={cy + 28} textAnchor="middle" fontSize="6.5" fill={color} fontWeight="700"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: delay + 0.3 }}
          >{label}</motion.text>
        </motion.g>
      ))}

      {/* sparkles */}
      {[{ cx: 42, cy: 195, delay: 1.6 }, { cx: 228, cy: 210, delay: 1.9 }, { cx: 135, cy: 130, delay: 2.1 }].map(({ cx, cy, delay }, i) => (
        <motion.text key={i} x={cx} y={cy} fontSize="14" fill={BRAND.lavender}
          initial={{ opacity: 0, scale: 0 }} animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.8] }}
          transition={{ delay, duration: 1.0, repeat: Infinity, repeatDelay: 2.5 }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        >✦</motion.text>
      ))}

      {/* label text */}
      <motion.text x="135" y="378" textAnchor="middle" fontSize="13" fontWeight="700"
        fill={BRAND.lavender} letterSpacing="2"
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }}
      >CURATED PORTFOLIOS</motion.text>
      <motion.text x="135" y="400" textAnchor="middle" fontSize="10.5"
        fill="rgba(255,255,255,0.45)"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.7 }}
      >Expert-built · JSE-listed · From R100</motion.text>

      {/* horizontal divider */}
      <motion.line x1="75" y1="413" x2="195" y2="413" stroke={BRAND.lavender} strokeOpacity="0.2" strokeWidth="1"
        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 1.8 }}
        style={{ transformOrigin: "135px 413px" }}
      />

      {/* mini performance row */}
      {[
        { label: "+18%", x: 85 },
        { label: "+12%", x: 135 },
        { label: "+9%", x: 185 },
      ].map(({ label, x }) => (
        <motion.text key={label} x={x} y="436" textAnchor="middle" fontSize="9" fontWeight="700"
          fill="#4ade80"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.0 }}
        >{label}</motion.text>
      ))}
    </svg>
  );
}

/* ── 9:16 SVG Scene B — Growth chart ─────────────────── */
function GrowthSVG() {
  const pts = [[30,340],[60,310],[90,320],[120,280],[150,250],[185,210],[220,175],[250,140]];
  const line = pts.map(([x,y],i) => `${i===0?"M":"L"}${x} ${y}`).join(" ");
  const area = line + ` L250 360 L30 360 Z`;

  return (
    <svg
      viewBox="0 0 270 480"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%" }}
    >
      <rect width="270" height="480" fill={BRAND.bg} />

      {/* glow blobs */}
      <ellipse cx="135" cy="240" rx="120" ry="120" fill={BRAND.purple} opacity="0.15" />
      <ellipse cx="220" cy="150" rx="60" ry="60" fill={BRAND.violet} opacity="0.12" />

      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BRAND.lavender} stopOpacity="0.4"/>
          <stop offset="100%" stopColor={BRAND.lavender} stopOpacity="0"/>
        </linearGradient>
      </defs>

      {/* y-axis grid */}
      {[155, 220, 285, 350].map(y => (
        <line key={y} x1="28" y1={y} x2="255" y2={y}
          stroke={BRAND.lavender} strokeOpacity="0.08" strokeWidth="1"
        />
      ))}

      {/* area fill */}
      <motion.path d={area} fill="url(#areaGrad)"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.9 }}
      />

      {/* chart line */}
      <motion.path
        d={line}
        stroke={BRAND.lavender} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 1.4, ease: "easeOut" }}
      />

      {/* end dot */}
      <motion.circle cx="250" cy="140" r="7" fill="white"
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.3, type: "spring" }}
      />
      <motion.circle cx="250" cy="140" r="4" fill={BRAND.violet}
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.4, type: "spring" }}
      />
      {/* glow pulse */}
      <motion.circle cx="250" cy="140" r="14" fill={BRAND.lavender} opacity="0"
        animate={{ r: [10, 22], opacity: [0.5, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
      />

      {/* return badge */}
      <motion.rect x="158" y="105" width="82" height="28" rx="8"
        fill={BRAND.violet} opacity="0.8"
        initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 0.85 }}
        transition={{ delay: 1.4, type: "spring" }}
      />
      <motion.text x="199" y="124" textAnchor="middle" fontSize="13" fontWeight="800" fill="white"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}
      >▲ +24.6%</motion.text>

      {/* start label */}
      <motion.text x="30" y="375" fontSize="9" fill="rgba(255,255,255,0.35)"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
      >R100 invested</motion.text>

      {/* current value box */}
      <motion.g initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6 }}>
        <rect x="60" y="400" width="150" height="46" rx="12" fill={BRAND.deep} />
        <rect x="60" y="400" width="150" height="46" rx="12" stroke={BRAND.lavender} strokeOpacity="0.25" strokeWidth="1"/>
        <text x="135" y="420" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.45)">Current value</text>
        <text x="135" y="439" textAnchor="middle" fontSize="18" fontWeight="800" fill="white">R1,246.00</text>
      </motion.g>

      {/* confetti dots */}
      {[
        {cx:45,cy:120,c:"#FF6B6B",d:0.8},{cx:225,cy:300,c:"#22c55e",d:1.0},
        {cx:55,cy:240,c:"#f59e0b",d:1.2},{cx:240,cy:200,c:"#3b82f6",d:0.9},
        {cx:130,cy:105,c:"#ec4899",d:1.3},
      ].map(({cx,cy,c,d},i) => (
        <motion.circle key={i} cx={cx} cy={cy} r="5" fill={c}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0,1.4,1], opacity: [0,1,0.8] }}
          transition={{ delay: d, duration: 0.5 }}
        />
      ))}

      {/* label */}
      <motion.text x="135" y="84" textAnchor="middle" fontSize="13" fontWeight="700"
        fill={BRAND.lavender} letterSpacing="2"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}
      >WATCH IT GROW</motion.text>
    </svg>
  );
}

/* ── Dots ────────────────────────────────────────────── */
function Dots({ total, current }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div key={i}
          animate={{ width: i === current ? 24 : 8, opacity: i === current ? 1 : 0.3 }}
          transition={{ duration: 0.25 }}
          style={{ height: 8, borderRadius: 4, background: BRAND.lavender }}
        />
      ))}
    </div>
  );
}

/* ── Main component ─────────────────────────────────── */
const SCENES = [
  {
    id: "spotlight",
    title: "Meet Mint Baskets",
    body: "Tap the highlighted tab above to start exploring curated investment portfolios — built by our experts.",
    showRing: true,
    svgScene: null,
  },
  {
    id: "basket",
    title: "One tap, multiple stocks",
    body: "Each basket holds a curated mix of top JSE-listed companies. Diversified automatically.",
    showRing: false,
    svgScene: "basket",
  },
  {
    id: "grow",
    title: "Start from R100",
    body: "Pick a basket, invest, and track your real-time performance from day one.",
    showRing: false,
    svgScene: "grow",
  },
];

export default function MintBasketsExplainer({ onDone, tabRef }) {
  const [scene, setScene] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [tabRect, setTabRect] = useState(null);
  const timerRef = useRef(null);
  const isLast = scene === SCENES.length - 1;

  useEffect(() => {
    if (tabRef?.current) {
      const r = tabRef.current.getBoundingClientRect();
      setTabRect(r);
    }
  }, [tabRef, scene]);

  const advance = useCallback(() => {
    if (isLast) { finish(); return; }
    setScene(s => s + 1);
  }, [isLast]);

  const finish = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDone?.(), 350);
  }, [onDone]);

  // auto-advance scene 0 only
  useEffect(() => {
    if (scene !== 0) return;
    timerRef.current = setTimeout(advance, 3000);
    return () => clearTimeout(timerRef.current);
  }, [scene, advance]);

  const currentScene = SCENES[scene];

  return (
    <AnimatePresence>
      {!exiting && (
        <>
          {/* ── Tab ring highlight ── */}
          <AnimatePresence>
            {currentScene.showRing && tabRect && (
              <motion.div key="ring" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <TabRing rect={tabRect} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Backdrop (only dims area BELOW the header) ── */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[998] pointer-events-none"
            style={{
              background: "linear-gradient(to bottom, transparent 0%, transparent 35%, rgba(0,0,0,0.6) 55%)",
            }}
          />

          {/* ── Bottom sheet ── */}
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed bottom-0 left-0 right-0 z-[999] overflow-hidden"
            style={{
              borderRadius: "28px 28px 0 0",
              background: "linear-gradient(165deg, #1a0f3a 0%, #0f0b1e 60%)",
              borderTop: `1px solid rgba(167,139,250,0.2)`,
              boxShadow: "0 -12px 48px rgba(91,33,182,0.35)",
            }}
          >
            {/* top accent line */}
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent, #a78bfa66, transparent)" }}
            />

            {/* drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: "rgba(167,139,250,0.3)" }} />
            </div>

            {/* Skip */}
            <button
              onClick={finish}
              className="absolute top-3 right-5 text-[11px] font-semibold tracking-widest uppercase"
              style={{ color: "rgba(167,139,250,0.55)" }}
            >
              Skip
            </button>

            <div className="px-6 pb-8 pt-2">

              {/* 9:16 SVG illustration (scenes 1 & 2 only) */}
              <AnimatePresence mode="wait">
                {currentScene.svgScene && (
                  <motion.div
                    key={currentScene.svgScene}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.35 }}
                    className="mx-auto overflow-hidden rounded-2xl"
                    style={{
                      aspectRatio: "9/16",
                      maxHeight: "38vh",
                      width: "auto",
                      maxWidth: "100%",
                      border: `1px solid rgba(167,139,250,0.15)`,
                      boxShadow: "0 4px 24px rgba(91,33,182,0.3)",
                    }}
                  >
                    {currentScene.svgScene === "basket" ? <BasketSVG /> : <GrowthSVG />}
                  </motion.div>
                )}

                {/* Scene 0: icon instead of SVG */}
                {!currentScene.svgScene && (
                  <motion.div
                    key="icon"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="mx-auto mb-1 flex items-center justify-center"
                    style={{
                      width: 72, height: 72,
                      borderRadius: 20,
                      background: "rgba(91,33,182,0.3)",
                      border: `1.5px solid rgba(167,139,250,0.3)`,
                      boxShadow: "0 0 24px rgba(167,139,250,0.2)",
                    }}
                  >
                    <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
                      <path d="M8 22 Q19 10 30 22" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round" fill="none"/>
                      <rect x="5" y="22" width="28" height="13" rx="5" fill="rgba(167,139,250,0.25)" stroke="#a78bfa" strokeWidth="2"/>
                      {[12,19,26].map(x => <line key={x} x1={x} y1="22" x2={x} y2="35" stroke="#7c3aed" strokeWidth="1.2" strokeDasharray="3 3"/>)}
                    </svg>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Title + body */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`text-${scene}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 text-center"
                >
                  <h2 className="text-[20px] font-extrabold leading-tight text-white">
                    {currentScene.title}
                  </h2>
                  <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: "rgba(167,139,250,0.75)" }}>
                    {currentScene.body}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Dots + CTA */}
              <div className="mt-5 flex flex-col items-center gap-4">
                <Dots total={SCENES.length} current={scene} />

                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={advance}
                  className="w-full rounded-2xl py-3.5 text-[14px] font-bold tracking-wide text-white"
                  style={{
                    background: isLast
                      ? "linear-gradient(135deg, #7c3aed, #5b21b6)"
                      : "rgba(167,139,250,0.15)",
                    border: `1px solid rgba(167,139,250,${isLast ? "0.6" : "0.25"})`,
                    boxShadow: isLast ? "0 4px 18px rgba(124,58,237,0.4)" : "none",
                  }}
                >
                  {isLast ? "Explore Mint Baskets →" : "Next"}
                </motion.button>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
