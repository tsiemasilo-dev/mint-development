import React from "react";

const CreditActionGrid = ({ actions }) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={action.onClick}
          className="flex items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 px-3 py-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
};

export default CreditActionGrid;
