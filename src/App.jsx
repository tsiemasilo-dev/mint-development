import { useEffect, useState } from "react";

import Preloader from "./components/Preloader.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import OnboardingPage from "./pages/OnboardingPage.jsx";

const App = () => {
  const [showPreloader, setShowPreloader] = useState(true);
  const [currentPage, setCurrentPage] = useState("auth");

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setShowPreloader(false);
    }, 1200);

    return () => clearTimeout(timeoutId);
  }, []);

  if (showPreloader) {
    return <Preloader />;
  }

  if (currentPage === "onboarding") {
    return <OnboardingPage onGetStarted={() => setCurrentPage("home")} />;
  }

  if (currentPage === "home") {
    return <HomePage />;
  }

  return (
    <AuthPage
      onSignupComplete={() => setCurrentPage("onboarding")}
      onLoginComplete={() => setCurrentPage("home")}
    />
  );
};

export default App;
