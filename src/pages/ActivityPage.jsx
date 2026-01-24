import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import ActivitySkeleton from "../components/ActivitySkeleton";

const filters = ["All", "Investments", "Loans"];

const ActivityPage = ({ onBack, isLoading = false }) => {
  if (isLoading) {
    return <ActivitySkeleton />;
  }
  const [activeFilter, setActiveFilter] = useState("All");
  const activityItems = [
    { title: "Investment gain", date: "Today", amount: "+R120", type: "Investments" },
    { title: "Loan repayment", date: "Yesterday", amount: "-R300", type: "Loans" },
    { title: "Investment deposit", date: "18 Apr", amount: "+R500", type: "Investments" },
    { title: "Loan repayment", date: "16 Apr", amount: "-R250", type: "Loans" },
    { title: "Investment gain", date: "14 Apr", amount: "+R80", type: "Investments" },
    { title: "Loan repayment", date: "12 Apr", amount: "-R200", type: "Loans" },
  ];

  const visibleItems =
    activeFilter === "All"
      ? activityItems
      : activityItems.filter((item) => item.type === activeFilter);

  return (
    <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
      <div className="mx-auto flex w-full max-w-sm flex-col px-4 pb-10 pt-12 md:max-w-md md:px-8">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">Activity</h1>
          <span className="h-10 w-10" aria-hidden="true" />
        </header>

        <div className="mt-6 flex gap-2 rounded-full bg-white p-1 shadow-sm">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold ${
                activeFilter === filter
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        <section className="mt-6 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Previously
          </p>
          {visibleItems.map((item) => (
            <div
              key={`${item.title}-${item.date}-${item.amount}`}
              className="flex gap-3 rounded-3xl bg-white p-4 shadow-sm"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                {item.type.slice(0, 1)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                  <div className="text-xs text-slate-400">{item.date}</div>
                </div>
                <p className="text-xs text-slate-500">{item.type}</p>
              </div>
              <p className="text-sm font-semibold text-slate-600">{item.amount}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};

export default ActivityPage;
