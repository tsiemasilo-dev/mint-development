import React from "react";
import { ChevronRight, Layers, LineChart } from "lucide-react";

const investItems = [
  {
    id: "open-strategies",
    title: "OpenStrategies",
    description: "Explore active strategies ready to join.",
    icon: Layers,
  },
  {
    id: "markets",
    title: "Markets",
    description: "Track market trends and opportunities.",
    icon: LineChart,
  },
];

const InvestPage = () => (
  <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
    <div className="mx-auto flex w-full max-w-sm flex-col px-4 pb-10 pt-12 md:max-w-md md:px-8">
      <header className="flex items-center justify-between">
        <div className="h-10 w-10" aria-hidden="true" />
        <h1 className="text-lg font-semibold">Invest</h1>
        <div className="h-10 w-10" aria-hidden="true" />
      </header>

      <div className="mt-6 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Outstanding
        </p>
        {investItems.map((item) => (
          <div key={item.id} className="flex gap-3 rounded-3xl bg-white p-4 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 text-violet-700">
              {item.icon ? <item.icon className="h-5 w-5" /> : null}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </div>
              <p className="text-xs text-slate-500">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default InvestPage;
