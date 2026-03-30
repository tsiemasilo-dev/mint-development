import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { NotificationsProvider } from './lib/NotificationsContext.jsx';
import { LayoutGroup } from 'framer-motion';
import './styles/tailwind.css';
import './styles/auth.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LayoutGroup>
      <NotificationsProvider>
        <App />
      </NotificationsProvider>
    </LayoutGroup>
  </React.StrictMode>
);
