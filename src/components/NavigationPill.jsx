import React from "react";

const NavigationPill = ({ activeTab = "credit", onTabChange, className = "", theme = "dark" }) => {
  const isLight = theme === "light";
  const tabs = [
    { id: "home", label: "Wealth" },
    { id: "credit", label: "Credit" },
  ];

  return (
    <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 ${className}`}>
      <div className={`flex gap-1.5 rounded-2xl p-1 backdrop-blur-sm ring-1 ${
        isLight
          ? "bg-slate-900/8 ring-slate-900/10"
          : "bg-black/20 ring-white/10"
      }`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              disabled={tab.disabled}
              onClick={() => !tab.disabled && onTabChange?.(tab.id)}
              className={`
                relative rounded-xl px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-all duration-200
                ${isActive
                  ? (isLight
                      ? "bg-slate-900 text-white shadow-[0_2px_8px_rgba(0,0,0,0.18)]"
                      : "bg-white text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.18)]")
                  : (isLight
                      ? "text-slate-500 hover:text-slate-800"
                      : "text-white/60 hover:text-white/85")
                }
                ${tab.disabled ? "cursor-default opacity-40" : ""}
                outline-none tap-highlight-transparent
              `}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default NavigationPill;
