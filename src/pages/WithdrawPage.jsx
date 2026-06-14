import React from "react";
import { ChevronLeft } from "lucide-react";

/* Sell / withdraw flow — reached by tapping the balance card on Home.
   Step 1: navigation stub. Holdings list, sell buttons and the request-sell
   backend are added in the following steps. */

export default function WithdrawPage({ userId, onBack }) {
  return (
    <div className="min-h-screen bg-[#0b0b0f] text-white">
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-4 bg-[#0b0b0f]/90 backdrop-blur border-b border-white/10">
        <button onClick={onBack} className="h-9 w-9 -ml-1 rounded-full flex items-center justify-center active:bg-white/10">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold leading-tight">Sell holdings</h1>
          <p className="text-xs text-white/50">Tap an asset to sell it</p>
        </div>
      </header>

      <div className="px-4 pt-10 text-center text-white/40 text-sm">
        Holdings &amp; single assets will appear here (next step).
      </div>
    </div>
  );
}
