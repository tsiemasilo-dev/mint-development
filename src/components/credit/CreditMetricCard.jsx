import React from "react";

const CreditMetricCard = ({ children, className = "" }) => {
  return (
    <div className={`rounded-3xl bg-white p-5 shadow-md ${className}`}>{children}</div>
  );
};

export default CreditMetricCard;
