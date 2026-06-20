import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const BASKETS_EXPLAINER_KEY = "mint_baskets_explainer_seen";

/* ─────────────────────────────────────────────────────────
   Blur overlay — 4 perimeter panels leave a clear window
   at `holeRect`. Light blur + very low dim only.
───────────────────────────────────────────────────────── */
function BlurOverlay({ holeRect, onClick }) {
  if (!holeRect) {
    // fallback: single light overlay if no rect yet
    return (
      <motion.div
        className="fixed inset-0 z-[998] pointer-events-auto"
        style={{ backdropFilter: "blur(6px)", background: "rgba(0,0,0,0.18)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClick}
      />
    );
  }

  const pad = 8;
  const top    = holeRect.top    - pad;
  const left   = holeRect.left   - pad;
  const right  = holeRect.right  + pad;
  const bottom = holeRect.bottom + pad;

  const panelStyle = {
    backdropFilter: "blur(7px)",
    background: "rgba(0,0,0,0.20)",
    position: "fixed",
    zIndex: 998,
    pointerEvents: "auto",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      style={{ position: "fixed", inset: 0, zIndex: 998, pointerEvents: "none" }}
      onClick={onClick}
    >
      {/* top */}
      <div style={{ ...panelStyle, top: 0, left: 0, right: 0, height: top }} onClick={onClick} />
      {/* bottom */}
      <div style={{ ...panelStyle, top: bottom, left: 0, right: 0, bottom: 0 }} onClick={onClick} />
      {/* left */}
      <div style={{ ...panelStyle, top, left: 0, width: left, height: bottom - top }} onClick={onClick} />
      {/* right */}
      <div style={{ ...panelStyle, top, left: right, right: 0, height: bottom - top }} onClick={onClick} />
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────
   Phase 0 — Tab ring spotlight
───────────────────────────────────────────────────────── */
function TabSpotlight({ rect }) {
  if (!rect) return null;
  const pad = 9;
  const holeRect = {
    top:    rect.top    - pad,
    left:   rect.left   - pad,
    right:  rect.right  + pad,
    bottom: rect.bottom + pad,
    width:  rect.width  + pad * 2,
    height: rect.height + pad * 2,
  };

  return (
    <>
      <BlurOverlay holeRect={holeRect} />

      {/* ring at tab position */}
      <motion.div
        className="pointer-events-none fixed z-[999]"
        style={{
          top:    holeRect.top,
          left:   holeRect.left,
          width:  holeRect.width,
          height: holeRect.height,
        }}
        initial={{ opacity: 0, scale: 1.3 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: "backOut" }}
      >
        {/* solid ring */}
        <div className="absolute inset-0 rounded-[16px]"
          style={{ border: "2px solid rgba(255,255,255,0.9)", boxShadow: "0 0 14px 3px rgba(255,255,255,0.25)" }} />
        {/* pulse 1 */}
        <motion.div className="absolute inset-0 rounded-[16px]"
          style={{ border: "1.5px solid rgba(255,255,255,0.6)" }}
          animate={{ opacity: [0.7, 0], scale: [1, 1.6] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
        />
        {/* pulse 2 */}
        <motion.div className="absolute inset-0 rounded-[16px]"
          style={{ border: "1px solid rgba(255,255,255,0.4)" }}
          animate={{ opacity: [0.5, 0], scale: [1, 1.9] }}
          transition={{ duration: 1.4, delay: 0.45, repeat: Infinity, ease: "easeOut" }}
        />
      </motion.div>

      {/* label + arrow below ring */}
      <motion.div
        className="pointer-events-none fixed z-[1000] flex flex-col items-center gap-1.5"
        style={{
          top:  holeRect.top + holeRect.height + 10,
          left: holeRect.left + holeRect.width / 2,
          transform: "translateX(-50%)",
        }}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ delay: 0.3 }}
      >
        <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 1.1, repeat: Infinity }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 13 L8 3 M3 8 L8 3 L13 8"
              stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.18em",
          textTransform: "uppercase", color: "rgba(255,255,255,0.85)",
        }}>
          Mint Baskets
        </span>
      </motion.div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────
   Phase 1 — Card spotlight + left-side callout
───────────────────────────────────────────────────────── */
function CardSpotlight({ cardRect, cardName, cardDesc, onDone }) {
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPressed(true), 350);
    return () => clearTimeout(t);
  }, []);

  if (!cardRect) return null;

  const pad = 10;
  const holeRect = {
    top:    cardRect.top    - pad,
    left:   cardRect.left   - pad,
    right:  cardRect.right  + pad,
    bottom: cardRect.bottom + pad,
    width:  cardRect.width  + pad * 2,
    height: cardRect.height + pad * 2,
  };

  // callout lives on the left blur panel
  // horizontally: right edge of callout = holeRect.left - 12
  // vertically: centred on card
  const calloutWidth = Math.max(120, holeRect.left - 20);
  const calloutRight = holeRect.left - 12;
  const calloutTop   = holeRect.top + (holeRect.height - 260) / 2;

  const lines = [
    { text: cardName,   delay: 0.50, size: 15, weight: 700, color: "rgba(255,255,255,0.95)", mt: 0 },
    { text: cardDesc,   delay: 0.65, size: 11, weight: 400, color: "rgba(255,255,255,0.68)", mt: 8 },
  ];
  const pills = ["JSE-listed", "Expert-built", "From R100"];

  return (
    <>
      <BlurOverlay holeRect={holeRect} onClick={onDone} />

      {/* spotlight ring around card */}
      <motion.div
        className="pointer-events-none fixed z-[999]"
        style={{ top: holeRect.top, left: holeRect.left, width: holeRect.width, height: holeRect.height }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, scale: pressed ? [1, 0.975, 1] : 1 }}
        exit={{ opacity: 0 }}
        transition={{
          opacity: { duration: 0.3 },
          scale: pressed ? { duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] } : {},
        }}
      >
        <div className="absolute inset-0 rounded-[20px]"
          style={{ border: "2px solid rgba(255,255,255,0.75)", boxShadow: "0 0 20px 4px rgba(255,255,255,0.18)" }} />
        {/* soft glow pulse */}
        <motion.div className="absolute inset-0 rounded-[20px]"
          style={{ border: "1.5px solid rgba(255,255,255,0.5)" }}
          animate={{ opacity: [0.6, 0.15, 0.6] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {/* Left-side text callout — written directly on the blur panel */}
      {calloutWidth > 40 && (
        <motion.div
          className="pointer-events-auto fixed z-[1000] flex flex-col"
          style={{
            top:   Math.max(60, calloutTop),
            right: `calc(100vw - ${calloutRight}px)`,
            width: calloutWidth,
            maxWidth: "calc(100vw - 24px)",
          }}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
        >
          {/* Basket label */}
          <motion.p
            style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 6 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.40 }}
          >
            Mint Basket
          </motion.p>

          {/* Name */}
          <motion.p
            style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.25, color: "rgba(255,255,255,0.95)", marginBottom: 8 }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.52 }}
          >
            {cardName}
          </motion.p>

          {/* Divider */}
          <motion.div
            style={{ height: 1, background: "rgba(255,255,255,0.2)", marginBottom: 8 }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.62, duration: 0.35 }}
          />

          {/* Description */}
          <motion.p
            style={{ fontSize: 11, fontWeight: 400, lineHeight: 1.5, color: "rgba(255,255,255,0.65)", marginBottom: 12 }}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.70 }}
          >
            {cardDesc}
          </motion.p>

          {/* Pills */}
          <motion.div
            className="flex flex-col gap-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.85 }}
          >
            {pills.map((pill, i) => (
              <motion.span
                key={pill}
                style={{
                  display: "inline-block",
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  color: "rgba(255,255,255,0.7)",
                  padding: "3px 8px",
                  borderRadius: 99,
                  border: "1px solid rgba(255,255,255,0.25)",
                  background: "rgba(255,255,255,0.08)",
                  alignSelf: "flex-start",
                }}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.90 + i * 0.1 }}
              >
                {pill}
              </motion.span>
            ))}
          </motion.div>

          {/* Divider */}
          <motion.div
            style={{ height: 1, background: "rgba(255,255,255,0.15)", margin: "14px 0 12px" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.15 }}
          />

          {/* Got it button — clean, minimal */}
          <motion.button
            onClick={onDone}
            style={{
              alignSelf: "flex-start",
              padding: "7px 16px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.05em",
              color: "white",
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.35)",
              cursor: "pointer",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.25 }}
            whileTap={{ scale: 0.95 }}
          >
            Got it
          </motion.button>
        </motion.div>
      )}

      {/* Fallback: if no left space, show bottom floating text */}
      {calloutWidth <= 40 && (
        <motion.div
          className="pointer-events-auto fixed z-[1000]"
          style={{
            bottom: 48,
            left: 16,
            right: 16,
            background: "rgba(255,255,255,0.12)",
            backdropFilter: "blur(12px)",
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.2)",
            padding: "16px 18px",
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Mint Basket</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 6 }}>{cardName}</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", lineHeight: 1.5, marginBottom: 12 }}>{cardDesc}</p>
          <button
            onClick={onDone}
            style={{
              padding: "7px 16px", borderRadius: 8, fontSize: 11, fontWeight: 600,
              color: "white", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.35)", cursor: "pointer",
            }}
          >Got it</button>
        </motion.div>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────── */
