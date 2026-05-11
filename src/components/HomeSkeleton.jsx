import React from "react";

const HomeSkeleton = () => {
  return (
    <div
      className="min-h-screen pb-[env(safe-area-inset-bottom)] relative overflow-x-hidden"
      style={{
        backgroundColor: '#f8f6fa',
        backgroundImage: 'linear-gradient(180deg, #0d0d12 0%, #0e0a14 0.5%, #100b18 1%, #120c1c 1.5%, #150e22 2%, #181028 2.5%, #1c122f 3%, #201436 3.5%, #25173e 4%, #2a1a46 5%, #301d4f 6%, #362158 7%, #3d2561 8%, #44296b 9%, #4c2e75 10%, #54337f 11%, #5d3889 12%, #663e93 13%, #70449d 14%, #7a4aa7 15%, #8451b0 16%, #8e58b9 17%, #9860c1 18%, #a268c8 19%, #ac71ce 20%, #b57ad3 21%, #be84d8 22%, #c68edc 23%, #cd98e0 24%, #d4a2e3 25%, #daace6 26%, #dfb6e9 27%, #e4c0eb 28%, #e8c9ed 29%, #ecd2ef 30%, #efdaf1 31%, #f2e1f3 32%, #f4e7f5 33%, #f6ecf7 34%, #f8f0f9 35%, #f9f3fa 36%, #faf5fb 38%, #fbf7fc 40%, #fcf9fd 42%, #fdfafd 45%, #faf8fc 55%, #f8f6fa 100%)',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '100% 100vh',
      }}
    >
      <div className="rounded-b-[36px] bg-transparent px-4 pb-12 pt-12 text-white md:px-8">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-6 md:max-w-md">

          <header className="relative flex items-center justify-between">
            <div className="animate-pulse h-10 w-10 rounded-full bg-white/25" />
            <div className="animate-pulse h-8 w-28 rounded-full bg-white/20" />
            <div className="animate-pulse h-10 w-10 rounded-full bg-white/25" />
          </header>

          <div className="animate-pulse rounded-[28px] border border-white/10 bg-white/10 p-5 flex flex-col gap-3">
            <div className="h-3 w-20 rounded-full bg-white/30" />
            <div className="h-8 w-36 rounded-full bg-white/35" />
            <div className="h-3 w-28 rounded-full bg-white/25" />
            <div className="mt-2 h-24 w-full rounded-2xl bg-white/10" />
            <div className="flex justify-center gap-1.5 pt-1">
              <div className="h-1.5 w-1.5 rounded-full bg-white/30" />
              <div className="h-1.5 w-4 rounded-full bg-white/40" />
              <div className="h-1.5 w-1.5 rounded-full bg-white/30" />
            </div>
          </div>

        </div>
      </div>

      <div className="mx-auto -mt-10 flex w-full max-w-sm flex-col gap-6 px-4 pb-10 md:max-w-md md:px-8">

        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex flex-col items-center gap-2 rounded-2xl bg-white px-1 py-3 shadow-md">
              <div className="h-8 w-8 rounded-full bg-slate-200" />
              <div className="h-2.5 w-10 rounded-full bg-slate-200" />
            </div>
          ))}
        </div>

        <div className="animate-pulse h-36 w-full rounded-3xl bg-white shadow-sm" />
        <div className="animate-pulse h-40 w-full rounded-3xl bg-white shadow-sm" />
        <div className="animate-pulse h-28 w-full rounded-3xl bg-white shadow-sm" />

      </div>
    </div>
  );
};

export default HomeSkeleton;
