import React from "react";
import Navbar from "../components/Navbar.jsx";

const AppLayout = ({ activeTab, onTabChange, children }) => {
  return (
    <div className="app-shell flex min-h-screen flex-col bg-white overflow-hidden">
      <main
        className="app-content flex-1 overflow-y-auto pb-[calc(7rem+env(safe-area-inset-bottom))]"
      >
        {children}
      </main>
        <Navbar
          activeTab={activeTab}
          setActiveTab={onTabChange}
          className="fixed bottom-0 left-0 w-full z-50"
        />
    </div>
  );
};

export default AppLayout;
