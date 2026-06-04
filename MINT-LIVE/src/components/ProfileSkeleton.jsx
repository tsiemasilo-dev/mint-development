import React from "react";
import Skeleton from "./Skeleton";

const ProfileSkeleton = () => {
  return (
    <div className="min-h-screen bg-white px-6 pt-10 pb-24">
      <div className="flex flex-col items-center text-center">
        <div className="relative flex w-full items-center justify-center">
          <Skeleton className="absolute left-0 h-10 w-10 rounded-full" />
          <Skeleton className="h-20 w-20 rounded-full" />
        </div>
        <Skeleton className="mt-4 h-5 w-40" />
        <Skeleton className="mt-2 h-4 w-28" />
        <Skeleton className="mt-5 h-10 w-36 rounded-full" />
      </div>

      <div className="mt-8 space-y-4">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    </div>
  );
};

export default ProfileSkeleton;
