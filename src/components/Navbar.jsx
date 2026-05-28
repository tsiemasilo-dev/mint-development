import React, { useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import {
  Home,
  PieChart,
  Newspaper,
  MoreHorizontal,
} from "lucide-react";

const Navbar = ({ activeTab, setActiveTab, comingSoonTabs = [] }) => {
  const navRef = useRef(null);
  const ImpactStyle = {
    Light: "LIGHT",
  };

  const tabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "investments", label: "Portfolio", icon: PieChart },
    { id: "news", label: "News", icon: Newspaper },
    { id: "more", label: "More", icon: MoreHorizontal },
  ];

  const triggerHaptic = async (style) => {
    try {
      const haptics = window?.Capacitor?.Plugins?.Haptics;
      if (!haptics?.impact) {
        throw new Error("Haptics unavailable");
      }
      await haptics.impact({ style });
    } catch (error) {
      console.log("Native haptics only");
    }
  };

  const updateNavbarHeight = () => {
    if (navRef.current) {
      const { offsetHeight } = navRef.current;
      document.documentElement.style.setProperty("--navbar-height", `${offsetHeight}px`);
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
    const interval = setTimeout(() => {
      if (navRef.current) {
        const height = navRef.current.offsetHeight;
        document.documentElement.style.setProperty("--navbar-height", `${height}px`);
      }
    }, 100);
    return () => clearTimeout(interval);
  }, []);

  return (
    <>
      {createPortal(
        <nav
          ref={navRef}
          className="fixed bottom-0 left-0 right-0 z-[1000] border-t border-white/10 bg-white/70 pb-1 pt-3 backdrop-blur-2xl"
          style={{
            paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))",
            transform: "translateZ(0)",
            willChange: "transform"
          }}
        >
          <div className="relative mx-auto grid w-full max-w-lg grid-cols-4 items-center px-4">
            {tabs.map((tab) => {
              const isComingSoon = comingSoonTabs.includes(tab.id);
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (isComingSoon) return;
                    triggerHaptic(ImpactStyle.Light);
                    setActiveTab(tab.id);
                  }}
                  className={`relative flex flex-col items-center justify-center gap-1.5 py-1 transition-all ${
                    activeTab === tab.id ? "text-[#31005e] scale-110" : "text-slate-400 opacity-60"
                  }`}
                >
                  {isComingSoon && (
                    <span style={{
                      position: "absolute",
                      top: "-4px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "linear-gradient(135deg,#7c3aed,#5b21b6)",
                      color: "#fff",
                      fontSize: "7px",
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      padding: "2px 5px",
                      borderRadius: "999px",
                      whiteSpace: "nowrap",
                      pointerEvents: "none",
                    }}>
                      Soon
                    </span>
                  )}
                  <tab.icon size={24} strokeWidth={activeTab === tab.id ? 2.5 : 1.5} />
                  <span className="text-[9px] font-black uppercase tracking-[0.1em]">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>,
        document.body
      )}
    </>
  );
};

export default Navbar;
