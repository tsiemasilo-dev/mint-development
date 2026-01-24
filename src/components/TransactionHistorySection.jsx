import React from "react";

const TransactionHistorySection = ({ items, onViewAll }) => {
  return (
    <section className="rounded-3xl bg-white px-5 py-5 shadow-md">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Transaction history</h2>
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-semibold text-slate-500"
        >
          View all
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {items && items.length > 0 ? (
          items.slice(0, 3).map((item) => (
            <div
              key={`${item.title}-${item.date}-${item.amount}`}
              className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white/90 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500">{item.date}</p>
              </div>
              <p className="text-sm font-semibold text-slate-600 tabular-nums">{item.amount}</p>
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-500">No activity yet</p>
        )}
      </div>
    </section>
  );
};

export default TransactionHistorySection;
