import React, { useState } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { supabase } from "../lib/supabase";

const STATUS_CONFIG = {
  cancel: {
    src: "https://lottie.host/140d688d-535a-4e83-a337-6ef7272f847b/G1sOcOAtvL.json",
    title: "Payment Cancelled",
    body: "You cancelled the payment before it was completed.",
    sub: "No charges were made to your account.",
    canRetry: true,
  },
  error: {
    src: "https://lottie.host/00908e50-da90-4027-9d5a-3ad4174f589d/FyuUtG0DL6.json",
    title: "Payment Failed",
    body: "Something went wrong while processing your payment.",
    sub: "Please try again or contact support if the issue persists.",
    canRetry: true,
  },
  abandoned: {
    src: "https://lottie.host/00908e50-da90-4027-9d5a-3ad4174f589d/FyuUtG0DL6.json",
    title: "Payment Abandoned",
    body: "Your payment session expired before it was completed.",
    sub: "No charges were made. You can try again whenever you're ready.",
    canRetry: true,
  },
  pending: {
    src: "https://lottie.host/203cd577-a8f7-431d-9a46-3c21646ac976/HTfOgovXbh.json",
    title: "Payment Pending",
    body: "Your payment is being processed and will be confirmed shortly.",
    sub: "We'll notify you once the payment is verified.",
    canRetry: false,
  },
  pendinginvestigation: {
    src: "https://lottie.host/9d327ff1-2237-452e-be47-f28e052c79e4/CLUvfA74Ph.json",
    title: "Under Review",
    body: "Your payment has been flagged for additional verification.",
    sub: "Our team is reviewing it and will follow up with you via email.",
    canRetry: false,
  },
};

const PaymentCancelledPage = ({ onBack, status = "cancel" }) => {
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState("");

  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.cancel;

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
          abandonedUrl: `${baseUrl}/?ozow=abandoned`,
          notifyUrl: `${baseUrl}/api/ozow/notify`,
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
            src={config.src}
            loop
            autoplay
            style={{ width: 160, height: 160 }}
          />
        </div>

        <h1 className="text-xl font-semibold text-slate-900 mb-2">
          {config.title}
        </h1>

        <p className="text-sm text-slate-500 mb-1">
          {pending?.strategyName
            ? `${config.body.replace("Your payment", `Your payment for ${pending.strategyName}`)}`
            : config.body}
        </p>
        <p className="text-sm text-slate-400 mb-6">{config.sub}</p>

        {retryError && (
          <p className="text-xs text-rose-500 mb-4 px-2">{retryError}</p>
        )}

        {config.canRetry && pending && (
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
              "Try Again"
            )}
          </button>
        )}

        <button
          type="button"
          onClick={() => { sessionStorage.removeItem("ozow_pending"); onBack(); }}
          className="w-full rounded-2xl border border-slate-200 py-3.5 text-sm font-medium text-slate-600 transition-all active:scale-95"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default PaymentCancelledPage;
