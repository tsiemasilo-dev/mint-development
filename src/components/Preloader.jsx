import React from "react";

import { LoaderOne } from "./ui/unique-loader-components";

const Preloader = () => {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950/90">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.2),_transparent_55%)]" />
      <div className="relative rounded-3xl border border-purple-200/30 bg-white/10 px-12 py-10 shadow-[0_20px_60px_-30px_rgba(168,85,247,0.65)] backdrop-blur-2xl">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-500/20 via-transparent to-fuchsia-500/20" />
        <div className="relative z-10 flex justify-center">
          <LoaderOne />
        </div>
      </div>
    </div>
  );
};

export default Preloader;
