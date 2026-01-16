import React from "react";

const features = [
  {
    title: "Send money",
    description: "Move funds quickly to anyone.",
  },
  {
    title: "Manage savings",
    description: "Track goals and grow balances.",
  },
  {
    title: "Pay bills",
    description: "Settle utilities in one place.",
  },
];

const OnboardingPage = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-white">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
        <div className="order-2 flex flex-col px-6 pb-16 pt-10 lg:order-1 lg:px-16 lg:pt-12">
          <div className="flex items-center justify-between">
            <img src="/assets/mint-logo.svg" alt="Mint logo" className="h-6 w-auto" />
            <button
              type="button"
              aria-label="Close"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M6 6l12 12M6 18L18 6" />
              </svg>
            </button>
          </div>

          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center space-y-8 pt-10 lg:pt-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
              <img src="/assets/mint-logo.svg" alt="Mint mark" className="h-5 w-5" />
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl font-semibold text-slate-900 sm:text-5xl">Welcome to Mint</h1>
              <p className="text-lg text-slate-600">
                Let’s get your account ready in a few minutes.
              </p>
            </div>

            <div className="space-y-4">
              <button
                type="button"
                onClick={onGetStarted}
                className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 sm:w-auto"
              >
                Continue
              </button>
              <p className="text-sm text-slate-500">
                Already have an account? <span className="text-slate-900">Log in</span>
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs uppercase tracking-[0.3em] text-slate-300">
              <span className="h-px flex-1 bg-slate-200" />
              Or
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="space-y-4">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.6"
                          d="M4 12h16M12 4v16"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{feature.title}</p>
                      <p className="text-xs text-slate-500">{feature.description}</p>
                    </div>
                  </div>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M9 6l6 6-6 6" />
                    </svg>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <div className="relative h-[38vh] w-full overflow-hidden rounded-b-[3rem] lg:h-full lg:rounded-none">
            <img
              src="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80"
              alt="Person using a phone"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
