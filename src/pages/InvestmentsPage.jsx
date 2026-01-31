import React from "react";
import { TrendingUp } from "lucide-react";
import { useProfile } from "../lib/useProfile";
import { useInvestments } from "../lib/useFinancialData";
import InvestmentsSkeleton from "../components/InvestmentsSkeleton";
import NotificationBell from "../components/NotificationBell";

const InvestmentsPage = ({ onOpenNotifications, onOpenInvest }) => {
  const { profile, loading } = useProfile();
  const { 
    totalInvestments, 
    monthlyChangePercent, 
    portfolioMix, 
    goals, 
    hasInvestments,
    loading: investmentsLoading 
  } = useInvestments();
  
  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  if (loading || investmentsLoading) {
    return <InvestmentsSkeleton />;
  }

  const defaultPortfolioMix = [
    { label: "Equities", value: "0%" },
    { label: "Fixed income", value: "0%" },
    { label: "Crypto", value: "0%" },
    { label: "Cash", value: "0%" },
  ];

  const displayPortfolioMix = portfolioMix.length > 0 ? portfolioMix : defaultPortfolioMix;

  return (
    <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
      <div className="rounded-b-[36px] bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 pb-12 pt-12 text-white md:px-8">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-6 md:max-w-md">
          <header className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={displayName || "Profile"}
                  className="h-10 w-10 rounded-full border border-white/40 object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xs font-semibold text-slate-700">
                  {initials || "—"}
                </div>
              )}
            </div>
            <NotificationBell onClick={onOpenNotifications} />
          </header>

          <section className="glass-card p-5 text-white">
            <p className="text-xs uppercase tracking-[0.2em] text-white/70">Total Investments</p>
            <p className="mt-3 text-3xl font-semibold">
              R{totalInvestments.toLocaleString()}
            </p>
            {hasInvestments && monthlyChangePercent !== 0 && (
              <div className={`mt-4 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                monthlyChangePercent >= 0 
                  ? 'bg-emerald-400/20 text-emerald-100' 
                  : 'bg-rose-400/20 text-rose-100'
              }`}>
                {monthlyChangePercent >= 0 ? '+' : ''}{monthlyChangePercent.toFixed(1)}% this month
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="mx-auto -mt-10 flex w-full max-w-sm flex-col gap-5 px-4 pb-10 md:max-w-md md:px-8">
        {!hasInvestments ? (
          <section className="rounded-3xl bg-white px-4 py-8 shadow-md text-center">
            <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-violet-50 text-violet-600 mb-5">
              <TrendingUp className="h-10 w-10" />
            </div>
            <p className="text-lg font-semibold text-slate-900 mb-2">Start Your Investment Journey</p>
            <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto">
              Build wealth over time by investing in a diversified portfolio tailored to your goals.
            </p>
            <button
              type="button"
              onClick={onOpenInvest}
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5"
            >
              Make your first investment
            </button>
          </section>
        ) : (
          <>
            <section className="rounded-3xl bg-white px-4 py-5 shadow-md">
              <p className="text-sm font-semibold text-slate-700">Portfolio Mix</p>
              <p className="mt-1 text-xs text-slate-400">
                {hasInvestments ? "Balanced across major assets." : "Start investing to see your portfolio mix."}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                {displayPortfolioMix.map((item) => (
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
                {goals.length > 0 ? (
                  goals.map((goal) => (
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
                  ))
                ) : (
                  <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center">
                    <p className="text-xs text-slate-500">No investment goals set</p>
                    <p className="text-xs text-slate-400 mt-1">Set goals to track your progress</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default InvestmentsPage;
