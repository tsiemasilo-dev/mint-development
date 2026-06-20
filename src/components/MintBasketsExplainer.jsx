import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import PaymentSuccessPage from "../pages/PaymentSuccessPage.jsx";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export const BASKETS_EXPLAINER_KEY = "mint_baskets_explainer_seen";

const PANEL = {
  backdropFilter: "blur(7px)",
  background: "rgba(0,0,0,0.20)",
  position: "fixed",
  zIndex: 10000,
  pointerEvents: "auto",
};

/* ─────────────────────────────────────────────────────────
   Single-hole 4-panel overlay (Phase 0 — tab only)
───────────────────────────────────────────────────────── */
function SingleHoleOverlay({ hole, onClick }) {
  if (!hole) return (
    <motion.div
      className="fixed inset-0 pointer-events-auto"
      style={{ ...PANEL, zIndex: 10000 }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClick}
    />
  );

  const { top: t, left: l, right: r, bottom: b } = hole;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{ position: "fixed", inset: 0, zIndex: 10000, pointerEvents: "none" }}
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
      style={{ ...PANEL, zIndex: 10000 }}
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
      style={{ position: "fixed", inset: 0, zIndex: 10000, pointerEvents: "none" }}
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
function AnimatedRing({ rect, pad = 9, borderRadius = 16, zIndex = 10001, pulse = true }) {
  if (!rect) return null;
  const style = {
    top:    rect.top    - pad,
    left:   rect.left   - pad,
    width:  rect.width  + pad * 2,
    height: rect.height + pad * 2,
  };

  return (
    <div className="pointer-events-none fixed" style={{ ...style, zIndex }}>
      {/* Solid ring — dark outline makes it pop on both light and dark backgrounds */}
      <div className="absolute inset-0"
        style={{
          borderRadius,
          border: "2px solid rgba(255,255,255,0.90)",
          boxShadow: [
            "0 0 0 1.5px rgba(0,0,0,0.28)",      // dark outline → visible on white
            "0 0 16px 4px rgba(255,255,255,0.22)", // white glow → visible on dark
          ].join(", "),
        }}
      />
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
   Phase 4 — Purchase Successful card spotlight
───────────────────────────────────────────────────────── */
function SuccessCardSpotlight({ cardRect, onNext }) {
  if (!cardRect) return null;

  const pad = 16;
  const hole = {
    top:    cardRect.top    - pad,
    left:   cardRect.left   - pad,
    right:  cardRect.right  + pad,
    bottom: cardRect.bottom + pad,
    width:  cardRect.width  + pad * 2,
    height: cardRect.height + pad * 2,
  };

  const ringRadius = 28;
  const screenW = typeof window !== "undefined" ? window.innerWidth : 390;
  const panelMaxWidth = Math.min(screenW - 40, 420);

  // Place callout above the card if there's room, otherwise below
  const spaceAbove = hole.top - 20;
  const panelTop = spaceAbove > 140
    ? Math.max(20, hole.top - 160)
    : hole.bottom + 16;

  const glassBg = {
    background: "rgba(8,8,20,0.88)",
    backdropFilter: "blur(28px)",
    WebkitBackdropFilter: "blur(28px)",
    border: "1px solid rgba(255,255,255,0.14)",
  };

  return (
    <>
      <SingleHoleOverlay hole={hole} onClick={onNext} />
      <AnimatedRing rect={cardRect} pad={pad} borderRadius={ringRadius} zIndex={10001} pulse={true} />

      {/* Glass callout */}
      <div
        className="pointer-events-none fixed z-[10004]"
        style={{ top: panelTop, left: "50%", transform: "translateX(-50%)", width: panelMaxWidth }}
      >
        <motion.div
          className="pointer-events-auto"
          style={{ ...glassBg, borderRadius: 20, padding: "16px 18px 14px" }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.28, duration: 0.40, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.p
            style={{ fontSize: 19, fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em", color: "#fff", marginBottom: 7 }}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38, duration: 0.28, ease: "easeOut" }}
          >
            Purchase Successful!
          </motion.p>
          <motion.div
            style={{ height: 1, background: "rgba(255,255,255,0.22)", marginBottom: 9, originX: 0 }}
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
            transition={{ delay: 0.48, duration: 0.28 }}
          />
          <motion.p
            style={{ fontSize: 12, fontWeight: 400, lineHeight: 1.65, color: "rgba(255,255,255,0.72)", marginBottom: 14 }}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.56, duration: 0.26, ease: "easeOut" }}
          >
            <WordReveal
              text="This is what you'll see after investing. Your order has been placed and is being processed — you'll be notified as soon as it's confirmed."
              baseDelay={0.64}
            />
          </motion.p>
          <motion.button
            onClick={onNext}
            style={{
              width: "100%", padding: "10px 0", borderRadius: 12,
              fontSize: 13, fontWeight: 700, color: "#fff",
              background: "linear-gradient(135deg,#7c3aed,#5b21b6)",
              border: "none", cursor: "pointer",
            }}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: 0.26, ease: "easeOut" }}
            whileTap={{ scale: 0.97 }}
          >
            Next →
          </motion.button>
        </motion.div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────
   Phase 5 — Pending orders spotlight on live Home page
───────────────────────────────────────────────────────── */
function PendingOrdersSpotlight({ pendingRect, onDone }) {
  if (!pendingRect) return null;

  const padH = 16;   // horizontal
  const padTop = 20; // generous top — show the "Filling" header above the card
  const padBot = 6;  // tight bottom — don't bleed into the sibling section below
  const hole = {
    top:    pendingRect.top    - padTop,
    left:   pendingRect.left   - padH,
    right:  pendingRect.right  + padH,
    bottom: pendingRect.bottom + padBot,
    width:  pendingRect.width  + padH * 2,
    height: pendingRect.height + padTop + padBot,
  };

  const ringRadius = 24;
  const screenW = typeof window !== "undefined" ? window.innerWidth : 390;
  const panelMaxWidth = Math.min(screenW - 40, 420);

  const spaceBelow = (typeof window !== "undefined" ? window.innerHeight : 844) - hole.bottom - 20;
  const panelTop = spaceBelow > 160
    ? hole.bottom + 12
    : Math.max(20, hole.top - 180);

  const glassBg = {
    background: "rgba(8,8,20,0.88)",
    backdropFilter: "blur(28px)",
    WebkitBackdropFilter: "blur(28px)",
    border: "1px solid rgba(255,255,255,0.14)",
  };

  return (
    <>
      <SingleHoleOverlay hole={hole} onClick={onDone} />
      <AnimatedRing rect={pendingRect} pad={padH} borderRadius={ringRadius} zIndex={10001} pulse={true} />

      <div
        className="pointer-events-none fixed z-[10004]"
        style={{ top: panelTop, left: "50%", transform: "translateX(-50%)", width: panelMaxWidth }}
      >
        <motion.div
          className="pointer-events-auto"
          style={{ ...glassBg, borderRadius: 20, padding: "16px 18px 14px" }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.28, duration: 0.40, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.p
            style={{ fontSize: 19, fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em", color: "#fff", marginBottom: 7 }}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38, duration: 0.28, ease: "easeOut" }}
          >
            Watch it grow
          </motion.p>
          <motion.div
            style={{ height: 1, background: "rgba(255,255,255,0.22)", marginBottom: 9, originX: 0 }}
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
            transition={{ delay: 0.48, duration: 0.28 }}
          />
          <motion.p
            style={{ fontSize: 12, fontWeight: 400, lineHeight: 1.65, color: "rgba(255,255,255,0.72)", marginBottom: 14 }}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.56, duration: 0.26, ease: "easeOut" }}
          >
            Your strategy appears as <strong style={{ color: "#fff" }}>Pending</strong> while being filled. Once settled, your investment reflects live on your home balance card — showing portfolio value and performance in real time.
          </motion.p>
          <motion.button
            onClick={onDone}
            style={{
              width: "100%", padding: "10px 0", borderRadius: 12, fontSize: 13, fontWeight: 700,
              letterSpacing: "0.04em", color: "#fff",
              background: "linear-gradient(135deg, #7C3AED, #5B21B6)",
              border: "none", cursor: "pointer",
            }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.72, duration: 0.26 }}
            whileTap={{ scale: 0.97 }}
          >
            Got it →
          </motion.button>
        </motion.div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────
   Phase 3 — Invest Now button spotlight
───────────────────────────────────────────────────────── */
function InvestBtnSpotlight({ btnRect, onNext }) {
  if (!btnRect) return null;

  const pad = 12;
  const hole = {
    top:    btnRect.top    - pad,
    left:   btnRect.left   - pad,
    right:  btnRect.right  + pad,
    bottom: btnRect.bottom + pad,
    width:  btnRect.width  + pad * 2,
    height: btnRect.height + pad * 2,
  };

  const ringRadius = 28;
  const screenW = typeof window !== "undefined" ? window.innerWidth : 390;
  const panelMaxWidth = Math.min(screenW - 40, 420);
  const panelTop = Math.max(20, Math.round(hole.top * 0.36));

  const glassBg = {
    background: "rgba(8,8,20,0.88)",
    backdropFilter: "blur(28px)",
    WebkitBackdropFilter: "blur(28px)",
    border: "1px solid rgba(255,255,255,0.14)",
  };

  return (
    <>
      <SingleHoleOverlay hole={hole} onClick={onNext} />
      <AnimatedRing rect={btnRect} pad={pad} borderRadius={ringRadius} zIndex={10001} pulse={true} />

      {/* Bouncing arrow pointing at the button */}
      <motion.div
        className="pointer-events-none fixed z-[10002] flex flex-col items-center"
        style={{ top: hole.top - 34, left: hole.left + hole.width / 2, transform: "translateX(-50%)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ delay: 0.25, duration: 0.3 }}
      >
        <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}>
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
            <path d="M8 3L8 13M13 8L8 13L3 8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      </motion.div>

      {/* Dark glass callout */}
      <div className="pointer-events-none fixed z-[10004]"
        style={{ top: panelTop, left: "50%", transform: "translateX(-50%)", width: panelMaxWidth }}
      >
        <motion.div
          className="pointer-events-auto"
          style={{ ...glassBg, borderRadius: 20, padding: "16px 18px 14px" }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.32, duration: 0.40, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.p
            style={{ fontSize: 19, fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em", color: "#fff", marginBottom: 7 }}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42, duration: 0.28, ease: "easeOut" }}
          >
            Invest Now
          </motion.p>
          <motion.div
            style={{ height: 1, background: "rgba(255,255,255,0.22)", marginBottom: 9, originX: 0 }}
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
            transition={{ delay: 0.52, duration: 0.30 }}
          />
          <motion.p
            style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.4, color: "rgba(255,255,255,0.96)", marginBottom: 8 }}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.60, duration: 0.26, ease: "easeOut" }}
          >
            Ready to grow your wealth?
          </motion.p>
          <p style={{ fontSize: 11.5, fontWeight: 400, lineHeight: 1.65, color: "rgba(255,255,255,0.70)", marginBottom: 16 }}>
            <WordReveal
              text="Tap Invest Now to put money into this basket. You choose the amount and we take care of the rest."
              baseDelay={0.70}
            />
          </p>
          <motion.button
            onClick={onNext}
            style={{
              padding: "8px 22px", borderRadius: 10, fontSize: 12, fontWeight: 700,
              letterSpacing: "0.04em", color: "#fff",
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.38)", cursor: "pointer",
            }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 1.05, duration: 0.26 }}
            whileTap={{ scale: 0.93 }}
          >
            Next →
          </motion.button>
        </motion.div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────
   Phase 0 — Tab coach mark
───────────────────────────────────────────────────────── */
function TabSpotlight({ rect, onLottieLoad }) {
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

  // Position: 82% of the way from top of screen down to the tab,
  // centered horizontally — sits low in the open space just above the tab.
  const lottieTop = Math.round(hole.top * 0.82);

  return (
    <>
      <SingleHoleOverlay hole={hole} />
      <AnimatedRing rect={rect} pad={pad} borderRadius={16} zIndex={10001} />

      {/* Lottie animation — lower-centered in the open space above the tab */}
      <motion.div
        className="pointer-events-none fixed z-[10002]"
        style={{
          top:  lottieTop,
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <DotLottieReact
          src="https://lottie.host/abde670e-c9ef-40b6-9009-6dfb6bbebc0a/1ank9HLrmf.json"
          loop
          autoplay
          style={{ width: 260, height: 260 }}
          dotLottieRefCallback={(dLottie) => {
            if (!dLottie) return;
            dLottie.addEventListener("load", () => onLottieLoad?.());
          }}
        />
      </motion.div>

      {/* Arrow + label below the tab ring */}
      <motion.div
        className="pointer-events-none fixed z-[10002] flex flex-col items-center gap-1.5"
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
   Phase 2 — View Factsheet button spotlight
   Matches the Phase 0 tab-spotlight style:
   • Blurred 4-panel overlay with a clean hole around the button
   • Pulsing AnimatedRing (same component as Phase 0/1)
   • Bouncing down-arrow just above the button
   • Glass text callout centred above, fading in after the ring
───────────────────────────────────────────────────────── */
function FactsheetBtnSpotlight({ btnRect, onNext }) {
  if (!btnRect) return null;

  const pad = 12;
  const hole = {
    top:    btnRect.top    - pad,
    left:   btnRect.left   - pad,
    right:  btnRect.right  + pad,
    bottom: btnRect.bottom + pad,
    width:  btnRect.width  + pad * 2,
    height: btnRect.height + pad * 2,
  };

  // 16px (rounded-2xl on the button) + 12px pad = 28px — ring exactly follows button shape
  const ringRadius = 28;
  const screenW  = typeof window !== "undefined" ? window.innerWidth  : 390;
  const screenH  = typeof window !== "undefined" ? window.innerHeight : 844;

  // Text panel: centred, sits in the space between the modal top and the hole.
  // Use 36% of the distance from screen-top to the hole as the panel's top edge.
  const panelMaxWidth = Math.min(screenW - 40, 420);
  const panelTop = Math.max(20, Math.round(hole.top * 0.36));

  const glassBg = {
    background: "rgba(8,8,20,0.88)",
    backdropFilter: "blur(28px)",
    WebkitBackdropFilter: "blur(28px)",
    border: "1px solid rgba(255,255,255,0.14)",
  };

  return (
    <>
      {/* Blurred 4-panel overlay — hole reveals only the factsheet button */}
      <SingleHoleOverlay hole={hole} onClick={onNext} />

      {/* Pulsing ring — identical style to Phase 0 AnimatedRing */}
      <AnimatedRing rect={btnRect} pad={pad} borderRadius={ringRadius} zIndex={10001} pulse={true} />

      {/* Bouncing down-arrow pointing at the button — appears just above the ring */}
      <motion.div
        className="pointer-events-none fixed z-[10002] flex flex-col items-center"
        style={{
          top:       hole.top - 34,
          left:      hole.left + hole.width / 2,
          transform: "translateX(-50%)",
        }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ delay: 0.25, duration: 0.3 }}
      >
        <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}>
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
            <path d="M8 3L8 13M13 8L8 13L3 8" stroke="white" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      </motion.div>

      {/* Glass callout — fades in ~300 ms after the ring, above the hole */}
      <div
        className="pointer-events-none fixed z-[10004]"
        style={{ top: panelTop, left: "50%", transform: "translateX(-50%)", width: panelMaxWidth }}
      >
        <motion.div
          className="pointer-events-auto"
          style={{ ...glassBg, borderRadius: 20, padding: "16px 18px 14px" }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.32, duration: 0.40, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.p
            style={{ fontSize: 19, fontWeight: 900, lineHeight: 1.1,
              letterSpacing: "-0.02em", color: "#fff", marginBottom: 7 }}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42, duration: 0.28, ease: "easeOut" }}
          >
            Strategy Factsheet
          </motion.p>

          <motion.div
            style={{ height: 1, background: "rgba(255,255,255,0.22)", marginBottom: 9, originX: 0 }}
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
            transition={{ delay: 0.52, duration: 0.30 }}
          />

          <motion.p
            style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em",
              lineHeight: 1.4, color: "rgba(255,255,255,0.96)", marginBottom: 8 }}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.60, duration: 0.26, ease: "easeOut" }}
          >
            Your complete investment guide.
          </motion.p>

          <p style={{ fontSize: 11.5, fontWeight: 400, lineHeight: 1.65,
            color: "rgba(255,255,255,0.70)", marginBottom: 16 }}>
            <WordReveal
              text="A factsheet shows you everything — performance history, what the basket holds, fees, and risk profile. Tap to explore."
              baseDelay={0.70}
            />
          </p>

          <motion.button
            onClick={onNext}
            style={{
              padding: "8px 22px", borderRadius: 10, fontSize: 12, fontWeight: 700,
              letterSpacing: "0.04em", color: "#fff",
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.38)", cursor: "pointer",
            }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 1.05, duration: 0.26 }}
            whileTap={{ scale: 0.93 }}
          >
            Next →
          </motion.button>
        </motion.div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────
   Phase 1 — Dual spotlight + card text callout
───────────────────────────────────────────────────────── */
function CardSpotlight({ cardRect, cardRadius, tabRect, cardName, cardDesc, onDone, onNext }) {
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
    bottom: cardRect.bottom + 2,          // minimal bottom pad — prevents next card bleeding through
    width:  cardRect.width  + cpad * 2,
    height: cardRect.height + cpad + 2,
  };
  const tabHole = tabRect ? {
    top:    tabRect.top    - tpad,
    left:   tabRect.left   - tpad,
    right:  tabRect.right  + tpad,
    bottom: tabRect.bottom + tpad,
    width:  tabRect.width  + tpad * 2,
    height: tabRect.height + tpad * 2,
  } : null;

  // Callout vertically centred in the gap between the highlighted tab and the
  // highlighted card — never hugging the tab edge. estimatedPanelHeight is a
  // conservative approximation; the panel will never go above tabHole.bottom+12.
  const gapTop    = tabHole ? tabHole.bottom + 12 : 80;
  const gapBottom = cardHole.top - 12;
  const estimatedPanelHeight = 168;
  const panelTop = Math.max(gapTop, Math.round((gapTop + gapBottom) / 2 - estimatedPanelHeight / 2));
  const panelMaxWidth = 460;
  const panelWidth = Math.min(typeof window !== "undefined" ? window.innerWidth - 32 : panelMaxWidth, panelMaxWidth);

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
      <AnimatedRing rect={tabRect} pad={tpad} borderRadius={16} zIndex={10003} pulse={true} />

      {/* Card ring — matches card shape */}
      <motion.div
        className="pointer-events-none fixed z-[10001]"
        style={{ top: cardHole.top, left: cardHole.left, width: cardHole.width, height: cardHole.height }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, scale: pressed ? [1, 0.975, 1] : 1 }}
        exit={{ opacity: 0 }}
        transition={{ opacity: { duration: 0.3 }, scale: pressed ? { duration: 0.38 } : {} }}
      >
        <div className="absolute inset-0"
          style={{ borderRadius: ringRadius,
            border: "2px solid rgba(255,255,255,0.90)",
            boxShadow: "0 0 0 1.5px rgba(0,0,0,0.28), 0 0 24px 6px rgba(255,255,255,0.16)" }}
        />
        <motion.div className="absolute inset-0"
          style={{ borderRadius: ringRadius, border: "1.5px solid rgba(255,255,255,0.50)" }}
          animate={{ opacity: [0.6, 0.15, 0.6] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {/* Callout panel — always centred horizontally between the highlighted
          tab above and the highlighted card below, on all screen sizes.
          Outer div owns the fixed position + centering so Framer Motion's
          `y` animation on the inner div never clobbers the translateX(-50%). */}
      <div
        className="pointer-events-none fixed z-[10004]"
        style={{
          top:       panelTop,
          left:      "50%",
          transform: "translateX(-50%)",
          width:     panelWidth,
        }}
      >
        <motion.div
          className="pointer-events-auto"
          style={{ ...glassBg, borderRadius: 18, padding: "14px 18px 14px" }}
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
            onClick={onNext ?? onDone}
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
            Next →
          </motion.button>
        </motion.div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────── */
export default function MintBasketsExplainer({
  onDone,
  tabRef,
  onOpenStrategyForCoach,
  onNavigateToFactsheetForCoach,
  onNavigateToHome,
  onCloseStrategyForCoach,
}) {
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
  const [lottieReady, setLottieReady]  = useState(false);
  const [phase2BtnRect, setPhase2BtnRect] = useState(null);
  const [phase3BtnRect, setPhase3BtnRect] = useState(null);
  const [phase4CardRect, setPhase4CardRect] = useState(null);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [phase5PendingRect, setPhase5PendingRect] = useState(null);
  const phaseTimer    = useRef(null);
  const cardSectionRef    = useRef(null); // element we translateY to make room
  const hiddenSiblingsRef = useRef([]);   // sibling sections hidden during push
  const prevHOverflowsRef = useRef([]);   // saved h-scroll states for partial restore
  const modalScrollElRef  = useRef(null); // modal scroll container padded in phase 2

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

    // Lock vertical scrolling
    const prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const appContent = document.querySelector('.app-content');
    const prevContentOverflow = appContent ? appContent.style.overflow : '';
    const savedScrollTop = appContent ? appContent.scrollTop : 0;
    if (appContent) {
      appContent.style.overflow = 'hidden';
      appContent.style.overflowY = 'hidden';
    }

    // Block all scroll input — overflow:hidden alone doesn't stop native
    // touch momentum on iOS/Android, and doesn't stop mouse-wheel or
    // keyboard scrolling in a browser / WebView preview.
    const SCROLL_KEYS = new Set(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' ']);
    const blockScroll = (e) => {
      if (e.target.closest('button, input, select, textarea, a, [role="button"]')) return;
      e.preventDefault();
    };
    const blockKey = (e) => {
      if (SCROLL_KEYS.has(e.key) && !e.target.closest('input, textarea, select')) {
        e.preventDefault();
      }
    };
    document.addEventListener('touchmove', blockScroll, { passive: false });
    document.addEventListener('wheel',     blockScroll, { passive: false });
    document.addEventListener('keydown',   blockKey,   { passive: false });

    // Lock ALL horizontal scroll containers so the user cannot swipe
    // sideways through the strategy card list while the animation is active.
    const hScrollEls = Array.from(document.querySelectorAll('.overflow-x-auto, [class*="overflow-x-scroll"]'));
    const prevHOverflows = hScrollEls.map(el => ({ el, overflow: el.style.overflowX, scrollLeft: el.scrollLeft }));
    prevHOverflowsRef.current = prevHOverflows;
    hScrollEls.forEach(el => { el.style.overflowX = 'hidden'; });

    return () => {
      document.getElementById('__mint_coach_style__')?.remove();
      document.body.style.overflow = prevBodyOverflow;
      if (appContent) {
        appContent.style.overflow = prevContentOverflow;
        appContent.style.overflowY = '';
        appContent.scrollTop = savedScrollTop;
      }
      document.removeEventListener('touchmove', blockScroll);
      document.removeEventListener('wheel',     blockScroll);
      document.removeEventListener('keydown',   blockKey);
      // Restore horizontal scroll containers (if not already restored by partialCleanup)
      prevHOverflowsRef.current.forEach(({ el, overflow, scrollLeft }) => {
        el.style.overflowX = overflow;
        el.scrollLeft = scrollLeft;
      });
      prevHOverflowsRef.current = [];
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

  // Phase 0 → 1: wait for Lottie to finish loading, THEN wait 2.5 s
  useEffect(() => {
    if (phase !== 0 || !lottieReady) return;
    phaseTimer.current = setTimeout(() => setPhase(1), 2500);
    return () => clearTimeout(phaseTimer.current);
  }, [phase, lottieReady]);

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

      // Hide every DOM sibling BELOW this section so they don't bleed
      // through the spotlight hole after the translateY push overlaps them.
      const hidden = [];
      let next = section.nextElementSibling;
      while (next) {
        hidden.push(next);
        next.style.visibility = 'hidden';
        next = next.nextElementSibling;
      }
      hiddenSiblingsRef.current = hidden;
    }

    const t = setTimeout(() => setCardRect(el.getBoundingClientRect()), 950);
    return () => { clearTimeout(t); };
  }, [phase]);

  // partialCleanup: restores Phase 1 transforms/scroll but keeps the explainer mounted
  // Used when transitioning from Phase 1 → Phase 2 (strategy modal opens).
  const partialCleanup = useCallback(() => {
    document.getElementById('__mint_coach_style__')?.remove();
    document.body.style.overflow = '';
    const appContent = document.querySelector('.app-content');
    if (appContent) appContent.style.overflow = '';
    // Slide the card section back up
    if (cardSectionRef.current) {
      cardSectionRef.current.style.transition = 'transform 0.45s cubic-bezier(0.4,0,0.2,1)';
      cardSectionRef.current.style.transform  = '';
      cardSectionRef.current = null;
    }
    // Restore sibling visibility
    hiddenSiblingsRef.current.forEach(el => { el.style.visibility = ''; });
    hiddenSiblingsRef.current = [];
    // Restore horizontal scroll containers
    prevHOverflowsRef.current.forEach(({ el, overflow, scrollLeft }) => {
      el.style.overflowX = overflow;
      el.scrollLeft = scrollLeft;
    });
    prevHOverflowsRef.current = [];
  }, []);

  // handleNext: Phase 1 → gap → modal opens at top → scrolls down → Phase 2 spotlight
  // The "gap" phase (phase = 1.5) renders nothing, so there is zero bleed-through
  // of phase 1 text/overlay while the strategy modal is opening.
  const handleNext = useCallback(() => {
    // 1. Jump to gap state — nothing is rendered, overlay fully disappears instantly
    setPhase(1.5);

    // 2. Restore card-section transforms (modal must open cleanly without the push)
    setTimeout(() => {
      partialCleanup();

      // 3. Open the strategy modal — it will be at the TOP by default
      onOpenStrategyForCoach?.(cardName);

      // 4. Let the modal open and settle (~900 ms), then pause at the top for 1 s
      setTimeout(() => {
        const btn = document.querySelector('[data-coach-factsheet-btn="true"]');
        if (!btn) { handleDone(); return; }

        const scrollEl = btn.closest('.overflow-y-auto');

        // 5. Ensure modal is scrolled to top first (reset), so user sees it open at top
        if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: 'instant' });

        // 6. After the 1-second pause at the top, smooth-scroll down to the factsheet btn.
        //    Add padding-bottom to the scroll container BEFORE scrolling so there is
        //    90px of empty space below the button — this lifts the button 90px above
        //    the bottom edge of the modal when scrolled to the end.
        setTimeout(() => {
          if (scrollEl) {
            // Store ref so cleanup can remove the padding when tour ends
            modalScrollElRef.current = scrollEl;
            scrollEl.style.paddingBottom = '90px';
            scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: 'smooth' });
          } else {
            btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }

          // 7. After scroll settles, capture the rect and show phase 2 spotlight
          setTimeout(() => {
            const freshBtn = document.querySelector('[data-coach-factsheet-btn="true"]');
            if (!freshBtn) { handleDone(); return; }
            setPhase2BtnRect(freshBtn.getBoundingClientRect());
            setPhase(2);
          }, 650);
        }, 1000); // 1-second pause at top
      }, 900);
    }, 40);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partialCleanup, cardName, onOpenStrategyForCoach]);

  // handleGoToPhase3: Phase 2 → 3 — spotlight the Invest button
  const handleGoToPhase3 = useCallback(() => {
    const investBtn = document.querySelector('[data-coach-invest-btn="true"]');
    if (!investBtn) { handleDone(); return; }
    setPhase3BtnRect(investBtn.getBoundingClientRect());
    setPhase(3);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // handleGoToPhase4: Phase 3 → 4 — show PaymentSuccessPage portal then spotlight its card
  const handleGoToPhase4 = useCallback(() => {
    setShowSuccessOverlay(true);
  }, []);

  // Once showSuccessOverlay mounts, capture the card rect (after browser paint)
  useEffect(() => {
    if (!showSuccessOverlay) return;
    const id = requestAnimationFrame(() => {
      // Give the portal one more frame to actually paint
      requestAnimationFrame(() => {
        const el = document.querySelector('[data-coach-success-card="true"]');
        if (el) {
          setPhase4CardRect(el.getBoundingClientRect());
          setPhase(4);
        }
      });
    });
    return () => cancelAnimationFrame(id);
  }, [showSuccessOverlay]);

  // Phase 4 — no auto-advance; user proceeds via the "Next" button in SuccessCardSpotlight

  const handleDone = useCallback(() => {
    // Clear any simulated pending order from the coach tour
    sessionStorage.removeItem('mint_coach_pending_sim');
    // 1. Instantly fade the entire overlay (dim + text + rings) before moving anything
    setPanelExiting(true);
    // 2. Restore scroll + slide nav back in simultaneously
    document.getElementById('__mint_coach_style__')?.remove();
    document.body.style.overflow = '';
    const appContent = document.querySelector('.app-content');
    if (appContent) appContent.style.overflow = '';
    // Remove padding added to modal scroll container during phase 2
    if (modalScrollElRef.current) {
      modalScrollElRef.current.style.paddingBottom = '';
      modalScrollElRef.current = null;
    }
    // 3. After overlay has faded (~180 ms), THEN slide the card back up
    //    — card is invisible behind the faded overlay, so there is no overlap
    setTimeout(() => {
      if (cardSectionRef.current) {
        cardSectionRef.current.style.transition = 'transform 0.45s cubic-bezier(0.4,0,0.2,1)';
        cardSectionRef.current.style.transform  = '';
        cardSectionRef.current = null;
      }
      // Restore visibility of sections that were hidden to prevent bleed-through
      hiddenSiblingsRef.current.forEach(el => { el.style.visibility = ''; });
      hiddenSiblingsRef.current = [];
    }, 180);
    // 4. Unmount after card has settled
    setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDone?.(), 200);
    }, 640);
  }, [onDone]);

  if (!visible) return null;

  const content = (
    <>
      {/* PaymentSuccessPage overlay — portal so it shows above everything */}
      {showSuccessOverlay && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 10002,
            background: "#f8f8fb", overflowY: "auto",
          }}
        >
          <PaymentSuccessPage
            strategyName="Famous Brands"
            onDone={() => setShowSuccessOverlay(false)}
          />
        </div>
      )}

      <AnimatePresence>
        {phase === 0 && (
          <motion.div key="phase0" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <TabSpotlight rect={tabRect} onLottieLoad={() => setLottieReady(true)} />
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
              onNext={handleNext}
            />
          </motion.div>
        )}
        {phase === 2 && phase2BtnRect && (
          <motion.div
            key="phase2"
            initial={{ opacity: 0 }}
            animate={{ opacity: panelExiting ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: panelExiting ? 0.16 : 0.3 }}
          >
            <FactsheetBtnSpotlight
              btnRect={phase2BtnRect}
              onNext={handleGoToPhase3}
            />
          </motion.div>
        )}
        {phase === 3 && phase3BtnRect && (
          <motion.div
            key="phase3"
            initial={{ opacity: 0 }}
            animate={{ opacity: panelExiting ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: panelExiting ? 0.16 : 0.3 }}
          >
            <InvestBtnSpotlight
              btnRect={phase3BtnRect}
              onNext={handleGoToPhase4}
            />
          </motion.div>
        )}
        {phase === 4 && phase4CardRect && (
          <motion.div
            key="phase4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <SuccessCardSpotlight
              cardRect={phase4CardRect}
              onNext={() => {
                // 1. Immediately remove the coach overlay so strategy modal hole disappears
                setPhase4CardRect(null);
                // 2. Close the strategy bottom-sheet portal (it renders on body even when hidden)
                onCloseStrategyForCoach?.();
                // 3. Signal HomePage to show a simulated pending order
                sessionStorage.setItem('mint_coach_pending_sim', 'MINT Famous Brands');
                // 4. Hide the success page overlay
                setShowSuccessOverlay(false);
                // 5. Switch to Home tab
                onNavigateToHome?.();
                // 6. Poll for the pending orders section, scroll it into view first.
                //    The scroll lock (overflow:hidden on .app-content) blocks scrollIntoView,
                //    so we temporarily release it, snap-scroll, re-lock, then capture the rect.
                let attempts = 0;
                const pollPending = () => {
                  const el = document.querySelector('[data-coach-pending-orders="true"]');
                  if (el) {
                    const appContent = document.querySelector('.app-content');
                    // Temporarily release Y overflow so scrollIntoView can work
                    if (appContent) appContent.style.overflowY = 'auto';
                    el.scrollIntoView({ behavior: 'instant', block: 'start' });
                    // Re-lock on next frame, then capture rect once sticky has settled
                    requestAnimationFrame(() => {
                      if (appContent) appContent.style.overflowY = 'hidden';
                      setTimeout(() => {
                        setPhase5PendingRect(el.getBoundingClientRect());
                        setPhase(5);
                      }, 120);
                    });
                    return;
                  }
                  if (++attempts < 100) setTimeout(pollPending, 50);
                };
                setTimeout(pollPending, 500);
              }}
            />
          </motion.div>
        )}
        {phase === 5 && phase5PendingRect && (
          <motion.div
            key="phase5"
            initial={{ opacity: 0 }}
            animate={{ opacity: panelExiting ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: panelExiting ? 0.16 : 0.3 }}
          >
            <PendingOrdersSpotlight
              pendingRect={phase5PendingRect}
              onDone={handleDone}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  return createPortal(content, document.body);
}
