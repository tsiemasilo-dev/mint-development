import React from "react";
import { TrendingUp } from "lucide-react";

const MOCK_DATA = {
  totalInvestments: 125750,
  monthlyChangePercent: 2.8,
  portfolioMix: [
    { label: "Equities", value: "45%" },
    { label: "Fixed Income", value: "25%" },
    { label: "Crypto", value: "15%" },
    { label: "Cash", value: "15%" },
  ],
  goals: [
    {
      label: "Emergency Fund",
      value: "Target R50,000 • Dec 2025",
      progress: "72%",
    },
    {
      label: "First Home",
      value: "Target R500,000 • Jun 2028",
      progress: "18%",
    },
  ],
  holdings: [
    { id: 1, symbol: "NPN", name: "Naspers", value: 38500, change: 10.0 },
    { id: 2, symbol: "SOL", name: "Sasol", value: 21200, change: -3.6 },
    { id: 3, symbol: "BTC", name: "Bitcoin", value: 22100, change: 17.9 },
    { id: 4, symbol: "SBK", name: "Standard Bank", value: 16200, change: 8.0 },
  ],
};

const NewPortfolioPage = () => {
  const {
    totalInvestments,
    monthlyChangePercent,
    portfolioMix,
    goals,
    holdings,
  } = MOCK_DATA;

  return (
    <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
      <div className="rounded-b-[36px] bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 pb-12 pt-12 text-white md:px-8">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-6 md:max-w-md">
          <header className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xs font-semibold text-slate-700">
                JD
              </div>
            </div>
            <div className="h-10 w-10 rounded-full bg-white/10" />
          </header>

          <section className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-white/70">Total Investments</p>
            <p className="mt-3 text-3xl font-semibold">
              R{totalInvestments.toLocaleString()}
            </p>
            <div className="mt-4 inline-flex items-center rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-100">
              +{monthlyChangePercent.toFixed(1)}% this month
            </div>
          </section>
        </div>
      </div>

      <div className="mx-auto -mt-10 flex w-full max-w-sm flex-col gap-5 px-4 pb-10 md:max-w-md md:px-8">
        <section className="rounded-3xl bg-white px-4 py-5 shadow-md">
          <p className="text-sm font-semibold text-slate-700">Portfolio Mix</p>
          <p className="mt-1 text-xs text-slate-400">Balanced across major assets.</p>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            {portfolioMix.map((item) => (
              <div key={item.label} className="rounded-2xl bg-slate-50 px-3 py-4">
                <p className="text-xs text-slate-400">{item.label}</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white px-4 py-5 shadow-md">
          <p className="text-sm font-semibold text-slate-700">Investment Goals</p>
          <p className="mt-1 text-xs text-slate-400">Track progress for your next milestone.</p>
          <div className="mt-4 space-y-4">
            {goals.map((goal) => (
              <div key={goal.label} className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                  <span>{goal.label}</span>
                  <span>{goal.progress}</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">{goal.value}</p>
                <div className="mt-3 h-2 w-full rounded-full bg-slate-200">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-emerald-300"
                    style={{ width: goal.progress }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white px-4 py-5 shadow-md">
          <p className="text-sm font-semibold text-slate-700">Your Holdings</p>
          <p className="mt-1 text-xs text-slate-400">Current positions in your portfolio.</p>
          <div className="mt-4 space-y-3">
            {holdings.map((holding) => (
              <div
                key={holding.id}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xs font-bold text-slate-600 shadow-sm">
                    {holding.symbol.slice(0, 3)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{holding.symbol}</p>
                    <p className="text-xs text-slate-500">{holding.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    R{holding.value.toLocaleString()}
                  </p>
                  <p className={`text-xs font-semibold ${holding.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {holding.change >= 0 ? '+' : ''}{holding.change.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default NewPortfolioPage;
