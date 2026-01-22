import { useEffect, useState } from "react";

import Preloader from "./components/Preloader.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import CreditPage from "./pages/CreditPage.jsx";
import InvestmentsPage from "./pages/InvestmentsPage.jsx";
import MorePage from "./pages/MorePage.jsx";
import TransactPage from "./pages/TransactPage.jsx";
import OnboardingPage from "./pages/OnboardingPage.jsx";
import Navbar from "./components/Navbar.jsx";

const App = () => {
  const [showPreloader, setShowPreloader] = useState(true);
  
  // Set to 'main' so we skip onboarding and see the Navbar immediately
  const [currentPage, setCurrentPage] = useState("OnboardingPage.jsx"); 
  const [activeTab, setActiveTab] = useState("home");
  const [authStep, setAuthStep] = useState("email");

  useEffect(() => {
    setShowPreloader(true);
    const timeoutId = setTimeout(() => {
      setShowPreloader(false);
    }, 1200);
    return () => clearTimeout(timeoutId);
  }, [currentPage]);

  if (showPreloader) {
    return <Preloader />;
  }

  // LOGIC: This function only returns the CONTENT, not the whole page structure
  const renderContent = () => {
    if (currentPage === "welcome") {
      return (
        <OnboardingPage
          onCreateAccount={() => { setAuthStep("email"); setCurrentPage("auth"); }}
          onLogin={() => { setAuthStep("loginEmail"); setCurrentPage("auth"); }}
        />
      );
    }

    if (currentPage === "auth") {
      return (
        <AuthPage
          initialStep={authStep}
          onSignupComplete={() => setCurrentPage("main")}
          onLoginComplete={() => setCurrentPage("main")}
        />
      );
    }

    // Tab Navigation
    switch (activeTab) {
      case "home": return <HomePage />;
      case "credit": return <CreditPage />;
      case "investments": return <InvestmentsPage />;
      case "more": return <MorePage />;
      case "transact": return <TransactPage />;
      default: return <HomePage />;
    }
  };

  // FINAL RENDER: This is the ONLY return statement that runs for the main app
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <main className="flex-1 pb-24"> 
        {renderContent()}
      </main>

      {/* The Navbar is now OUTSIDE the logic gates, so it will always show on 'main' */}
      {currentPage === "main" && (
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      )}
    </div>
  );
};

export default App;
