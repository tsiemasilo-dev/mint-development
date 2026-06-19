import React, { useState } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { supabase } from "../lib/supabase";

const PaymentCancelledPage = ({ onBack, isError = false }) => {
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState("");

  let pending = null;
  try {
    const raw = sessionStorage.getItem("ozow_pending");
    if (raw) pending = JSON.parse(raw);
  } catch {}

  const handleRetry = async () => {
    if (!pending || retrying) return;
    setRetrying(true);
    setRetryError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      const baseUrl = window.location.origin;
      const resp = await fetch("/api/ozow/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: pending.amount,
          strategyName: pending.strategyName || "Investment",
          strategyId: pending.strategyId || null,
          userId: user?.id || null,
          userEmail: user?.email || null,
          successUrl: `${baseUrl}/?ozow=success`,
          cancelUrl: `${baseUrl}/?ozow=cancel`,
          errorUrl: `${baseUrl}/?ozow=error`,
        }),
      });
      const data = await resp.json();
      if (data.success && data.action_url) {
        sessionStorage.setItem("ozow_pending", JSON.stringify({
          transactionRef: data.TransactionReference,
          strategyId: pending.strategyId || null,
          amount: pending.amount,
          strategyName: pending.strategyName || "",
        }));
        const form = document.createElement("form");
        form.method = "POST";
        form.action = data.action_url;
        Object.entries(data).forEach(([key, value]) => {
          if (["success", "action_url"].includes(key)) return;
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = value;
          form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
      } else {
        setRetryError(data.error || "Failed to initiate payment. Please try again.");
        setRetrying(false);
      }
    } catch {
      setRetryError("Could not connect to Ozow. Please check your connection.");
      setRetrying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-slate-100 p-8 text-center">
        <div className="flex justify-center mb-2" style={{ height: 160 }}>
          <DotLottieReact
            src="https://lottie.host/b6a7114d-33c4-4e34-ad32-6414f46dbfbd/CoInDc7qSX.json"
            loop
            autoplay
            style={{ width: 160, height: 160 }}
          />
        </div>

        <h1 className="text-xl font-semibold text-slate-900 mb-2">
          {isError ? "Payment Failed" : "Payment Cancelled"}
        </h1>

        <p className="text-sm text-slate-500 mb-1">
          {pending?.strategyName
            ? `Your payment for ${pending.strategyName} was not completed.`
            : isError
            ? "Something went wrong with your payment."
            : "Your payment was not completed."}
        </p>
        <p className="text-sm text-slate-400 mb-6">
          No charges were made to your account.
        </p>

        {retryError && (
          <p className="text-xs text-rose-500 mb-4 px-2">{retryError}</p>
        )}

        {pending && (
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            className="w-full rounded-2xl bg-gradient-to-r from-[#5b21b6] to-[#7c3aed] py-3.5 text-sm font-semibold text-white shadow-lg mb-3 disabled:opacity-70 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            {retrying ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Connecting to Ozow...
              </>
            ) : (
              "Try Ozow Again"
            )}
          </button>
        )}

        <button
          type="button"
          onClick={onBack}
          className="w-full rounded-2xl border border-slate-200 py-3.5 text-sm font-medium text-slate-600 transition-all active:scale-95"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default PaymentCancelledPage;
