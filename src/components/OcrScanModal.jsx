import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import ExperianVerification from "./ExperianVerification.jsx";

/* In-frame ID-document scan (Experian OCR / wf8), shown at a secondary-strategy
   purchase for users we don't yet hold an ID document for. It's deliberately
   NON-BLOCKING: the user can skip and still complete their purchase. Because the
   gate is "no ID document on file", a skip simply means it'll be offered again at
   the next eligible moment — until the document is captured.

   - onVerified : the scan succeeded (document captured + archived).
   - onSkip     : the user dismissed it. Treat the same as onVerified upstream
                  (i.e. continue the purchase), just without a captured document. */
export default function OcrScanModal({ isOpen, onVerified, onSkip }) {
  const portalTarget = document.getElementById("modal-root") || document.body;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="ocr-scan-backdrop"
            className="fixed inset-0"
            style={{ zIndex: 10050, background: "rgba(15,10,30,0.65)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onSkip}
          />

          <motion.div
            key="ocr-scan-sheet"
            className="fixed inset-x-0 bottom-0 mx-auto flex w-full max-w-md flex-col rounded-t-[28px] bg-white shadow-2xl overflow-hidden"
            style={{ zIndex: 10051, maxHeight: "94dvh", paddingBottom: "env(safe-area-inset-bottom)" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <div className="h-1 w-full flex-shrink-0" style={{ background: "linear-gradient(90deg,#7c3aed,#6366f1,#8b5cf6)" }} />

            <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
              <div>
                <h2 className="text-[15px] font-bold text-slate-900 leading-tight">Quick ID check</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">A one-time document scan to keep your account secure</p>
              </div>
              <button
                type="button"
                onClick={onSkip}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
                aria-label="Skip for now"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pb-4" style={{ WebkitOverflowScrolling: "touch" }}>
              <ExperianVerification standaloneOcr onVerified={onVerified} />
            </div>

            <div className="px-5 pb-4 pt-1 flex-shrink-0">
              <button
                type="button"
                onClick={onSkip}
                className="w-full rounded-2xl py-3 text-xs font-semibold text-slate-500 hover:text-violet-600 transition-colors"
              >
                Skip for now &amp; continue to payment
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    portalTarget
  );
}
