import React, { useEffect, useState } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

const SUCCESS_LOTTIE = "https://lottie.host/12e67a6d-3162-4c7d-a533-95c4c66e801b/Qatm3tqUj4.lottie";
const PENDING_LOTTIE = "https://lottie.host/203cd577-a8f7-431d-9a46-3c21646ac976/HTfOgovXbh.json";

const PaymentSuccessPage = ({ onDone, strategyName }) => {
  const [phase, setPhase] = useState("success");

  useEffect(() => {
    const timer = setTimeout(() => setPhase("pending"), 2800);
    return () => clearTimeout(timer);
  }, []);

  const isPending = phase === "pending";

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "#f8fafc" }}
    >
      <div
        className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-slate-100 p-8 text-center"
        style={{ minHeight: 360 }}
      >
        {/* Lottie — both are always mounted; we toggle visibility to avoid re-mount flicker */}
        <div style={{ position: "relative", width: 160, height: 160, margin: "0 auto 8px" }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: isPending ? 0 : 1,
              transition: "opacity 0.4s ease",
              pointerEvents: isPending ? "none" : "auto",
            }}
          >
            <DotLottieReact
              src={SUCCESS_LOTTIE}
              loop
              autoplay
              style={{ width: 160, height: 160 }}
            />
          </div>
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: isPending ? 1 : 0,
              transition: "opacity 0.4s ease",
              pointerEvents: isPending ? "auto" : "none",
            }}
          >
            <DotLottieReact
              src={PENDING_LOTTIE}
              loop
              autoplay
              style={{ width: 160, height: 160 }}
            />
          </div>
        </div>

        {/* Text content */}
        <div
          style={{
            transition: "opacity 0.35s ease, transform 0.35s ease",
            opacity: isPending ? 0 : 1,
            transform: isPending ? "translateY(-6px)" : "translateY(0)",
            position: isPending ? "absolute" : "relative",
            pointerEvents: isPending ? "none" : "auto",
            width: "100%",
          }}
        >
          <h1 className="text-xl font-semibold text-slate-900 mb-2">
            Purchase Successful!
          </h1>
          <p className="text-sm text-slate-500 mb-1">
            {strategyName
              ? `Your investment in ${strategyName} is confirmed.`
              : "Your investment is confirmed."}
          </p>
          <p className="text-sm text-slate-400">Placing your order now…</p>
        </div>

        <div
          style={{
            transition: "opacity 0.35s ease, transform 0.35s ease",
            opacity: isPending ? 1 : 0,
            transform: isPending ? "translateY(0)" : "translateY(6px)",
            pointerEvents: isPending ? "auto" : "none",
          }}
        >
          <h1 className="text-xl font-semibold text-slate-900 mb-2">
            Order Placed
          </h1>
          <p className="text-sm text-slate-500 mb-1">
            {strategyName
              ? `Your ${strategyName} order is pending settlement.`
              : "Your order is pending settlement."}
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
    </div>
  );
};

export default PaymentSuccessPage;
