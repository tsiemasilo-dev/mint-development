import React from "react";
import Skeleton from "./Skeleton";

const ActivitySkeleton = () => {
  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-[env(safe-area-inset-bottom)] pt-12 md:px-8">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6 md:max-w-md">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-5 w-24" />
        </div>

        <div className="flex gap-2 rounded-full bg-white p-1 shadow-sm">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-8 flex-1 rounded-full" />
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActivitySkeleton;