export default function MintBasketsExplainer({ onDone, tabRef }) {
  const [phase, setPhase]       = useState(0);
  const [tabRect, setTabRect]   = useState(null);
  const [cardRect, setCardRect] = useState(null);
  const [cardName, setCardName] = useState("Mint Famous Brands");
  const [cardDesc, setCardDesc] = useState("SA's most iconic brands — Naspers, Shoprite, Capitec & more. One tap, instant diversification.");
  const [visible, setVisible]   = useState(true);
  const phaseTimer = useRef(null);

  // Capture tab rect
  useEffect(() => {
    if (!tabRef?.current) return;
    const update = () => setTabRect(tabRef.current?.getBoundingClientRect() ?? null);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [tabRef]);

  // Phase 0 → 1 after 2.5s
  useEffect(() => {
    if (phase !== 0) return;
    phaseTimer.current = setTimeout(() => setPhase(1), 2500);
    return () => clearTimeout(phaseTimer.current);
  }, [phase]);

  // Phase 1: find card, scroll it to show left panel space, capture rect
  useEffect(() => {
    if (phase !== 1) return;

    let el = document.querySelector('[data-coach-target="true"]');
    if (!el) el = document.querySelector('[data-coach-first="true"]');
    if (!el) { handleDone(); return; }

    const name = el.getAttribute("data-coach-name");
    const desc = el.getAttribute("data-coach-desc");
    if (name) setCardName(name);
    if (desc) setCardDesc(desc);

    // Scroll the card to appear on the RIGHT side of screen,
    // leaving space on the left for the text callout.
    const scrollContainer = el.closest(".overflow-x-auto");
    if (scrollContainer) {
      const cardOffsetLeft = el.offsetLeft;
      // target: card left edge ≈ 42% from screen left
      const targetScrollLeft = cardOffsetLeft - Math.floor(window.innerWidth * 0.42);
      scrollContainer.scrollTo({ left: Math.max(0, targetScrollLeft), behavior: "smooth" });
    } else {
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }

    const t = setTimeout(() => {
      const rect = el.getBoundingClientRect();
      setCardRect(rect);
    }, 950);

    return () => clearTimeout(t);
  }, [phase]);

  const handleDone = useCallback(() => {
    setVisible(false);
    setTimeout(() => onDone?.(), 320);
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
