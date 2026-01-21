import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home, 
  CreditCard, 
  Plus, 
  PieChart, 
  MoreHorizontal, 
  ArrowDownCircle, 
  Wallet, 
  TrendingUp, 
  Zap, 
  Gift 
} from "lucide-react";

const Navbar = ({ activeTab, setActiveTab }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [wheelCenter, setWheelCenter] = useState({ x: 0, y: 0 });
  const plusButtonRef = useRef(null);
  const navRef = useRef(null);

  const tabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "credit", label: "Credit", icon: CreditCard },
    { id: "transact", label: "Transact", icon: Plus, isCenter: true },
    { id: "investments", label: "Investments", icon: PieChart },
    { id: "more", label: "More", icon: MoreHorizontal },
  ];

  const transactActions = [
    { id: "deposit", label: "Deposit", icon: ArrowDownCircle },
    { id: "payLoan", label: "Pay loan", icon: Wallet },
    { id: "invest", label: "Invest", icon: TrendingUp },
    { id: "credit", label: "Credit", icon: Zap },
    { id: "rewards", label: "Rewards", icon: Gift },
  ];

  const getSafeAreaInsetBottom = () => {
    const probe = document.createElement("div");
    probe.style.position = "fixed";
    probe.style.bottom = "0";
    probe.style.height = "env(safe-area-inset-bottom)";
    probe.style.pointerEvents = "none";
    document.body.appendChild(probe);
    const height = parseFloat(window.getComputedStyle(probe).height) || 0;
    document.body.removeChild(probe);
    return height;
  };

  const updateWheelCenter = () => {
    const button = plusButtonRef.current;
    const nav = navRef.current;
    if (!button || !nav) {
      return;
    }
    const rect = button.getBoundingClientRect();
    setWheelCenter({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  };

  const radius = useMemo(() => {
    if (!wheelCenter.x || !wheelCenter.y) {
      return 0;
    }

    const width = window.innerWidth;
    const safeInsetBottom = getSafeAreaInsetBottom();
    const baseRadius = Math.min(Math.max(width * 0.56, 220), 300);
    const maxBottom = window.innerHeight - safeInsetBottom - 12;
    const bottomAngles = [210, 330];

    let adjustedRadius = baseRadius;
    bottomAngles.forEach((angle) => {
      const radians = angle * (Math.PI / 180);
      const sinValue = Math.sin(radians);
      if (sinValue < 0) {
        const limit = (maxBottom - wheelCenter.y) / Math.abs(sinValue);
        if (Number.isFinite(limit)) {
          adjustedRadius = Math.min(adjustedRadius, limit);
        }
      }
    });

    return Math.max(0, adjustedRadius);
  }, [wheelCenter]);

  const bubblePositions = useMemo(() => {
    if (!wheelCenter.x || !wheelCenter.y || !radius) {
      return [];
    }

    const angles = {
      deposit: 210,
      payLoan: 150,
      invest: 90,
      credit: 30,
      rewards: 330,
    };

    return transactActions.map((action) => {
      const angle = angles[action.id];
      const radians = angle * (Math.PI / 180);
      return {
        ...action,
        angle,
        x: wheelCenter.x + radius * Math.cos(radians),
        y: wheelCenter.y - radius * Math.sin(radians),
      };
    });
  }, [radius, transactActions, wheelCenter]);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    const rafId = requestAnimationFrame(updateWheelCenter);
    const handleResize = () => updateWheelCenter();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [isOpen]);

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[60] bg-black/10 backdrop-blur-[8px]"
            />
          )}
        </AnimatePresence>,
        document.body
      )}

      <nav
        ref={navRef}
        className={`fixed bottom-0 left-0 right-0 z-50 border-t border-white/20 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] ${
          isOpen ? "bg-white/80 backdrop-blur-3xl" : "bg-white/70 backdrop-blur-2xl"
        }`}
      >
        <div className="relative mx-auto flex w-full max-w-lg items-center justify-between px-4">
          
          {createPortal(
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 100, damping: 22 }}
                  className="fixed inset-0 z-[70] overflow-visible pointer-events-none"
                >
                  {bubblePositions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => {
                        if(action.id === "invest") setActiveTab("investments");
                        setIsOpen(false);
                      }}
                      className="fixed flex items-center justify-center group pointer-events-auto"
                      style={{
                        left: `${action.x}px`,
                        top: `${action.y}px`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <div className="glass flex h-20 w-20 flex-col items-center justify-center gap-1.5 border border-white/40 bg-white/30 shadow-2xl transition-all duration-300 group-active:scale-95 group-hover:bg-white/50">
                        <div className="flex flex-col items-center">
                          <action.icon size={22} strokeWidth={1.2} className="text-slate-800" />
                          <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-700">
                            {action.label}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>,
            document.body
          )}

          {tabs.map((tab) => {
            if (tab.isCenter) {
              return (
                <div key={tab.id} className="flex flex-1 items-center justify-center">
                  <button
                    ref={plusButtonRef}
                    onClick={() => {
                      const nextIsOpen = !isOpen;
                      setIsOpen(nextIsOpen);
                      if (!isOpen) {
                        requestAnimationFrame(updateWheelCenter);
                      }
                    }}
                    onFocus={updateWheelCenter}
                    onMouseEnter={updateWheelCenter}
                    className="relative z-50 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-xl transition-all active:scale-90"
                  >
                    <motion.div animate={{ rotate: isOpen ? 135 : 0 }}>
                      <Plus size={28} strokeWidth={1.5} />
                    </motion.div>
                  </button>
                </div>
              );
            }

            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setIsOpen(false); }}
                className={`flex flex-1 flex-col items-center justify-center gap-1 leading-none transition-all duration-300 ${
                  isActive ? "text-indigo-600 scale-110" : "text-slate-400 opacity-60"
                }`}
              >
                <tab.icon size={20} strokeWidth={isActive ? 1.8 : 1.2} />
                <span className="text-[8px] font-black uppercase tracking-[0.1em] leading-none">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default Navbar;
