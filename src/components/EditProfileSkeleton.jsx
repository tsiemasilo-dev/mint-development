import React from "react";
import Skeleton from "./Skeleton";

const EditProfileSkeleton = () => {
  return (
    <div className="min-h-screen bg-white px-6 pb-10 pt-10">
      <header className="relative mb-8 flex items-center justify-center">
        <Skeleton className="absolute left-0 h-10 w-10 rounded-full" />
        <Skeleton className="h-5 w-32 rounded-full" />
      </header>

      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <Skeleton className="h-20 w-20 rounded-full" />
          <Skeleton className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full" />
        </div>
        <Skeleton className="mt-4 h-6 w-40 rounded-full" />
        <Skeleton className="mt-2 h-4 w-28 rounded-full" />
      </div>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <div className="space-y-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-14 w-full rounded-2xl" />
          ))}
        </div>
      </div>

      <Skeleton className="mt-10 h-12 w-full rounded-full" />
    </div>
  );
};

export default EditProfileSkeleton;
