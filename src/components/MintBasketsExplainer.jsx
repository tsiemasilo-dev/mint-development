import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const BASKETS_EXPLAINER_KEY = "mint_baskets_explainer_seen";

const PANEL = {
  backdropFilter: "blur(7px)",
  background: "rgba(0,0,0,0.20)",
  position: "fixed",
  zIndex: 998,
  pointerEvents: "auto",
};

/* ─────────────────────────────────────────────────────────
   Single-hole 4-panel overlay (Phase 0 — tab only)
───────────────────────────────────────────────────────── */
function SingleHoleOverlay({ hole, onClick }) {
  if (!hole) return (
    <motion.div
      className="fixed inset-0 pointer-events-auto"
      style={{ ...PANEL, zIndex: 998 }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClick}
    />
  );

  const { top: t, left: l, right: r, bottom: b } = hole;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{ position: "fixed", inset: 0, zIndex: 998, pointerEvents: "none" }}
    >
      <div style={{ ...PANEL, top: 0, left: 0, right: 0, height: t }} onClick={onClick} />
      <div style={{ ...PANEL, top: b, left: 0, right: 0, bottom: 0 }} onClick={onClick} />
      <div style={{ ...PANEL, top: t, left: 0, width: l, height: b - t }} onClick={onClick} />
      <div style={{ ...PANEL, top: t, left: r, right: 0, height: b - t }} onClick={onClick} />
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────
   Dual-hole overlay (Phase 1 — tab + card both clear)
   7 panels: top / tab-left / tab-right / middle / card-left / card-right / bottom
───────────────────────────────────────────────────────── */
function DualHoleOverlay({ tabHole, cardHole, onClick }) {
  if (!tabHole || !cardHole) return (
    <motion.div
      className="fixed inset-0 pointer-events-auto"
      style={{ ...PANEL, zIndex: 998 }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClick}
    />
  );

  const { top: tt, left: tl, right: tr, bottom: tb } = tabHole;
  const { top: ct, left: cl, right: cr, bottom: cb } = cardHole;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{ position: "fixed", inset: 0, zIndex: 998, pointerEvents: "none" }}
    >
      {/* above tab */}
      <div style={{ ...PANEL, top: 0, left: 0, right: 0, height: tt }} onClick={onClick} />
      {/* tab row — left of tab */}
      <div style={{ ...PANEL, top: tt, left: 0, width: tl, height: tb - tt }} onClick={onClick} />
      {/* tab row — right of tab */}
      <div style={{ ...PANEL, top: tt, left: tr, right: 0, height: tb - tt }} onClick={onClick} />
      {/* between tab and card */}
      <div style={{ ...PANEL, top: tb, left: 0, right: 0, height: Math.max(0, ct - tb) }} onClick={onClick} />
      {/* card row — left of card */}
      <div style={{ ...PANEL, top: ct, left: 0, width: cl, height: cb - ct }} onClick={onClick} />
      {/* card row — right of card */}
      <div style={{ ...PANEL, top: ct, left: cr, right: 0, height: cb - ct }} onClick={onClick} />
      {/* below card */}
      <div style={{ ...PANEL, top: cb, left: 0, right: 0, bottom: 0 }} onClick={onClick} />
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────
   Reusable pulsing ring
