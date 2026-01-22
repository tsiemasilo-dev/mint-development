import React from "react";
import Navbar from "../components/Navbar.jsx";

const AppLayout = ({ activeTab, onTabChange, children }) => {
  return (
    <div className="app-shell min-h-screen bg-white">
      <main className="app-content pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <Navbar activeTab={activeTab} setActiveTab={onTabChange} />
    </div>
  );
};

export default AppLayout;
