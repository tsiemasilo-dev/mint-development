import React, { useEffect, useState } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { motion, AnimatePresence } from "framer-motion";

const SUCCESS_LOTTIE = "https://lottie.host/12e67a6d-3162-4c7d-a533-95c4c66e801b/Qatm3tqUj4.lottie";
const PENDING_LOTTIE = "https://lottie.host/203cd577-a8f7-431d-9a46-3c21646ac976/HTfOgovXbh.json";

const PaymentSuccessPage = ({ onDone, strategyName }) => {
  const [phase, setPhase] = useState("success");

  useEffect(() => {
    const timer = setTimeout(() => setPhase("pending"), 2600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start pt-16 px-4">
      <div
        data-coach-success-card="true"
        className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-slate-100 p-8 text-center overflow-hidden"
      >
        <AnimatePresence mode="wait">
          {phase === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88 }}
              transition={{ duration: 0.35 }}
            >
              <div className="flex justify-center mb-2" style={{ height: 160 }}>
                <DotLottieReact
                  src={SUCCESS_LOTTIE}
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
                  ? `Your investment in ${strategyName} is confirmed.`
                  : "Your investment is confirmed."}
              </p>
              <p className="text-sm text-slate-400">
                Placing your order now…
              </p>
            </motion.div>
          )}

          {phase === "pending" && (
            <motion.div
              key="pending"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88 }}
              transition={{ duration: 0.35 }}
            >
              <div className="flex justify-center mb-2" style={{ height: 160 }}>
                <DotLottieReact
                  src={PENDING_LOTTIE}
                  loop
                  autoplay
                  style={{ width: 160, height: 160 }}
                />
              </div>

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

              <motion.button
                type="button"
                onClick={onDone}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="w-full rounded-2xl bg-gradient-to-r from-[#5b21b6] to-[#7c3aed] py-3.5 text-sm font-semibold text-white shadow-lg transition-all active:scale-95"
              >
                Back to Home
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
