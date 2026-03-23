import React, { useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

const HomeIcon = ({ active }) => (
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
    <motion.path
      d="M13 3.5L3.5 11V22H9.5V16H16.5V22H22.5V11L13 3.5Z"
      animate={{
        fill: active ? "rgba(109,40,217,0.15)" : "rgba(148,163,184,0)",
        stroke: active ? "#7c3aed" : "#94a3b8",
      }}
      transition={{ duration: 0.25 }}
      stroke={active ? "#7c3aed" : "#94a3b8"}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <motion.rect
      x="10.5" y="16" width="5" height="6" rx="1"
      animate={{ fill: active ? "rgba(109,40,217,0.25)" : "rgba(148,163,184,0.15)" }}
      transition={{ duration: 0.25 }}
    />
    <motion.path
      d="M13 3.5L22.5 11"
      animate={{ stroke: active ? "#7c3aed" : "#94a3b8" }}
      stroke={active ? "#7c3aed" : "#94a3b8"}
      strokeWidth="1.7"
      strokeLinecap="round"
      transition={{ duration: 0.25 }}
    />
  </svg>
);

const PortfolioIcon = ({ active }) => (
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
    <motion.path
      d="M13 13L13 4.5C17.6944 4.5 21.5 8.30558 21.5 13C21.5 17.6944 17.6944 21.5 13 21.5C8.30558 21.5 4.5 17.6944 4.5 13C4.5 10.2604 5.76256 7.81865 7.75 6.21"
      animate={{ stroke: active ? "#7c3aed" : "#94a3b8" }}
      stroke={active ? "#7c3aed" : "#94a3b8"}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      transition={{ duration: 0.25 }}
    />
    <motion.path
      d="M13 13L18.5 7.5"
      animate={{ stroke: active ? "#a855f7" : "#cbd5e1" }}
      stroke={active ? "#a855f7" : "#cbd5e1"}
      strokeWidth="1.5"
      strokeLinecap="round"
      transition={{ duration: 0.25 }}
    />
    <motion.circle
      cx="13" cy="13" r="2"
      animate={{ fill: active ? "#7c3aed" : "#94a3b8" }}
      fill={active ? "#7c3aed" : "#94a3b8"}
      transition={{ duration: 0.25 }}
    />
    <motion.path
      d="M13 4.5A8.5 8.5 0 0 1 21.5 13"
      animate={{
        stroke: active ? "#7c3aed" : "transparent",
        strokeWidth: active ? 2.5 : 0,
      }}
      stroke={active ? "#7c3aed" : "transparent"}
      strokeWidth={active ? 2.5 : 0}
      strokeLinecap="round"
      opacity={0.35}
      transition={{ duration: 0.3 }}
    />
  </svg>
);

const MarketsIcon = ({ active }) => (
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
    <motion.polyline
      points="3.5,19 8.5,12 13,16 18,8 22.5,10"
      animate={{ stroke: active ? "#7c3aed" : "#94a3b8" }}
      stroke={active ? "#7c3aed" : "#94a3b8"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      transition={{ duration: 0.25 }}
    />
    <motion.path
      d="M3.5 19L8.5 12L13 16L18 8L22.5 10"
      animate={{
        fill: active ? "url(#marketGrad)" : "rgba(0,0,0,0)",
      }}
      fill="rgba(0,0,0,0)"
      strokeWidth="0"
      opacity={active ? 1 : 0}
      transition={{ duration: 0.3 }}
    />
    <defs>
      <linearGradient id="marketGrad" x1="3.5" y1="8" x2="3.5" y2="22" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.18" />
        <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
      </linearGradient>
    </defs>
    <motion.circle
      cx="22.5" cy="10" r="2"
      animate={{
        fill: active ? "#7c3aed" : "#cbd5e1",
        scale: active ? 1 : 0.7,
      }}
      fill={active ? "#7c3aed" : "#cbd5e1"}
      transition={{ duration: 0.25, type: "spring", stiffness: 400 }}
    />
    <motion.line
      x1="3.5" y1="21.5" x2="22.5" y2="21.5"
      animate={{ stroke: active ? "#7c3aed" : "#e2e8f0" }}
      stroke={active ? "#7c3aed" : "#e2e8f0"}
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity={0.5}
      transition={{ duration: 0.25 }}
    />
  </svg>
);

const MoreIcon = ({ active }) => (
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
    <motion.rect
      x="4" y="4" width="7.5" height="7.5" rx="2"
      animate={{
        fill: active ? "rgba(109,40,217,0.18)" : "rgba(148,163,184,0.12)",
        stroke: active ? "#7c3aed" : "#94a3b8",
      }}
      fill="rgba(148,163,184,0.12)"
      stroke={active ? "#7c3aed" : "#94a3b8"}
      strokeWidth="1.5"
      transition={{ duration: 0.2 }}
    />
    <motion.rect
      x="14.5" y="4" width="7.5" height="7.5" rx="2"
      animate={{
        fill: active ? "rgba(109,40,217,0.12)" : "rgba(148,163,184,0.08)",
        stroke: active ? "#a855f7" : "#94a3b8",
      }}
      fill="rgba(148,163,184,0.08)"
      stroke={active ? "#a855f7" : "#94a3b8"}
      strokeWidth="1.5"
      transition={{ duration: 0.2, delay: 0.04 }}
    />
    <motion.rect
      x="4" y="14.5" width="7.5" height="7.5" rx="2"
      animate={{
        fill: active ? "rgba(109,40,217,0.12)" : "rgba(148,163,184,0.08)",
        stroke: active ? "#a855f7" : "#94a3b8",
      }}
      fill="rgba(148,163,184,0.08)"
      stroke={active ? "#a855f7" : "#94a3b8"}
      strokeWidth="1.5"
      transition={{ duration: 0.2, delay: 0.04 }}
    />
    <motion.rect
      x="14.5" y="14.5" width="7.5" height="7.5" rx="2"
      animate={{
        fill: active ? "rgba(109,40,217,0.18)" : "rgba(148,163,184,0.12)",
        stroke: active ? "#7c3aed" : "#94a3b8",
      }}
      fill="rgba(148,163,184,0.12)"
      stroke={active ? "#7c3aed" : "#94a3b8"}
      strokeWidth="1.5"
      transition={{ duration: 0.2, delay: 0.08 }}
    />
  </svg>
);

const ICONS = {
  home: HomeIcon,
  investments: PortfolioIcon,
  markets: MarketsIcon,
  more: MoreIcon,
};

const tabs = [
  { id: "home", label: "Home" },
  { id: "investments", label: "Portfolio" },
  { id: "markets", label: "Markets" },
  { id: "more", label: "More" },
];

const Navbar = ({ activeTab, setActiveTab }) => {
  const navRef = useRef(null);

  const triggerHaptic = async () => {
    try {
      const haptics = window?.Capacitor?.Plugins?.Haptics;
      if (!haptics?.impact) throw new Error("Haptics unavailable");
      await haptics.impact({ style: "LIGHT" });
    } catch {
      // web fallback — silent
    }
  };

  const updateNavbarHeight = () => {
    if (navRef.current) {
      document.documentElement.style.setProperty(
        "--navbar-height",
        `${navRef.current.offsetHeight}px`
      );
    }
  };

  useLayoutEffect(() => {
    updateNavbarHeight();
    window.addEventListener("resize", updateNavbarHeight);
    window.addEventListener("orientationchange", updateNavbarHeight);
    return () => {
      window.removeEventListener("resize", updateNavbarHeight);
      window.removeEventListener("orientationchange", updateNavbarHeight);
    };
  }, []);

  useLayoutEffect(() => {
    const t = setTimeout(() => {
      if (navRef.current)
        document.documentElement.style.setProperty(
          "--navbar-height",
          `${navRef.current.offsetHeight}px`
        );
    }, 100);
    return () => clearTimeout(t);
  }, []);

  return createPortal(
    <nav
      ref={navRef}
      className="fixed bottom-0 left-0 right-0 z-[1000]"
      style={{
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        borderTop: "1px solid rgba(109,40,217,0.08)",
        paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
        paddingTop: "0.625rem",
        transform: "translateZ(0)",
        willChange: "transform",
        boxShadow: "0 -8px 32px -4px rgba(109,40,217,0.07), 0 -1px 0 rgba(109,40,217,0.06)",
      }}
    >
      <div className="relative mx-auto grid w-full max-w-lg grid-cols-4 items-center px-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = ICONS[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => {
                triggerHaptic();
                setActiveTab(tab.id);
              }}
              className="relative flex flex-col items-center justify-center gap-1 py-1 focus:outline-none"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-x-1.5 -top-1 h-[3px] rounded-full"
                  style={{
                    background: "linear-gradient(90deg, #7c3aed 0%, #a855f7 100%)",
                    boxShadow: "0 0 8px rgba(124,58,237,0.6)",
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}

              <motion.div
                animate={
                  isActive
                    ? { scale: 1.18, y: -1 }
                    : { scale: 1, y: 0 }
                }
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="relative flex items-center justify-center"
              >
                {isActive && (
                  <motion.div
                    layoutId="icon-glow"
                    className="absolute rounded-2xl"
                    style={{
                      inset: "-7px -8px",
                      background:
                        "radial-gradient(ellipse at center, rgba(124,58,237,0.14) 0%, rgba(124,58,237,0) 75%)",
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon active={isActive} />
              </motion.div>

              <motion.span
                animate={{
                  color: isActive ? "#6d28d9" : "#94a3b8",
                  fontWeight: isActive ? 800 : 500,
                  opacity: isActive ? 1 : 0.6,
                }}
                transition={{ duration: 0.2 }}
                style={{
                  fontSize: "9px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  lineHeight: 1,
                }}
              >
                {tab.label}
              </motion.span>
            </button>
          );
        })}
      </div>
    </nav>,
    document.body
  );
};

export default Navbar;
