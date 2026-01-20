import React, { useState } from "react";
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

  const tabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "credit", label: "Credit", icon: CreditCard },
    { id: "transact", label: "Transact", icon: Plus, isCenter: true },
    { id: "investments", label: "Investments", icon: PieChart },
    { id: "more", label: "More", icon: MoreHorizontal },
  ];

  const transactActions = [
    { label: "Deposit", icon: ArrowDownCircle, angle: -180 },
    { label: "Pay loan", icon: Wallet, angle: -135 },
    { id: "invest", label: "Invest", icon: TrendingUp, angle: -90 },
    { label: "Credit", icon: Zap, angle: -45 },
    { label: "Rewards", icon: Gift, angle: 0 },
  ];

  const radius = 145; 

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[8px]"
          />
        )}
      </AnimatePresence>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/70 border-t border-white/20 pb-5 pt-2 backdrop-blur-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
        <div className="mx-auto flex max-w-lg items-center justify-around relative px-4">
          
          <AnimatePresence>
            {isOpen && (
              <motion.div
                /* LOGIC: Always rotate clockwise.
                   Initial: -180 (Enter from left)
                   Animate: 0 (Resting position)
                   Exit: 180 (Exit to right, completing the clockwise circle)
                */
                initial={{ rotate: -180, opacity: 0, scale: 0.8 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 180, opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 100, damping: 22 }}
                className="absolute left-1/2 bottom-10 h-0 w-0 flex items-center justify-center"
              >
                {transactActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => {
                      if(action.id === "invest") setActiveTab("investments");
                      setIsOpen(false);
                    }}
                    className="absolute flex items-center justify-center group"
                    style={{
                      transform: `translate(${Math.cos(action.angle * (Math.PI / 180)) * radius}px, ${Math.sin(action.angle * (Math.PI / 180)) * radius}px)`
                    }}
                  >
                    <div className="glass flex h-20 w-20 flex-col items-center justify-center gap-1.5 border border-white/40 bg-white/30 shadow-2xl transition-all duration-300 group-active:scale-95 group-hover:bg-white/50">
                      <motion.div
                        /* Counter-rotation: We must invert the parent's rotation 
                           so icons stay upright during the entire clockwise spin.
                        */
                        initial={{ rotate: 180 }}
                        animate={{ rotate: 0 }}
                        exit={{ rotate: -180 }}
                        transition={{ type: "spring", stiffness: 100, damping: 22 }}
                        className="flex flex-col items-center"
                      >
                        <action.icon size={22} strokeWidth={1.2} className="text-slate-800" />
                        <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-700">
                          {action.label}
                        </span>
                      </motion.div>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {tabs.map((tab) => {
            if (tab.isCenter) {
              return (
                <button
                  key={tab.id}
                  onClick={() => setIsOpen(!isOpen)}
                  className="relative -top-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-xl transition-all active:scale-90"
                >
                  <motion.div animate={{ rotate: isOpen ? 135 : 0 }}>
                    <Plus size={28} strokeWidth={1.5} />
                  </motion.div>
                </button>
              );
            }

            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setIsOpen(false); }}
                className={`flex flex-col items-center gap-1 transition-all duration-300 ${
                  isActive ? "text-indigo-600 scale-110" : "text-slate-400 opacity-60"
                }`}
              >
                <tab.icon size={20} strokeWidth={isActive ? 1.8 : 1.2} />
                <span className="text-[8px] font-black uppercase tracking-[0.1em]">
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