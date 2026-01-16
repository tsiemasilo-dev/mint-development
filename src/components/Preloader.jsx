import React from "react";

import { LoaderOne } from "./ui/unique-loader-components";

const Preloader = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <LoaderOne />
    </div>
  );
};

export default Preloader;
