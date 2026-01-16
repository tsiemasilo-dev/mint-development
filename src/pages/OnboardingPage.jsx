import React from "react";

const OnboardingPage = ({ onGetStarted }) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 py-16">
      <div className="max-w-lg text-center space-y-6">
        <h1 className="text-4xl font-semibold text-slate-900">Welcome</h1>
        <p className="text-lg text-slate-600">
          We would like to get to know you so we can personalize your Mint
          experience.
        </p>
        <button
          type="button"
          onClick={onGetStarted}
          className="inline-flex items-center justify-center rounded-full bg-slate-900 px-8 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5"
        >
          Get started
        </button>
      </div>
    </div>
  );
};

export default OnboardingPage;
