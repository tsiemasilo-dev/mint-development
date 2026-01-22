import React from "react";

const UserOnboardingPage = ({ onComplete }) => {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-slate-900">Onboarding Page</h1>
        <p className="mt-4 text-slate-600">Welcome! Your account has been created.</p>
        {onComplete && (
          <button
            onClick={onComplete}
            className="mt-8 inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
};

export default UserOnboardingPage;
