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
   Word-by-word reveal animation
───────────────────────────────────────────────────────── */
function WordReveal({ text, baseDelay = 0, wordStyle }) {
  return (
    <>
      {text.split(" ").map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 9 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: baseDelay + i * 0.048, duration: 0.26, ease: "easeOut" }}
          style={{ display: "inline-block", marginRight: "0.26em", ...wordStyle }}
        >
          {word}
        </motion.span>
      ))}
    </>
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
  // Only use the left callout when the card genuinely starts far enough from the
  // left edge (>120 px). On mobile the card is nearly full-width so cardHole.left
  // is tiny — the Math.max(80,…) floor made hasLeftSpace always true even though
  // the callout was rendered off-screen. Fall through to the bottom panel instead.
  const hasLeftSpace  = cardHole.left > 120;

  const desc =
    "Top JSE companies — built for long-term growth.";
  const explanation =
    "MINT Baskets are ready-made, actively managed portfolios. " +
    "Instant diversification — no stock-picking needed.";
  // Ensure "Mint" → "MINT" in the card name
  const displayName = cardName.replace(/\bMint\b/g, "MINT");

  // Use the card's actual border radius for the ring
  const ringRadius = Math.max(16, (cardRadius ?? 20) + cpad * 0.6);

  // Shared glass panel style
  const glassBg = {
    background: "rgba(10,10,22,0.80)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: "1px solid rgba(255,255,255,0.13)",
  };

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

      {/* Left callout — desktop / wide screens */}
      {hasLeftSpace && (
        <motion.div
          className="pointer-events-auto fixed z-[1002]"
          style={{
            top: calloutTop,
            right: `calc(100vw - ${calloutRight}px)`,
            width: calloutWidth,
            display: "flex",
            flexDirection: "column",
            ...glassBg,
            borderRadius: 18,
            padding: "16px 18px 14px",
          }}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.18, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Name */}
          <motion.p
            style={{ fontSize: 20, fontWeight: 900, lineHeight: 1.1,
              letterSpacing: "-0.02em", color: "#fff", marginBottom: 7 }}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.32, ease: "easeOut" }}
          >
            {displayName}
          </motion.p>

          {/* Divider */}
          <motion.div
            style={{ height: 1, background: "rgba(255,255,255,0.22)", marginBottom: 10, originX: 0 }}
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
            transition={{ delay: 0.44, duration: 0.28 }}
          />

          {/* Short desc */}
          <motion.p
            style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em",
              lineHeight: 1.4, color: "rgba(255,255,255,0.95)", marginBottom: 8 }}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.52, duration: 0.28, ease: "easeOut" }}
          >
            {desc}
          </motion.p>

          {/* Explanation — word reveal */}
          <p style={{ fontSize: 11.5, fontWeight: 400, lineHeight: 1.65,
            color: "rgba(255,255,255,0.68)", marginBottom: 14 }}>
            <WordReveal text={explanation} baseDelay={0.64} />
          </p>

          {/* Got it */}
          <motion.button
            onClick={onDone}
            style={{
              alignSelf: "flex-start", padding: "7px 18px", borderRadius: 9,
              fontSize: 12, fontWeight: 600, letterSpacing: "0.04em",
              color: "#fff", background: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.36)", cursor: "pointer",
              whiteSpace: "nowrap",
            }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.92, duration: 0.24 }}
            whileTap={{ scale: 0.93 }}
          >
            Got it
          </motion.button>
        </motion.div>
      )}

      {/* Middle panel — mobile: sits in the gap between the tab and the card */}
      {!hasLeftSpace && (
        <motion.div
          className="pointer-events-auto fixed z-[1002]"
          style={{
            top:   (tabHole ? tabHole.bottom : 80) + 8,
            left:  16,
            right: 16,
            ...glassBg,
            borderRadius: 18,
            padding: "14px 18px 14px",
          }}
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.28, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.p
            style={{ fontSize: 19, fontWeight: 900, lineHeight: 1.1,
              letterSpacing: "-0.02em", color: "#fff", marginBottom: 7 }}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34, duration: 0.30, ease: "easeOut" }}
          >
            {displayName}
          </motion.p>

          <motion.div
            style={{ height: 1, background: "rgba(255,255,255,0.22)", marginBottom: 9, originX: 0 }}
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
            transition={{ delay: 0.46, duration: 0.28 }}
          />

          <motion.p
            style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em",
              lineHeight: 1.4, color: "rgba(255,255,255,0.95)", marginBottom: 8 }}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.54, duration: 0.28, ease: "easeOut" }}
          >
            {desc}
          </motion.p>

          <p style={{ fontSize: 11.5, fontWeight: 400, lineHeight: 1.65,
            color: "rgba(255,255,255,0.68)", marginBottom: 14 }}>
            <WordReveal text={explanation} baseDelay={0.66} />
          </p>

          <motion.button
            onClick={onDone}
            style={{
              padding: "7px 20px", borderRadius: 9, fontSize: 12, fontWeight: 600,
              letterSpacing: "0.04em", color: "#fff",
              background: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.36)", cursor: "pointer",
            }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.90, duration: 0.24 }}
            whileTap={{ scale: 0.93 }}
          >
            Got it
          </motion.button>
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
    "A high growth equity strategy targeting leading JSE companies with strong long term upside."
  );
  const [visible, setVisible]         = useState(true);
  const [panelExiting, setPanelExiting] = useState(false);
  const phaseTimer    = useRef(null);
  const cardSectionRef = useRef(null); // element we translateY to make room

  // ── Lock scroll + hide bottom nav for the duration of the explainer ──────
  useEffect(() => {
    // Slide bottom nav offscreen
    const style = document.createElement('style');
    style.id = '__mint_coach_style__';
    style.textContent = `
      body > nav {
        transform: translateY(110%) !important;
        transition: transform 0.35s cubic-bezier(0.4,0,1,1) !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);

    // Lock scrolling everywhere
    const prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const appContent = document.querySelector('.app-content');
    const prevContentOverflow = appContent ? appContent.style.overflow : '';
    const savedScrollTop = appContent ? appContent.scrollTop : 0;
    if (appContent) appContent.style.overflow = 'hidden';

    return () => {
      document.getElementById('__mint_coach_style__')?.remove();
      document.body.style.overflow = prevBodyOverflow;
      if (appContent) {
        appContent.style.overflow = prevContentOverflow;
        appContent.scrollTop = savedScrollTop;
      }
    };
  }, []);

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

    // Horizontal scroll: bring card into view
    const scrollContainer = el.closest(".overflow-x-auto");
    if (scrollContainer) {
      const targetLeft = el.offsetLeft - Math.floor(window.innerWidth * 0.42);
      scrollContainer.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
    } else {
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }

    // Push the card section DOWN with CSS transform so the text panel has room
    // above it. scrollTop can't go negative (card is near top of page), so we
    // move the container element instead. We push by enough to hit ~68 % vh.
    const section = (scrollContainer?.parentElement) ?? null;
    if (section) {
      const currentTop = el.getBoundingClientRect().top;
      const targetTop  = Math.floor(window.innerHeight * 0.58);
      const pushPx     = Math.max(0, targetTop - currentTop);
      section.style.transition = 'transform 0.55s cubic-bezier(0.4,0,0.2,1)';
      section.style.transform  = `translateY(${pushPx}px)`;
      cardSectionRef.current   = section;
    }

    const t = setTimeout(() => setCardRect(el.getBoundingClientRect()), 950);
    return () => { clearTimeout(t); };
  }, [phase]);

  const handleDone = useCallback(() => {
    // 1. Instantly fade the entire overlay (dim + text + rings) before moving anything
    setPanelExiting(true);
    // 2. Restore scroll + slide nav back in simultaneously
    document.getElementById('__mint_coach_style__')?.remove();
    document.body.style.overflow = '';
    const appContent = document.querySelector('.app-content');
    if (appContent) appContent.style.overflow = '';
    // 3. After overlay has faded (~180 ms), THEN slide the card back up
    //    — card is invisible behind the faded overlay, so there is no overlap
    setTimeout(() => {
      if (cardSectionRef.current) {
        cardSectionRef.current.style.transition = 'transform 0.45s cubic-bezier(0.4,0,0.2,1)';
        cardSectionRef.current.style.transform  = '';
        cardSectionRef.current = null;
      }
    }, 180);
    // 4. Unmount after card has settled
    setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDone?.(), 200);
    }, 640);
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
        <motion.div
          key="phase1"
          initial={{ opacity: 0 }}
          animate={{ opacity: panelExiting ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: panelExiting ? 0.16 : 0.3 }}
        >
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
