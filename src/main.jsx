import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import NewPortfolioPage from './pages/NewPortfolioPage.jsx';
import { NotificationsProvider } from './lib/NotificationsContext.jsx';
import './styles/tailwind.css';
import './styles/auth.css';

const DEV_MODE = true;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {DEV_MODE ? (
      <NewPortfolioPage />
    ) : (
      <NotificationsProvider>
        <App />
      </NotificationsProvider>
    )}
  </React.StrictMode>
);
