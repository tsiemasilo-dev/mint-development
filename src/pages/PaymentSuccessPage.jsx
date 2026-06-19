import React from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

const PaymentSuccessPage = ({ onDone, strategyName }) => (
  <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
    <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-slate-100 p-8 text-center">
      <div className="flex justify-center mb-2" style={{ height: 160 }}>
        <DotLottieReact
          src="https://lottie.host/12e67a6d-3162-4c7d-a533-95c4c66e801b/Qatm3tqUj4.lottie"
          loop
          autoplay
          style={{ width: 160, height: 160 }}
        />
      </div>

      <h1 className="text-xl font-semibold text-slate-900 mb-2">
        Purchase Successful!
      </h1>

      <p className="text-sm text-slate-500 mb-1">
        {strategyName
          ? `Your investment in ${strategyName} is being processed.`
          : "Your investment is being processed."}
      </p>
      <p className="text-sm text-slate-400 mb-6">
        We'll notify you once it's confirmed.
      </p>

      <button
        type="button"
        onClick={onDone}
        className="w-full rounded-2xl bg-gradient-to-r from-[#5b21b6] to-[#7c3aed] py-3.5 text-sm font-semibold text-white shadow-lg transition-all active:scale-95"
      >
        Back to Home
      </button>
    </div>
  </div>
);

export default PaymentSuccessPage;
