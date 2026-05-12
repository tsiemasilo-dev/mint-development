import React from "react";
import Skeleton from "./Skeleton";

const ActionsSkeleton = () => {
  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-[env(safe-area-inset-bottom)] pt-12 md:px-8">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6 md:max-w-md">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-5 w-20" />
        </div>

        <div className="rounded-3xl bg-white px-5 py-5 shadow-sm ring-1 ring-slate-100">
          <Skeleton className="h-4 w-36" />
          <div className="mt-4 flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActionsSkeleton;
