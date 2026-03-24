import React, { useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Icon Definitions ────────────────────────────────────────────────────── */

const HomeOutline = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M3 11.5L12 3l9 8.5V21a1 1 0 01-1 1h-5v-5h-6v5H4a1 1 0 01-1-1V11.5z"
      stroke="#94a3b8"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const HomeFilled = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M3 11.5L12 3l9 8.5V21a1 1 0 01-1 1h-5v-5h-6v5H4a1 1 0 01-1-1V11.5z"
      fill="#7c3aed"
      stroke="#7c3aed"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PortfolioOutline = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 2v10l6.5 6.5"
      stroke="#94a3b8"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <circle cx="12" cy="12" r="9.5" stroke="#94a3b8" strokeWidth="1.6" />
    <path
      d="M12 2A9.5 9.5 0 0121.5 12"
      stroke="#94a3b8"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </svg>
);

const PortfolioFilled = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9.5" fill="rgba(124,58,237,0.15)" stroke="#7c3aed" strokeWidth="1.6" />
    <path
      d="M12 2A9.5 9.5 0 0121.5 12"
      stroke="#7c3aed"
      strokeWidth="2.8"
      strokeLinecap="round"
    />
    <path
      d="M12 2v10l6.5 6.5"
      stroke="#7c3aed"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <circle cx="12" cy="12" r="2.2" fill="#7c3aed" />
  </svg>
);

const MarketsOutline = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <polyline
      points="3,18 8,11 12,14.5 17,7 21.5,10"
      stroke="#94a3b8"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <line x1="3" y1="21" x2="21" y2="21" stroke="#94a3b8" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const MarketsFilled = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="mktFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.25" />
        <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.02" />
      </linearGradient>
    </defs>
    <polygon
      points="3,18 8,11 12,14.5 17,7 21.5,10 21.5,21 3,21"
      fill="url(#mktFill)"
    />
    <polyline
      points="3,18 8,11 12,14.5 17,7 21.5,10"
      stroke="#7c3aed"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <line x1="3" y1="21" x2="21" y2="21" stroke="#7c3aed" strokeWidth="1.4" strokeLinecap="round" />
    <circle cx="21.5" cy="10" r="2" fill="#7c3aed" />
  </svg>
);

const MoreOutline = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <line x1="3" y1="7" x2="21" y2="7" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="3" y1="12" x2="21" y2="12" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="3" y1="17" x2="21" y2="17" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const MoreFilled = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="5.5" width="18" height="3" rx="1.5" fill="#7c3aed" />
    <rect x="3" y="10.5" width="13" height="3" rx="1.5" fill="#7c3aed" opacity="0.7" />
    <rect x="3" y="15.5" width="9" height="3" rx="1.5" fill="#7c3aed" opacity="0.45" />
  </svg>
);

/* ─── Tab Config ──────────────────────────────────────────────────────────── */

const TABS = [
  { id: "home",        label: "Home",      Outline: HomeOutline,      Filled: HomeFilled },
  { id: "investments", label: "Portfolio", Outline: PortfolioOutline, Filled: PortfolioFilled },
  { id: "markets",     label: "Markets",   Outline: MarketsOutline,   Filled: MarketsFilled },
  { id: "more",        label: "More",      Outline: MoreOutline,      Filled: MoreFilled },
];

const SPRING = { type: "spring", stiffness: 480, damping: 32 };

/* ─── Navbar ──────────────────────────────────────────────────────────────── */

const Navbar = ({ activeTab, setActiveTab }) => {
  const navRef = useRef(null);

  const triggerHaptic = async () => {
    try {
      const h = window?.Capacitor?.Plugins?.Haptics;
      if (h?.impact) await h.impact({ style: "LIGHT" });
    } catch {}
  };

  const syncHeight = () => {
    if (navRef.current)
      document.documentElement.style.setProperty(
        "--navbar-height",
        `${navRef.current.offsetHeight}px`
      );
  };

  useLayoutEffect(() => {
    syncHeight();
    window.addEventListener("resize", syncHeight);
    window.addEventListener("orientationchange", syncHeight);
    return () => {
      window.removeEventListener("resize", syncHeight);
      window.removeEventListener("orientationchange", syncHeight);
    };
  }, []);

  useLayoutEffect(() => {
    const t = setTimeout(syncHeight, 100);
    return () => clearTimeout(t);
  }, []);

  return createPortal(
    <nav
      ref={navRef}
      className="fixed bottom-0 left-0 right-0 z-[1000]"
      style={{
        background: "#ffffff",
        borderTop: "1px solid rgba(0,0,0,0.07)",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.06)",
        paddingBottom: "calc(0.6rem + env(safe-area-inset-bottom, 0px))",
        paddingTop: "0.5rem",
        transform: "translateZ(0)",
        willChange: "transform",
      }}
    >
      <div className="mx-auto grid w-full max-w-lg grid-cols-4 items-stretch px-1">
        {TABS.map(({ id, label, Outline, Filled }) => {
          const isActive = activeTab === id;
          return (
            <motion.button
              key={id}
              onClick={() => { triggerHaptic(); setActiveTab(id); }}
              whileTap={{ scale: 0.88 }}
              transition={SPRING}
              className="relative flex flex-col items-center justify-center gap-1 pb-1 pt-1.5 focus:outline-none select-none"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {/* Sliding background chip */}
              {isActive && (
                <motion.div
                  layoutId="nav-chip"
                  className="absolute rounded-2xl"
                  style={{
                    inset: "2px 6px",
                    background: "linear-gradient(135deg, rgba(124,58,237,0.1) 0%, rgba(167,139,250,0.08) 100%)",
                    border: "1px solid rgba(124,58,237,0.12)",
                  }}
                  transition={SPRING}
                />
              )}

              {/* Icon swap */}
              <div className="relative z-10 flex h-7 w-7 items-center justify-center">
                <AnimatePresence mode="wait" initial={false}>
                  {isActive ? (
                    <motion.div
                      key="filled"
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 600, damping: 28 }}
                    >
                      <Filled />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="outline"
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 600, damping: 28 }}
                    >
                      <Outline />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Label */}
              <motion.span
                animate={{
                  color: isActive ? "#6d28d9" : "#94a3b8",
                }}
                transition={{ duration: 0.18 }}
                className="relative z-10 text-[9.5px] font-semibold uppercase tracking-[0.07em] leading-none"
              >
                {label}
              </motion.span>

              {/* Active dot */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    key="dot"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={SPRING}
                    className="absolute bottom-0 h-1 w-1 rounded-full bg-violet-600"
                  />
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>
    </nav>,
    document.body
  );
};

export default Navbar;
