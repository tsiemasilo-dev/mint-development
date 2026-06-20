# INVEST Animation — Mint Baskets Coach Mark

## Overview

A two-phase coach-mark animation that plays every time the user opens the Mint Baskets tab on the Markets page. It teaches the user what Mint Baskets are through progressive disclosure — first highlighting the tab itself, then spotlighting a real strategy card while keeping the tab ring active and showing clean white explanatory text on the left blur panel.

---

## Behaviour Summary

| Phase | Duration | What happens |
|---|---|---|
| **0 — Tab ring** | 2.5 s (auto) | Blur overlay, pulsing white ring on Mint Baskets tab, bouncing arrow + label below it |
| **1 — Card spotlight** | Until dismissed | Card scrolls to ~42% from left, blur panels surround it, tab ring stays alive, left panel shows white text callout + "Got it" button |

---

## Overlay Technique — 4-Panel Blur

Instead of a single fullscreen overlay (which breaks `backdrop-filter` + cutout combinations), the overlay is **4 separate `position:fixed` panels** surrounding the spotlight target:

```
┌─────────────────────────────────┐
│           TOP PANEL             │  backdrop-filter: blur(7px)
│                                 │  background: rgba(0,0,0,0.20)
├────────┬────────────────┬────────┤
│  LEFT  │  CLEAR WINDOW  │ RIGHT │
│ PANEL  │  (target rect) │ PANEL │
├────────┴────────────────┴────────┤
│          BOTTOM PANEL           │
└─────────────────────────────────┘
```

The clear window is the tab button (phase 0) or the strategy card (phase 1) — fully unblurred, unobscured.

---

## Callout Text Style

Written directly on the left blur panel — no dark box, no purple glass card. Pure white typography:

| Element | Size | Weight | Color |
|---|---|---|---|
| Section label ("MINT BASKET") | 10px | 700 | `rgba(255,255,255,0.55)` |
| Basket name | 18px | 800 | `rgba(255,255,255,0.97)` |
| Divider | 1px | — | `rgba(255,255,255,0.25)` |
| Strategy description | 13px | 400 | `rgba(255,255,255,0.82)` |
| Mint explanation paragraph | 12px | 400 | `rgba(255,255,255,0.70)` |
| "Got it" button | 12px | 600 | white border + `rgba(255,255,255,0.14)` bg |

Explanation copy: *"Mint Baskets are ready-made investment portfolios curated and actively managed by the Mint platform. Each basket gives you instant diversification across top JSE-listed companies — with no stock-picking needed."*

---

## MarketsPage.jsx wiring

Three changes made to `src/pages/MarketsPage.jsx`:

```jsx
// 1. Ref for the tab button
const basketsTabRef = useRef(null);

// 2. Show explainer whenever Mint Baskets tab is active
useEffect(() => {
  if (viewMode === "openstrategies" && !childFilter) {
    setShowBasketsExplainer(true);
  } else {
    setShowBasketsExplainer(false);
  }
}, [viewMode, childFilter]);

// 3. On the Mint Baskets <button>
ref={basketsTabRef}

// 4. On every strategy card <button>
data-coach-target={displayName?.toLowerCase().includes('famous') ? 'true' : undefined}
data-coach-first={filteredStrategies[0]?.id === strategy.id ? 'true' : undefined}
data-coach-name={displayName}
data-coach-desc={truncatedDescription || ''}

// 5. Render
{showBasketsExplainer && (
  <MintBasketsExplainer
    onDone={() => setShowBasketsExplainer(false)}
    tabRef={basketsTabRef}
  />
)}
```

---

## Full Component Code — `src/components/MintBasketsExplainer.jsx`

```jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const BASKETS_EXPLAINER_KEY = "mint_baskets_explainer_seen";

/* ─────────────────────────────────────────────────────────
   4-panel blur overlay — leaves a clear window at holeRect
───────────────────────────────────────────────────────── */
function BlurOverlay({ holeRect, onClick }) {
  if (!holeRect) {
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

  const panel = {
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
    >
      <div style={{ ...panel, top: 0, left: 0, right: 0, height: top }} onClick={onClick} />
      <div style={{ ...panel, top: bottom, left: 0, right: 0, bottom: 0 }} onClick={onClick} />
      <div style={{ ...panel, top, left: 0, width: left, height: bottom - top }} onClick={onClick} />
      <div style={{ ...panel, top, left: right, right: 0, height: bottom - top }} onClick={onClick} />
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────
   Reusable animated ring
───────────────────────────────────────────────────────── */
function AnimatedRing({ rect, pad = 9, borderRadius = 16, zIndex = 999, showPulse = true }) {
  if (!rect) return null;
  const top  = rect.top    - pad;
  const left = rect.left   - pad;
  const w    = rect.width  + pad * 2;
  const h    = rect.height + pad * 2;

  return (
    <div className="pointer-events-none fixed" style={{ top, left, width: w, height: h, zIndex }}>
      <div className="absolute inset-0"
        style={{
          borderRadius,
          border: "2px solid rgba(255,255,255,0.9)",
          boxShadow: "0 0 14px 3px rgba(255,255,255,0.22)",
        }}
      />
      {showPulse && (
        <>
          <motion.div className="absolute inset-0"
            style={{ borderRadius, border: "1.5px solid rgba(255,255,255,0.6)" }}
            animate={{ opacity: [0.7, 0], scale: [1, 1.55] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.div className="absolute inset-0"
            style={{ borderRadius, border: "1px solid rgba(255,255,255,0.4)" }}
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
      <AnimatedRing rect={rect} pad={pad} zIndex={999} />

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
            <path d="M8 13L8 3M3 8L8 3L13 8"
              stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em",
          textTransform: "uppercase", color: "rgba(255,255,255,0.9)" }}>
          Mint Baskets
        </span>
      </motion.div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────
   Phase 1 — Card spotlight + left callout + tab ring stays
───────────────────────────────────────────────────────── */
function CardSpotlight({ cardRect, tabRect, cardName, cardDesc, onDone }) {
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

  const calloutWidth  = Math.max(100, holeRect.left - 20);
  const calloutRight  = holeRect.left - 12;
  const calloutCentreY = holeRect.top + holeRect.height / 2;
  const calloutTop = Math.max(70, calloutCentreY - 160);
  const hasLeftSpace = calloutWidth >= 80;

  const explanation =
    "Mint Baskets are ready-made investment portfolios curated and actively managed by the Mint platform. " +
    "Each basket gives you instant diversification across top JSE-listed companies — with no stock-picking needed.";

  return (
    <>
      <BlurOverlay holeRect={holeRect} onClick={onDone} />

      {/* card ring + press animation */}
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
          style={{ border: "2px solid rgba(255,255,255,0.8)",
            boxShadow: "0 0 20px 5px rgba(255,255,255,0.18)" }} />
        <motion.div className="absolute inset-0 rounded-[20px]"
          style={{ border: "1.5px solid rgba(255,255,255,0.5)" }}
          animate={{ opacity: [0.6, 0.15, 0.6] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {/* Tab ring stays alive */}
      <AnimatedRing rect={tabRect} pad={9} borderRadius={16} zIndex={1000} showPulse={true} />

      {/* Left callout */}
      {hasLeftSpace && (
        <motion.div
          className="pointer-events-auto fixed z-[1001] flex flex-col"
          style={{ top: calloutTop, right: `calc(100vw - ${calloutRight}px)`, width: calloutWidth }}
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
        >
          <motion.p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em",
            textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: 8 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.38 }}>
            Mint Basket
          </motion.p>

          <motion.p style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2,
            color: "rgba(255,255,255,0.97)", marginBottom: 10 }}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.50 }}>
            {cardName}
          </motion.p>

          <motion.div style={{ height: 1, background: "rgba(255,255,255,0.25)", marginBottom: 10 }}
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.60, duration: 0.32 }} />

          <motion.p style={{ fontSize: 13, fontWeight: 400, lineHeight: 1.55,
            color: "rgba(255,255,255,0.82)", marginBottom: 12 }}
            initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.68 }}>
            {cardDesc}
          </motion.p>

          <motion.p style={{ fontSize: 12, fontWeight: 400, lineHeight: 1.6,
            color: "rgba(255,255,255,0.70)", marginBottom: 16 }}
            initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.82 }}>
            {explanation}
          </motion.p>

          <motion.div style={{ height: 1, background: "rgba(255,255,255,0.18)", marginBottom: 14 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }} />

          <motion.button onClick={onDone}
            style={{ alignSelf: "flex-start", padding: "8px 20px", borderRadius: 8,
              fontSize: 12, fontWeight: 600, letterSpacing: "0.04em",
              color: "rgba(255,255,255,0.95)", background: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.40)", cursor: "pointer", whiteSpace: "nowrap" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.10 }}
            whileTap={{ scale: 0.95 }}>
            Got it
          </motion.button>
        </motion.div>
      )}

      {/* Bottom fallback */}
      {!hasLeftSpace && (
        <motion.div
          className="pointer-events-auto fixed z-[1001]"
          style={{ bottom: 52, left: 16, right: 16,
            background: "rgba(20,20,30,0.55)", backdropFilter: "blur(14px)",
            borderRadius: 18, border: "1px solid rgba(255,255,255,0.18)", padding: "20px 20px 16px" }}
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em",
            textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>Mint Basket</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: "rgba(255,255,255,0.97)",
            marginBottom: 10, lineHeight: 1.2 }}>{cardName}</p>
          <div style={{ height: 1, background: "rgba(255,255,255,0.2)", marginBottom: 10 }} />
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.82)",
            lineHeight: 1.55, marginBottom: 10 }}>{cardDesc}</p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.68)",
            lineHeight: 1.6, marginBottom: 16 }}>{explanation}</p>
          <button onClick={onDone}
            style={{ padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              color: "rgba(255,255,255,0.95)", background: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.40)", cursor: "pointer" }}>
            Got it
          </button>
        </motion.div>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────
   Main export
───────────────────────────────────────────────────────── */
export default function MintBasketsExplainer({ onDone, tabRef }) {
  const [phase, setPhase]       = useState(0);
  const [tabRect, setTabRect]   = useState(null);
  const [cardRect, setCardRect] = useState(null);
  const [cardName, setCardName] = useState("Mint Famous Brands");
  const [cardDesc, setCardDesc] = useState(
    "A curated mix of SA's most recognised brands — Naspers, Shoprite, Capitec & more."
  );
  const [visible, setVisible] = useState(true);
  const phaseTimer = useRef(null);

  useEffect(() => {
    if (!tabRef?.current) return;
    const update = () => setTabRect(tabRef.current?.getBoundingClientRect() ?? null);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [tabRef]);

  useEffect(() => {
    if (phase !== 0) return;
    phaseTimer.current = setTimeout(() => setPhase(1), 2500);
    return () => clearTimeout(phaseTimer.current);
  }, [phase]);

  useEffect(() => {
    if (phase !== 1) return;
    let el = document.querySelector('[data-coach-target="true"]');
    if (!el) el = document.querySelector('[data-coach-first="true"]');
    if (!el) { handleDone(); return; }

    const name = el.getAttribute("data-coach-name");
    const desc = el.getAttribute("data-coach-desc");
    if (name) setCardName(name);
    if (desc) setCardDesc(desc);

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
```

---

## Dismissal

- Phase 0 auto-advances after **2 500 ms** — no tap needed.
- Phase 1: tap **"Got it"** or the blurred overlay area to dismiss.
- Navigating away from the Mint Baskets tab resets the animation so it replays on return.
- No `localStorage` gate — intentionally plays every visit.
