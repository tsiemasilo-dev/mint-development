import React from "react";

const MorePage = () => {
  const menuItems = [
    "Profile Details", "KYC Status", "Linked Bank Accounts", 
    "Settings", "Setup Biometrics", "Preferences", 
    "Help & FAQs", "Legal", "Privacy"
  ];

  return (
    <div className="min-h-screen bg-slate-50 px-6 pt-12 pb-24">
      <h1 className="mb-8 text-3xl font-semibold text-slate-900">More</h1>
      <div className="space-y-2">
        {menuItems.map((item) => (
          <button 
            key={item} 
            className="w-full rounded-2xl bg-white p-5 text-left font-medium text-slate-700 shadow-sm transition active:scale-95"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
};

// THIS IS THE MISSING LINE:
export default MorePage;