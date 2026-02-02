# Mint AI Coding Guide

## Big picture (React + Vite + Capacitor)
- Hash-based routing is centralized in [src/App.jsx](src/App.jsx) using `currentPage` and `authStep`; no router library. Pages are feature modules under [src/pages/](src/pages/), wired via `onOpenXxx` callbacks from `App.jsx`.
- Two layouts: `AuthLayout` for auth flows and `AppLayout` for the main app shell (see [src/layouts/AppLayout.jsx](src/layouts/AppLayout.jsx)).
- Supabase is the backend (auth + data). The client lives in [src/lib/supabase.js](src/lib/supabase.js) and is used by hooks in [src/lib/](src/lib/).
- Notifications are app-wide state via context in [src/lib/NotificationsContext.jsx](src/lib/NotificationsContext.jsx) and are mounted in `main.jsx`.

## Critical workflows
- Dev server: `npm run dev` (Vite is hardwired to localhost:5000 via vite.config.js).
- Build: `npm run build` (output dist/; used by Capacitor webDir in capacitor.config.json).
- Mobile sync: `npx cap sync ios|android` after build.

## Project-specific patterns
- Data hooks use an `isMounted` flag and guard missing envs: always check `if (!supabase)` before queries (see [src/lib/useProfile.js](src/lib/useProfile.js)).
- Use `.maybeSingle()` for optional rows and auto-create missing rows (see `useRequiredActions` in [src/lib/useRequiredActions.js](src/lib/useRequiredActions.js)).
- Auth logic is consolidated in the large [src/components/AuthForm.jsx](src/components/AuthForm.jsx) component with rate-limits and OTP flows.
- Biometrics must check `(isNativeIOS() || isNativeAndroid())` from [src/lib/biometrics.js](src/lib/biometrics.js) — never iOS-only checks.

## Strategy + markets data flow
- Strategy prices and metrics come from `strategy_metrics` and `strategy_prices` via [src/lib/strategyData.js](src/lib/strategyData.js). Do not compute strategy prices from securities.
- Markets/strategies views: [src/pages/MarketsPage.jsx](src/pages/MarketsPage.jsx) → factsheet in [src/pages/FactsheetPage.jsx](src/pages/FactsheetPage.jsx).

## Payments
- Paystack is used on the client; SDK is loaded in index.html and wired in [src/pages/PaymentPage.jsx](src/pages/PaymentPage.jsx).

## Styling conventions
- Tailwind CSS only; compose classes instead of inline styles. Shared inputs use `forwardRef` and className merging (see [src/components/TextInput.jsx](src/components/TextInput.jsx)).

## Env requirements
- Required: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PAYSTACK_PUBLIC_KEY`.

## Reference map
- Router + state: [src/App.jsx](src/App.jsx)
- Auth + rate limiting: [src/components/AuthForm.jsx](src/components/AuthForm.jsx)
- Supabase client: [src/lib/supabase.js](src/lib/supabase.js)
- Strategy data: [src/lib/strategyData.js](src/lib/strategyData.js)
- Biometrics: [src/lib/biometrics.js](src/lib/biometrics.js)

