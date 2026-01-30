import React from "react";
import { ArrowLeft, ChevronRight, TrendingUp } from "lucide-react";
import MintBalanceCard from "../components/MintBalanceCard";
import { formatZar } from "../lib/formatCurrency";
import { useMintBalance } from "../lib/useFinancialData";
import MintBalanceSkeleton from "../components/MintBalanceSkeleton";

const MintBalancePage = ({
  onBack,
  onOpenInvestments,
  onOpenCredit,
  onOpenActivity,
  onOpenInvest,
  onOpenCreditApply,
}) => {
  const {
    totalBalance,
    investments,
    availableCredit,
    dailyChange,
    recentChanges,
    loading,
  } = useMintBalance();

  if (loading) {
    return <MintBalanceSkeleton />;
  }

  const breakdownItems = [
    {
      label: "Investments",
      amount: investments,
      changeText: dailyChange !== 0 ? `${dailyChange >= 0 ? '+' : ''}R${Math.abs(dailyChange).toLocaleString()} today` : null,
      description: "Based on your connected broker portfolios",
      onPress: onOpenInvestments,
    },
    {
      label: "Available credit",
      amount: availableCredit,
      description: "What you can access right now",
      onPress: onOpenCredit,
    },
  ];

  const hasBalance = totalBalance > 0;
  const hasRecentChanges = recentChanges && recentChanges.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
      <div className="rounded-b-[36px] bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 pb-12 pt-12 text-white md:px-8">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-6 md:max-w-md">
          <header className="flex items-center gap-3 text-white">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white backdrop-blur-md"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold">Mint Balance</h1>
          </header>

          <MintBalanceCard
            amount={totalBalance}
            changeText={dailyChange !== 0 ? `${dailyChange >= 0 ? '+' : ''}R${Math.abs(dailyChange).toLocaleString()} today` : ""}
            updatedAt={new Date()}
            isInteractive={false}
            showBreakdownHint={false}
          />
        </div>
      </div>

      <div className="mx-auto -mt-10 flex w-full max-w-sm flex-col gap-6 px-4 pb-10 md:max-w-md md:px-8">
        <section className="rounded-3xl bg-white px-5 py-5 shadow-sm ring-1 ring-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">What makes up your Mint Balance</h2>
          
          {hasBalance ? (
            <div className="mt-4 flex flex-col gap-4">
              {breakdownItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onPress}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-white/90 px-4 py-4 text-left shadow-[0_6px_18px_rgba(15,23,42,0.06)]"
                >
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-slate-900">{item.label}</span>
                    <span className="mt-1.5 block text-xs text-slate-500">
                      {item.description}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="min-w-[110px] text-right tabular-nums">
                      <p className="text-sm font-semibold text-slate-900">
                        {formatZar(item.amount)}
                      </p>
                      {item.changeText ? (
                        <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                          {item.changeText}
                        </span>
                      ) : null}
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-6 text-center py-4">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-violet-50 text-violet-600 mb-4">
                <TrendingUp className="h-8 w-8" />
              </div>
              <p className="text-sm font-semibold text-slate-900 mb-1">Your balance is R0</p>
              <p className="text-xs text-slate-500 mb-4">Start investing or apply for credit to grow your Mint Balance</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onOpenInvest}
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5"
                >
                  Start investing
                </button>
                <button
                  type="button"
                  onClick={onOpenCreditApply}
                  className="inline-flex items-center justify-center rounded-full border border-slate-900 bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-900 shadow-sm transition hover:-translate-y-0.5"
                >
                  Apply for credit
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-white px-5 py-5 shadow-sm ring-1 ring-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Recent balance changes</h2>
          
          {hasRecentChanges ? (
            <>
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white/90">
                {recentChanges.slice(0, 5).map((item, index) => (
                  <div
                    key={`${item.title}-${item.date}-${index}`}
                    className="flex items-center justify-between px-4 py-3 text-sm text-slate-700 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-slate-100"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.date}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-600 tabular-nums">
                      {item.amount}
                    </p>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={onOpenActivity}
                className="mt-3 flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-white/90 px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_6px_18px_rgba(15,23,42,0.06)]"
              >
                View full activity
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            </>
          ) : (
            <div className="mt-4 text-center py-6">
              <p className="text-xs text-slate-500">No recent activity</p>
              <p className="text-xs text-slate-400 mt-1">Your balance changes will appear here</p>
            </div>
          )}
        </section>

      </div>
    </div>
  );
};

export default MintBalancePage;
