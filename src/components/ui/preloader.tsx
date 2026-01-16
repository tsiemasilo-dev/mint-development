"use client";

import React from "react";
import { LoaderOne } from "./unique-loader-components";

const Preloader = ({ message = "Loading" }: { message?: string }) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950/90">
      <div className="relative overflow-hidden rounded-3xl border border-purple-300/30 bg-white/10 px-10 py-8 text-center shadow-[0_20px_60px_-30px_rgba(168,85,247,0.65)] backdrop-blur-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 via-transparent to-fuchsia-500/20" />
        <div className="relative z-10 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.45em] text-purple-200/70">
              Loading
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              {message}
            </h2>
          </div>
          <div className="flex justify-center">
            <LoaderOne />
          </div>
          <p className="text-sm uppercase tracking-[0.3em] text-purple-100/80">
            Preparing your experience
          </p>
        </div>
      </div>
    </div>
  );
};

export default Preloader;
