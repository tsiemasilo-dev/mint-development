import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { NotificationsProvider } from './lib/NotificationsContext.jsx';
import { LayoutGroup } from 'framer-motion';
import './styles/tailwind.css';
import './styles/auth.css';

const GiftLandingPage = lazy(() => import('./pages/GiftLandingPage.jsx'));

const giftLandingMatch = window.location.pathname.match(
  /^\/gift\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i
);
const giftLandingId = giftLandingMatch ? giftLandingMatch[1] : null;

ReactDOM.createRoot(document.getElementById('root')).render(
  giftLandingId ? (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#f1eef6' }} />}>
      <GiftLandingPage giftId={giftLandingId} />
    </Suspense>
  ) : (
    <LayoutGroup>
      <NotificationsProvider>
        <App />
      </NotificationsProvider>
    </LayoutGroup>
  )
);
