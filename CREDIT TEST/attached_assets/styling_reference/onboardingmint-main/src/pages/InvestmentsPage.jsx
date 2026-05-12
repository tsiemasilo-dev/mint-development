import React, { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { useProfile } from "../lib/useProfile";
import { useInvestments } from "../lib/useFinancialData";
import { supabase } from "../lib/supabase";
import InvestmentsSkeleton from "../components/InvestmentsSkeleton";
import NotificationBell from "../components/NotificationBell";

const InvestmentsPage = ({ onOpenNotifications, onOpenInvest }) => {
  const { profile, loading } = useProfile();
  const investmentSummary = null;
  const portfolioMix = [];
  const investmentGoals = [];
  const hasInvestmentData = Boolean(investmentSummary?.total);
  const hasMonthlyChange = Number.isFinite(investmentSummary?.monthlyChange);
  const hasPortfolioMix = portfolioMix.length > 0;
  const hasInvestmentGoals = investmentGoals.length > 0;
  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    let isMounted = true;

    const loadAllocations = async () => {
      try {
        if (!supabase) {
          return;
        }

        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) {
          return;
        }

        const { data, error: allocationsError } = await supabase
          .from("allocations")
          .select("id, asset_class, weight, value, as_of_date")
          .eq("user_id", userData.user.id)
          .order("as_of_date", { ascending: false });

        if (isMounted && !allocationsError) {
          setAllocations(data || []);
        }
      } catch (error) {
        console.error("Failed to load allocations", error);
      }
    };

    loadAllocations();

    return () => {
      isMounted = false;
    };
  }, []);

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
  const hasAllocations = allocations.length > 0;
  const displayGoals = [...goals, ...customGoals];
  const handleAddGoal = (event) => {
    event.preventDefault();
    if (!goalName || !goalTarget || !goalDate) return;
    const formattedTarget = `Target R${Number(goalTarget).toLocaleString()}`;
    const formattedDate = new Date(goalDate).toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    setCustomGoals((prev) => [
      ...prev,
      {
        label: goalName,
        progress: "0%",
        value: `${formattedTarget} • ${formattedDate}`,
      },
    ]);
    setGoalName("");
    setGoalTarget("");
    setGoalDate("");
  };

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
            {hasInvestmentData ? (
              <p className="mt-3 text-3xl font-semibold">{investmentSummary.total}</p>
            ) : (
              <p className="mt-3 text-sm text-white/80">
                Start investing to unlock your portfolio balance and performance insights.
              </p>
            )}
            {hasInvestmentData && hasMonthlyChange && (
              <div className="mt-4 inline-flex items-center rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-100">
                {investmentSummary.monthlyChange}
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="mx-auto -mt-10 flex w-full max-w-sm flex-col gap-5 px-4 pb-10 md:max-w-md md:px-8">
        <section className="rounded-3xl bg-white px-4 py-5 shadow-md">
          <p className="text-sm font-semibold text-slate-700">Portfolio Mix</p>
          <p className="mt-1 text-xs text-slate-400">Balanced across major assets.</p>
          {hasPortfolioMix ? (
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              {portfolioMix.map((item) => (
                <div key={item.label} className="rounded-2xl bg-slate-50 px-3 py-4">
                  <p className="text-xs text-slate-400">{item.label}</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              Your portfolio allocation will appear here once you make your first investment.
            </p>
          )}
        </section>

        <section className="rounded-3xl bg-white px-4 py-5 shadow-md">
          <p className="text-sm font-semibold text-slate-700">Investment Goals</p>
          <p className="mt-1 text-xs text-slate-400">Track progress for your next milestone.</p>
          {hasInvestmentGoals ? (
            <div className="mt-4 space-y-4">
              {investmentGoals.map((goal) => (
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
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              Once you start investing, we’ll help you set goals and track progress here.
            </p>
          )}
        </section>
      </div>
    </div>
  );
};

export default InvestmentsPage;
