import React, { Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import InvestAmountPage from "../pages/InvestAmountPage.jsx";

export default function AdultInvestModal({
  isOpen,
  onClose,
  strategy,
  onContinue,
  paymentMethod,
  startWithGiftOpen,
  onGiftDone,
}) {
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="adult-invest-backdrop"
            className="fixed inset-0 bg-black/50"
            style={{ zIndex: 60 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            key="adult-invest-sheet"
            className="fixed inset-x-0 bottom-0 flex flex-col rounded-t-[32px] bg-slate-50 shadow-2xl overflow-hidden"
            style={{ zIndex: 61, maxHeight: "92dvh" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 300 }}
          >
            <div className="flex flex-col items-center pt-3 pb-0 flex-shrink-0">
              <div className="h-1 w-10 rounded-full bg-slate-300" />
            </div>
            <div
              className="flex-1 overflow-y-auto overscroll-contain"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <Suspense fallback={<div className="flex items-center justify-center py-16"><div className="h-6 w-6 rounded-full border-2 border-violet-300 border-t-violet-600 animate-spin" /></div>}>
                <InvestAmountPage
                  onBack={onClose}
                  strategy={strategy}
                  onContinue={onContinue}
                  paymentMethod={paymentMethod}
                  startWithGiftOpen={startWithGiftOpen}
                  onGiftDone={onGiftDone}
                />
              </Suspense>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
