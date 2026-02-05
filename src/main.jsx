import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import NewPortfolioPage from './pages/NewPortfolioPage.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import { NotificationsProvider } from './lib/NotificationsContext.jsx';
import './styles/tailwind.css';
import './styles/auth.css';

const DEV_MODE = true;

const DevWrapper = () => {
  const [activeTab, setActiveTab] = useState("investments");
  
  return (
    <AppLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onWithdraw={() => {}}
      onShowComingSoon={() => {}}
      modal={null}
      onCloseModal={() => {}}
    >
      <NewPortfolioPage />
    </AppLayout>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {DEV_MODE ? (
      <DevWrapper />
    ) : (
      <NotificationsProvider>
        <App />
      </NotificationsProvider>
    )}
  </React.StrictMode>
);
