import React from "react";
import Skeleton from "./Skeleton";

const NotificationsSkeleton = () => {
  return (
    <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
      <div className="mx-auto flex w-full max-w-sm flex-col px-4 pb-10 pt-12 md:max-w-md md:px-8">
        <header className="flex items-center justify-between">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-5 w-32 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </header>

        <div className="mt-6 space-y-4">
          <Skeleton className="h-3 w-24 rounded-full" />
          {[0, 1, 2].map((index) => (
            <div key={index} className="flex gap-3 rounded-3xl bg-white p-4 shadow-sm">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-4 w-36 rounded-full" />
                  <Skeleton className="h-3 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-full rounded-full" />
                <Skeleton className="h-3 w-2/3 rounded-full" />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Skeleton className="h-4 w-56 rounded-full" />
        </div>
      </div>
    </div>
  );
};

export default NotificationsSkeleton;
