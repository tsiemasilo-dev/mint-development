import React from "react";
import { motion } from "framer-motion";

const NavigationPill = ({ activeTab = "credit", onTabChange, className = "", theme = "dark" }) => {
  const isLight = theme === "light";
  const tabs = [
    { id: "home", label: "Wealth" },
    { id: "credit", label: "Credit" },
  ];

  const handleTabClick = (tabId) => {
    onTabChange?.(tabId);
  };

  return (
    <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 ${className}`}>
      <div className={`flex items-center rounded-full p-1 backdrop-blur-md border relative ${isLight ? "bg-slate-100/50 border-slate-200" : "bg-white/10 border-white/10"}`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              disabled={tab.disabled}
              onClick={() => !tab.disabled && handleTabClick(tab.id)}
              className={`
                relative rounded-full px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors duration-300
                ${isActive ? (isLight ? "text-white" : "text-slate-900") : (isLight ? "text-slate-500" : "text-white/70")}
                ${tab.disabled ? (isLight ? "text-slate-300 cursor-default" : "text-white/30 cursor-default") : (!isActive ? (isLight ? "hover:text-slate-900" : "hover:text-white") : "")}
                outline-none tap-highlight-transparent
              `}
            >
              {isActive && (
                <motion.div
                  key={tab.id}
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className={`absolute inset-0 rounded-full shadow-sm z-0 ${isLight ? "bg-slate-900" : "bg-white"}`}
                />
              )}

              <span className="relative z-10">{tab.label}</span>

            </button>
          );
        })}
      </div>
    </div>
  );
};

export default NavigationPill;
