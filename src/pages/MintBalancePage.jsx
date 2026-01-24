import React from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import MintBalanceCard from "../components/MintBalanceCard";
import { formatZar } from "../lib/formatCurrency";

const MintBalancePage = ({ onBack, onOpenInvestments, onOpenCredit, onOpenActivity }) => {
  const balanceAmount = 24806.03;
  const breakdownItems = [
    {
      label: "Investments",
      amount: 14680,
      changeText: "+R180 today",
      description: "Based on your connected broker portfolios",
      onPress: onOpenInvestments,
    },
    {
      label: "Available credit",
      amount: 10126.03,
      description: "What you can access right now",
      onPress: onOpenCredit,
    },
  ];

  const recentChanges = [
    { title: "Investment gain", date: "Today", amount: "+R120" },
    { title: "Loan repayment", date: "Yesterday", amount: "-R300" },
    { title: "Investment deposit", date: "18 Apr", amount: "+R500" },
    { title: "Investment gain", date: "16 Apr", amount: "+R80" },
    { title: "Loan repayment", date: "14 Apr", amount: "-R250" },
  ];

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
            amount={balanceAmount}
            changeText="+R320 today"
            updatedAt={new Date()}
            isInteractive={false}
            showVisibilityToggle={false}
            showBreakdownHint={false}
          />
        </div>
      </div>

      <div className="mx-auto -mt-10 flex w-full max-w-sm flex-col gap-6 px-4 pb-10 md:max-w-md md:px-8">
        <section className="rounded-3xl bg-white px-5 py-5 shadow-md">
          <h2 className="text-sm font-semibold text-slate-900">What makes up your Mint Balance</h2>
          <div className="mt-4 flex flex-col gap-3">
            {breakdownItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.onPress}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-white/90 px-4 py-3 text-left shadow-sm"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-slate-900">{item.label}</span>
                  <span className="text-xs text-slate-500">{item.description}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatZar(item.amount)}
                    </p>
                    {item.changeText ? (
                      <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                        {item.changeText}
                      </span>
                    ) : null}
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white px-5 py-5 shadow-md">
          <h2 className="text-sm font-semibold text-slate-900">Recent balance changes</h2>
          <div className="mt-4 flex flex-col gap-3">
            {recentChanges.slice(0, 5).map((item) => (
              <div
                key={`${item.title}-${item.date}-${item.amount}`}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white/90 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.date}</p>
                </div>
                <p className="text-sm font-semibold text-slate-600">{item.amount}</p>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={onOpenActivity}
            className="mt-4 flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-white/90 px-4 py-3 text-sm font-semibold text-slate-700"
          >
            View full activity
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>
        </section>

        <section className="rounded-2xl bg-slate-100 px-4 py-4 text-xs text-slate-600">
          <p>
            Your Mint Balance is a combined view of your investments and available credit.
            Values update as your portfolio and credit status change.
          </p>
          <p className="mt-2 text-[11px] text-slate-500">Powered by partnered financial providers</p>
        </section>
      </div>
    </div>
  );
};

export default MintBalancePage;
