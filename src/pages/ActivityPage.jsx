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
    <div className="min-h-screen bg-slate-50 px-4 pb-[env(safe-area-inset-bottom)] pt-12 text-slate-900 md:px-8">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6 md:max-w-md">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">Activity</h1>
        </header>

        <div className="flex gap-2 rounded-full bg-white p-1 shadow-sm">
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

        <section className="flex flex-col gap-3">
          {visibleItems.map((item) => (
            <div
              key={`${item.title}-${item.date}-${item.amount}`}
              className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.date}</p>
                </div>
                <p className="text-sm font-semibold text-slate-600">{item.amount}</p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};

export default ActivityPage;
