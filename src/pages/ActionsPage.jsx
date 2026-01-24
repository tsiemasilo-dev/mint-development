import React from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import ActionsSkeleton from "../components/ActionsSkeleton";

const ActionsPage = ({ onBack, isLoading = false }) => {
  if (isLoading) {
    return <ActionsSkeleton />;
  }
  const actions = [
    {
      id: "identity",
      title: "Complete identity check",
      description: "Needed to unlock higher limits",
      status: "Required",
    },
    {
      id: "bank-link",
      title: "Link your primary bank",
      description: "Connect to enable instant transfers",
      status: "Pending",
    },
    {
      id: "investments",
      title: "Review investment allocation",
      description: "Confirm your latest risk profile",
      status: "Pending",
    },
    {
      id: "credit",
      title: "Confirm credit preferences",
      description: "Set your preferred repayment day",
      status: "Required",
    },
  ];

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
          <h1 className="text-lg font-semibold">Actions</h1>
        </header>

        <section className="rounded-3xl bg-white px-5 py-5 shadow-sm ring-1 ring-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Outstanding actions</h2>
          <div className="mt-4 flex flex-col gap-3">
            {actions.map((action) => (
              <div
                key={action.id}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white/90 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{action.title}</p>
                  <p className="text-xs text-slate-500">{action.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                    {action.status}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ActionsPage;