───────────────────────────────────────────────────────── */
function AnimatedRing({ rect, pad = 9, borderRadius = 16, zIndex = 999, pulse = true }) {
  if (!rect) return null;
  const style = {
    top:    rect.top    - pad,
    left:   rect.left   - pad,
    width:  rect.width  + pad * 2,
    height: rect.height + pad * 2,
  };

  return (
    <div className="pointer-events-none fixed" style={{ ...style, zIndex }}>
      <div className="absolute inset-0"
        style={{ borderRadius, border: "2px solid rgba(255,255,255,0.90)",
          boxShadow: "0 0 16px 4px rgba(255,255,255,0.22)" }} />
      {pulse && (
        <>
          <motion.div className="absolute inset-0"
            style={{ borderRadius, border: "1.5px solid rgba(255,255,255,0.60)" }}
            animate={{ opacity: [0.7, 0], scale: [1, 1.55] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.div className="absolute inset-0"
            style={{ borderRadius, border: "1px solid rgba(255,255,255,0.40)" }}
            animate={{ opacity: [0.5, 0], scale: [1, 1.85] }}
            transition={{ duration: 1.4, delay: 0.45, repeat: Infinity, ease: "easeOut" }}
          />
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Phase 0 — Tab coach mark
───────────────────────────────────────────────────────── */
function TabSpotlight({ rect }) {
  if (!rect) return null;
  const pad = 9;
  const hole = {
    top:    rect.top    - pad,
    left:   rect.left   - pad,
    right:  rect.right  + pad,
    bottom: rect.bottom + pad,
    width:  rect.width  + pad * 2,
    height: rect.height + pad * 2,
  };

  return (
    <>
      <SingleHoleOverlay hole={hole} />
      <AnimatedRing rect={rect} pad={pad} borderRadius={16} zIndex={999} />
      <motion.div
        className="pointer-events-none fixed z-[1000] flex flex-col items-center gap-1.5"
        style={{
          top:  hole.top + hole.height + 12,
          left: hole.left + hole.width / 2,
          transform: "translateX(-50%)",
        }}
        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
        transition={{ delay: 0.3 }}
      >
        <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 1.1, repeat: Infinity }}>
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <path d="M8 13L8 3M3 8L8 3L13 8" stroke="white" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.18em",
          textTransform: "uppercase", color: "rgba(255,255,255,0.92)" }}>
          Mint Baskets
        </span>
      </motion.div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────
   Phase 1 — Dual spotlight + left text callout
───────────────────────────────────────────────────────── */
function CardSpotlight({ cardRect, cardRadius, tabRect, cardName, cardDesc, onDone }) {
  const [pressed, setPressed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setPressed(true), 350);
    return () => clearTimeout(t);
  }, []);

  if (!cardRect) return null;

  const cpad = 12;
  const tpad = 9;

  const cardHole = {
    top:    cardRect.top    - cpad,
    left:   cardRect.left   - cpad,
    right:  cardRect.right  + cpad,
    bottom: cardRect.bottom + cpad,
    width:  cardRect.width  + cpad * 2,
    height: cardRect.height + cpad * 2,
  };
  const tabHole = tabRect ? {
    top:    tabRect.top    - tpad,
    left:   tabRect.left   - tpad,
    right:  tabRect.right  + tpad,
    bottom: tabRect.bottom + tpad,
    width:  tabRect.width  + tpad * 2,
    height: tabRect.height + tpad * 2,
  } : null;

  // Callout on the left blur panel
  const calloutWidth  = Math.max(80, cardHole.left - 18);
  const calloutRight  = cardHole.left - 14;
  const calloutCentreY = cardHole.top + cardHole.height / 2;
  const calloutTop    = Math.max(80, calloutCentreY - 190);
  const hasLeftSpace  = calloutWidth >= 80;

  const explanation =
    "Mint Baskets are ready-made investment portfolios curated and actively managed by the Mint platform. " +
    "Each basket gives you instant diversification across top JSE-listed companies — with no stock-picking needed.";

  // Use the card's actual border radius for the ring
  const ringRadius = Math.max(16, (cardRadius ?? 20) + cpad * 0.6);

  return (
    <>
      <DualHoleOverlay tabHole={tabHole} cardHole={cardHole} onClick={onDone} />

      {/* Tab ring stays alive */}
      <AnimatedRing rect={tabRect} pad={tpad} borderRadius={16} zIndex={1001} pulse={true} />

      {/* Card ring — matches card shape */}
      <motion.div
        className="pointer-events-none fixed z-[999]"
        style={{ top: cardHole.top, left: cardHole.left, width: cardHole.width, height: cardHole.height }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, scale: pressed ? [1, 0.975, 1] : 1 }}
        exit={{ opacity: 0 }}
        transition={{ opacity: { duration: 0.3 }, scale: pressed ? { duration: 0.38 } : {} }}
      >
        <div className="absolute inset-0"
          style={{ borderRadius: ringRadius,
            border: "2px solid rgba(255,255,255,0.85)",
            boxShadow: "0 0 24px 6px rgba(255,255,255,0.16)" }}
        />
        <motion.div className="absolute inset-0"
          style={{ borderRadius: ringRadius, border: "1.5px solid rgba(255,255,255,0.50)" }}
          animate={{ opacity: [0.6, 0.15, 0.6] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {/* Left callout — text written on blur panel, no box */}
      {hasLeftSpace && (
        <motion.div
          className="pointer-events-auto fixed z-[1002] flex flex-col"
          style={{ top: calloutTop, right: `calc(100vw - ${calloutRight}px)`, width: calloutWidth }}
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
        >
          {/* Label */}
          <motion.p
            style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.20em",
              textTransform: "uppercase", color: "rgba(255,255,255,0.60)", marginBottom: 8 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.38 }}
          >
            Mint Basket
          </motion.p>

          {/* Basket name */}
          <motion.p
            style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2,
              color: "rgba(255,255,255,1.0)", marginBottom: 10 }}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.50 }}
          >
            {cardName}
          </motion.p>

          {/* Divider */}
          <motion.div
            style={{ height: 1, background: "rgba(255,255,255,0.30)", marginBottom: 12 }}
            initial={{ scaleX: 0, originX: 0 }} animate={{ scaleX: 1 }}
            transition={{ delay: 0.60, duration: 0.32 }}
          />

          {/* Strategy description */}
          <motion.p
            style={{ fontSize: 14, fontWeight: 400, lineHeight: 1.6,
              color: "rgba(255,255,255,0.90)", marginBottom: 14 }}
            initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.68 }}
          >
            {cardDesc}
          </motion.p>

          {/* Explanation */}
          <motion.p
            style={{ fontSize: 13, fontWeight: 400, lineHeight: 1.65,
              color: "rgba(255,255,255,0.78)", marginBottom: 20 }}
            initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.84 }}
          >
            {explanation}
          </motion.p>

          {/* Divider */}
          <motion.div
            style={{ height: 1, background: "rgba(255,255,255,0.20)", marginBottom: 14 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.02 }}
          />

          {/* Got it */}
          <motion.button
            onClick={onDone}
            style={{
              alignSelf: "flex-start",
              padding: "9px 22px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.04em",
              color: "rgba(255,255,255,0.97)",
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.45)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.12 }}
            whileTap={{ scale: 0.95 }}
          >
            Got it
          </motion.button>
        </motion.div>
      )}

      {/* Bottom fallback when no left space */}
      {!hasLeftSpace && (
        <motion.div
          className="pointer-events-auto fixed z-[1002]"
          style={{
            bottom: 52, left: 16, right: 16,
            background: "rgba(18,18,28,0.60)",
            backdropFilter: "blur(16px)",
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.18)",
            padding: "22px 22px 18px",
          }}
          initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }} transition={{ delay: 0.3, duration: 0.4 }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.20em",
            textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: 6 }}>
            Mint Basket
          </p>
          <p style={{ fontSize: 22, fontWeight: 800, color: "white",
            marginBottom: 10, lineHeight: 1.2 }}>{cardName}</p>
          <div style={{ height: 1, background: "rgba(255,255,255,0.25)", marginBottom: 10 }} />
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.90)",
            lineHeight: 1.6, marginBottom: 12 }}>{cardDesc}</p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)",
            lineHeight: 1.65, marginBottom: 18 }}>{explanation}</p>
          <button
            onClick={onDone}
            style={{
              padding: "9px 22px", borderRadius: 10, fontSize: 13, fontWeight: 600,
              color: "white", background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.45)", cursor: "pointer",
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
  const [phase, setPhase]         = useState(0);
  const [tabRect, setTabRect]     = useState(null);
  const [cardRect, setCardRect]   = useState(null);
  const [cardRadius, setCardRadius] = useState(20);
  const [cardName, setCardName]   = useState("Mint Famous Brands");
  const [cardDesc, setCardDesc]   = useState(
    "A curated mix of SA's most recognised brands — Naspers, Shoprite, Capitec & more."
  );
  const [visible, setVisible] = useState(true);
  const phaseTimer = useRef(null);

  // Track tab rect (updates on resize)
  useEffect(() => {
    if (!tabRef?.current) return;
    const update = () => setTabRect(tabRef.current?.getBoundingClientRect() ?? null);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [tabRef]);

  // Phase 0 → 1 after 2.5 s
  useEffect(() => {
    if (phase !== 0) return;
    phaseTimer.current = setTimeout(() => setPhase(1), 2500);
    return () => clearTimeout(phaseTimer.current);
  }, [phase]);

  // Phase 1: find card, scroll it to right, capture rect + border radius
  useEffect(() => {
    if (phase !== 1) return;

    let el = document.querySelector('[data-coach-target="true"]');
    if (!el) el = document.querySelector('[data-coach-first="true"]');
    if (!el) { handleDone(); return; }

    const name = el.getAttribute("data-coach-name");
    const desc = el.getAttribute("data-coach-desc");
    if (name) setCardName(name);
    if (desc) setCardDesc(desc);

    // Read the card's actual border radius
    const computed = window.getComputedStyle(el);
    const rawRadius = parseFloat(computed.borderRadius || computed.borderTopLeftRadius || "20");
    setCardRadius(isNaN(rawRadius) ? 20 : rawRadius);

    // Scroll card to land at ~42% from left, giving left panel space for text
    const scrollContainer = el.closest(".overflow-x-auto");
    if (scrollContainer) {
      const targetLeft = el.offsetLeft - Math.floor(window.innerWidth * 0.42);
      scrollContainer.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
    } else {
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }

    const t = setTimeout(() => setCardRect(el.getBoundingClientRect()), 950);
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
            cardRadius={cardRadius}
            tabRect={tabRect}
            cardName={cardName}
            cardDesc={cardDesc}
            onDone={handleDone}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
