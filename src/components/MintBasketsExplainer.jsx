import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const BASKETS_EXPLAINER_KEY = "mint_baskets_explainer_seen";

/* ─────────────────────────────────────────────
   Phase 0 — Tab Coach Mark
   Pulsing ring + label around the Mint Baskets tab
───────────────────────────────────────────── */
function TabSpotlight({ rect }) {
  if (!rect) return null;
  const pad = 9;
  const top  = rect.top  - pad;
  const left = rect.left - pad;
  const w    = rect.width  + pad * 2;
  const h    = rect.height + pad * 2;
  const r    = 16;

  return (
    <>
      {/* dark overlay with spotlight hole via box-shadow */}
      <motion.div
        className="pointer-events-none fixed inset-0 z-[999]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          background: "rgba(0,0,0,0)",
        }}
      >
        {/* full-screen dim */}
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.68)" }} />
        {/* spotlight hole — transparent window at tab position */}
        <div
          className="absolute"
          style={{
            top,
            left,
            width: w,
            height: h,
            borderRadius: r,
            background: "transparent",
            boxShadow: "none",
            mixBlendMode: "destination-out",
          }}
        />
      </motion.div>

      {/* spotlight cut-out + ring, rendered separately on top */}
      <motion.div
        className="pointer-events-none fixed z-[1000]"
        style={{ top, left, width: w, height: h }}
        initial={{ opacity: 0, scale: 1.25 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: "backOut" }}
      >
        {/* solid ring */}
        <div
          className="absolute inset-0 rounded-[16px]"
          style={{
            border: "2.5px solid #a78bfa",
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.68), 0 0 20px 4px rgba(167,139,250,0.4)",
          }}
        />
        {/* pulse ring 1 */}
        <motion.div
          className="absolute inset-0 rounded-[16px]"
          style={{ border: "2px solid #a78bfa" }}
          animate={{ opacity: [0.8, 0], scale: [1, 1.65] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
        />
        {/* pulse ring 2 */}
        <motion.div
          className="absolute inset-0 rounded-[16px]"
          style={{ border: "1.5px solid #a78bfa" }}
          animate={{ opacity: [0.5, 0], scale: [1, 2.0] }}
          transition={{ duration: 1.5, delay: 0.5, repeat: Infinity, ease: "easeOut" }}
        />
      </motion.div>

      {/* label + bouncing arrow below the ring */}
      <motion.div
        className="pointer-events-none fixed z-[1001] flex flex-col items-center gap-1"
        style={{ top: top + h + 10, left: left + w / 2, transform: "translateX(-50%)" }}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 1.1, repeat: Infinity }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 14 L9 4 M4 9 L9 4 L14 9"
              stroke="#a78bfa" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
        <span
          className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
          style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.3)" }}
        >
          Mint Baskets
        </span>
      </motion.div>
    </>
  );
}

