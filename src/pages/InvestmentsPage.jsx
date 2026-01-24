import React from "react";
import { Bell } from "lucide-react";
import { useProfile } from "../lib/useProfile";
import InvestmentsSkeleton from "../components/InvestmentsSkeleton";

const InvestmentsPage = ({ onOpenNotifications }) => {
  const { profile, loading } = useProfile();
  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  if (loading) {
    return <InvestmentsSkeleton />;
  }

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
            <button
              aria-label="Notifications"
              type="button"
              onClick={onOpenNotifications}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white backdrop-blur-md"
            >
              <Bell className="h-5 w-5" />
            </button>
          </header>

          <section className="rounded-3xl bg-white/10 p-5 text-white shadow-sm backdrop-blur">
            <p className="text-xs uppercase tracking-[0.2em] text-white/70">Total Investments</p>
            <p className="mt-3 text-3xl font-semibold">R128,450</p>
            <div className="mt-4 inline-flex items-center rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-100">
              +8.4% this month
            </div>
          </section>
        </div>
      </div>

      <div className="mx-auto -mt-10 flex w-full max-w-sm flex-col gap-5 px-4 pb-10 md:max-w-md md:px-8">
        <section className="rounded-3xl bg-white px-4 py-5 shadow-md">
          <p className="text-sm font-semibold text-slate-700">Portfolio Mix</p>
          <p className="mt-1 text-xs text-slate-400">Balanced across major assets.</p>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            {[
              { label: "Equities", value: "48%" },
              { label: "Fixed income", value: "32%" },
              { label: "Crypto", value: "12%" },
              { label: "Cash", value: "8%" },
            ].map((item) => (
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
            {[
              { label: "Emergency Fund", value: "R45,000", progress: "65%" },
              { label: "Home Deposit", value: "R210,000", progress: "34%" },
            ].map((goal) => (
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
      </div>
    </div>
  );
};

export default InvestmentsPage;
