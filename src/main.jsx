import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { NotificationsProvider } from './lib/NotificationsContext.jsx';
import { LayoutGroup } from 'framer-motion';
import './styles/tailwind.css';
import './styles/auth.css';

// After a new deploy, hashed code-split chunks from the previous build no longer
// exist, so lazy-loaded routes fail to import (white page until manual refresh).
// Vite fires `vite:preloadError` in that case — reload once to pick up the new
// build. The sessionStorage guard prevents an infinite reload loop if a chunk is
// genuinely missing rather than just stale.
window.addEventListener('vite:preloadError', () => {
  const KEY = 'mint:chunk-reloaded-at';
  const last = Number(sessionStorage.getItem(KEY) || 0);
  if (Date.now() - last > 10000) {
    sessionStorage.setItem(KEY, String(Date.now()));
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <LayoutGroup>
    <NotificationsProvider>
      <App />
    </NotificationsProvider>
  </LayoutGroup>
);