/* ─────────────────────────────────────────────
   Phase 1 — Card Spotlight + Callout
───────────────────────────────────────────── */
function CardSpotlight({ cardRect, cardName, cardDesc, onDone }) {
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    // fire the press animation after a short pause
    const t = setTimeout(() => setPressed(true), 400);
    return () => clearTimeout(t);
  }, []);

  if (!cardRect) return null;

  const pad = 10;
  const top  = cardRect.top  - pad;
  const left = cardRect.left - pad;
  const w    = cardRect.width  + pad * 2;
  const h    = cardRect.height + pad * 2;

  // Callout on left side of card (inside the spotlight, left 55% of card width)
  const calloutLeft = cardRect.left + 10;
  const calloutTop  = cardRect.top  + 10;
  const calloutWidth = Math.min(200, cardRect.width * 0.58);

  const pills = ["JSE-listed", "Expert-built", "From R100"];

  return (
    <>
      {/* dim overlay with spotlight hole */}
      <motion.div
        className="fixed inset-0 z-[999] pointer-events-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        onClick={onDone}
        style={{
          background: "rgba(0,0,0,0)",
        }}
      >
        {/* dim layer */}
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.72)" }} />
      </motion.div>

      {/* spotlight ring around card */}
      <motion.div
        className="pointer-events-none fixed z-[1000]"
        style={{ top, left, width: w, height: h }}
        initial={{ opacity: 0, scale: 1.08 }}
        animate={{ opacity: 1, scale: pressed ? [1, 0.97, 1] : 1 }}
        exit={{ opacity: 0 }}
        transition={{
          opacity: { duration: 0.35 },
          scale: pressed ? { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } : {},
        }}
      >
        <div
          className="absolute inset-0 rounded-[18px]"
          style={{
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.72), 0 0 0 2.5px #a78bfa, 0 0 22px 6px rgba(167,139,250,0.35)",
          }}
        />
        {/* subtle violet glow pulse */}
        <motion.div
          className="absolute inset-0 rounded-[18px]"
          style={{ border: "2px solid #a78bfa" }}
          animate={{ opacity: [0.6, 0.15, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {/* Callout — left side of the card */}
      <motion.div
        className="pointer-events-auto fixed z-[1001] flex flex-col"
        style={{
          top: calloutTop,
          left: calloutLeft,
          width: calloutWidth,
          maxWidth: "calc(100vw - 24px)",
        }}
        initial={{ opacity: 0, x: -18 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -12 }}
        transition={{ delay: pressed ? 0.55 : 0.2, duration: 0.45, ease: "easeOut" }}
      >
        {/* glass card */}
        <div
          className="rounded-2xl p-3"
          style={{
            background: "linear-gradient(135deg, rgba(26,15,58,0.97) 0%, rgba(15,11,30,0.97) 100%)",
            border: "1px solid rgba(167,139,250,0.3)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(167,139,250,0.1)",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* top accent */}
          <div className="mb-2 h-px w-full rounded-full"
            style={{ background: "linear-gradient(90deg, #a78bfa, transparent)" }} />

          {/* basket name */}
          <motion.p
            className="text-[9px] font-bold uppercase tracking-[0.2em]"
            style={{ color: "#a78bfa" }}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
          >
            Mint Basket
          </motion.p>
          <motion.p
            className="mt-0.5 text-[13px] font-extrabold leading-tight text-white"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.78 }}
          >
            {cardName}
          </motion.p>

          <motion.p
            className="mt-1.5 text-[10px] leading-snug"
            style={{ color: "rgba(167,139,250,0.7)" }}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.90 }}
          >
            {cardDesc}
          </motion.p>

          {/* pills */}
          <motion.div
            className="mt-2 flex flex-wrap gap-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.05 }}
          >
            {pills.map((pill, i) => (
              <motion.span
                key={pill}
                className="rounded-full px-2 py-0.5 text-[8px] font-bold"
                style={{
                  background: "rgba(167,139,250,0.12)",
                  color: "#a78bfa",
                  border: "1px solid rgba(167,139,250,0.25)",
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.05 + i * 0.1 }}
              >
                {pill}
              </motion.span>
            ))}
          </motion.div>

          {/* arrow tip pointing right */}
          <motion.div
            className="mt-2.5 flex items-center gap-1"
            style={{ color: "#a78bfa" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3 }}
          >
            <motion.div
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.0, repeat: Infinity }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6h8M7 3l3 3-3 3" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
            <span className="text-[9px] font-semibold" style={{ color: "rgba(167,139,250,0.6)" }}>Tap card to explore</span>
          </motion.div>
        </div>

        {/* Got it button below the card */}
        <motion.button
          onClick={onDone}
          className="mt-2 w-full rounded-xl py-2 text-[11px] font-bold tracking-wide text-white"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
            border: "1px solid rgba(167,139,250,0.4)",
            boxShadow: "0 4px 14px rgba(124,58,237,0.45)",
          }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.45 }}
          whileTap={{ scale: 0.96 }}
        >
          Got it →
        </motion.button>
      </motion.div>
    </>
  );
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
export default function MintBasketsExplainer({ onDone, tabRef }) {
  const [phase, setPhase]       = useState(0);   // 0=tab, 1=card
  const [tabRect, setTabRect]   = useState(null);
  const [cardRect, setCardRect] = useState(null);
  const [cardName, setCardName] = useState("Mint Famous Brands");
  const [cardDesc, setCardDesc] = useState(
    "SA's most iconic brands — Naspers, Shoprite, Capitec & more. One tap, instant diversification."
  );
  const [visible, setVisible]   = useState(true);
  const phaseTimer = useRef(null);

  // Capture tab position
  useEffect(() => {
    if (!tabRef?.current) return;
    const update = () => setTabRect(tabRef.current?.getBoundingClientRect() ?? null);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [tabRef]);

  // Auto-advance from phase 0 → 1
  useEffect(() => {
    if (phase !== 0) return;
    phaseTimer.current = setTimeout(() => setPhase(1), 2500);
    return () => clearTimeout(phaseTimer.current);
  }, [phase]);

  // Phase 1: scroll target card into view, then capture its rect
  useEffect(() => {
    if (phase !== 1) return;

    let el = document.querySelector('[data-coach-target="true"]');
    if (!el) el = document.querySelector('[data-coach-first="true"]');
    if (!el) { handleDone(); return; }

    // Read name & description from the card's data attributes
    const name = el.getAttribute("data-coach-name");
    const desc = el.getAttribute("data-coach-desc");
    if (name) setCardName(name);
    if (desc) setCardDesc(desc);

    // Scroll card into view (smooth, centred horizontally)
    el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });

    // Wait for scroll to complete then capture position
    const t = setTimeout(() => {
      const rect = el.getBoundingClientRect();
      setCardRect(rect);
    }, 900);

    return () => clearTimeout(t);
  }, [phase]);

  const handleDone = useCallback(() => {
    setVisible(false);
    setTimeout(() => onDone?.(), 350);
  }, [onDone]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      {phase === 0 && (
        <motion.div key="phase0" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <TabSpotlight rect={tabRect} />
        </motion.div>
      )}

      {phase === 1 && cardRect && (
        <motion.div key="phase1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <CardSpotlight
            cardRect={cardRect}
            cardName={cardName}
            cardDesc={cardDesc}
            onDone={handleDone}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
