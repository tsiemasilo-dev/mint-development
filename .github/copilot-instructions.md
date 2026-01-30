# Copilot Instructions for Mint

## Project Overview

**Mint** is a React + Vite fintech application deployed as a web app with native iOS and Android apps (via Capacitor). It's a personal finance platform featuring KYC verification, credit management, investment strategies, market data, and biometric authentication.

**Tech Stack:**
- Frontend: React 18 + Vite 5 with Tailwind CSS and PostCSS
- Mobile: Capacitor 8 (iOS + Android)
- Backend: Supabase (PostgreSQL + Auth + Realtime)
- Charts: Recharts; Icons: Lucide React; UI: Framer Motion
- Biometrics: `@capgo/capacitor-native-biometric@^8.3.1` for Face ID/Touch ID (iOS) and Fingerprint/Face Unlock (Android)

**Environment Setup:**
- `VITE_SUPABASE_URL`: Required; Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Required; Public anon key for client auth
- `VITE_PAYSTACK_PUBLIC_KEY`: Required for payments; Paystack public key from dashboard
- Dev server: `npm run dev` runs on `localhost:5000` (hardcoded in vite.config.js)
- Build output: `dist/` directory; note that web directory is configured in capacitor.config.json

## Architecture

### App Structure

1. **Single-Page Routing** (`src/App.jsx`): Hash-based page navigation without a router library. App state manages:
   - `currentPage`: Active page name ("home", "auth", "credit", "markets", "investments", etc.)
   - `authStep`: Auth substep ("email", "otp", "signup", "newPassword")
   - Recovery mode: URL hash parsing (`type=recovery`) triggers password reset flow
   - Two layouts: `AuthLayout` (minimal) and `AppLayout` (navbar + sidebar)
   - 30+ pages in `src/pages/` including markets, news, transactions, onboarding

2. **Data Layer** (`src/lib/`):
   - **`supabase.js`**: Single Supabase client instance using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   - **`useProfile.js`**: Custom hook merging Supabase `auth.getUser()` + `profiles` table, builds profile from user metadata + row data
   - **`useRequiredActions.js`**: Tracks user compliance (KYC verified, bank linked) from `required_actions` table; auto-creates row if missing
   - **`biometrics.js`**: Platform detection (`isNativeIOS()`, `isNativeAndroid()`, `isNativePlatform()`), biometric availability check, encrypted localStorage flags for biometric state
   - **`marketData.js`**: In-memory caching for securities/metrics; 60s TTL for market data, per-timeframe cache for price history
   - **`strategyData.js`**: Strategy data fetching with caching; fetches from `strategies` + `strategy_metrics` tables, never computes strategy prices in frontend
   - **`NotificationsContext.jsx`**: Global context provider wrapping App in `main.jsx`; manages notification state, preferences, marking as read, Supabase realtime subscriptions

3. **Component Hierarchy**:
   - Pages (`src/pages/`) are feature-based: AuthPage, HomePage, CreditPage, InvestmentsPage, etc.
   - Shared UI components (`src/components/`) use forwardRef for form inputs, className composition for styling
   - Skeleton components provide loading states for each major page

### Auth Flow

- **Signup**: Email → OTP (sent via Supabase) → Password → Create profile
- **Login**: Email + Password (with rate-limiting) OR biometric if enabled on first login
- **Recovery**: Hash-based token parsing in App.jsx triggers recovery mode (`newPassword` step); tokens from URL hash set via `supabase.auth.setSession()`
- **Biometrics**: iOS + Android support; enabled after first login, stored in localStorage with email; auto-prompts on subsequent visits
  - Platform checks: `isNativeIOS() || isNativeAndroid()` (never just `isNativeIOS()` alone)

### Strategy Investment Flow

- **Browse strategies**: MarketsPage → OpenStrategies tab displays strategies from database using `getStrategiesWithMetrics()`
- **View factsheet**: Click strategy card → FactsheetPage with real data from `strategy_metrics` + `strategy_prices`
- **Invest**: Fixed "Invest" button → InvestAmountPage → PaymentPage (Paystack integration)
- **Payment**: Paystack SDK loaded in index.html; PaymentPage handles payment flow with callbacks
- **Success**: Payment success redirects to home; transaction recorded in database (TODO: implement backend verification)

## Critical Patterns

### Custom Hooks
All data hooks follow this pattern:
- Use cleanup flag (`isMounted`) to prevent state updates on unmounted components
- Return `{ data, loading }` or `{ data, error, loading }`
- Always check `if (!supabase)` before queries (handles dev without env vars)
- Use `.maybeSingle()` for optional rows; fallback gracefully if missing
- Example: `useProfile()` loads from `profiles` table only after auth check
- Auto-create missing rows if needed (see `useRequiredActions.js` insert pattern)

### Form Components
- **Controlled inputs**: Use `value` + `onChange` props
- **forwardRef support**: TextInput, PasswordInput accept ref for focus management
- **className composition**: Merge baseClassName + custom className (see `TextInput.jsx`)
- **No form library**: Manual validation in AuthForm (1300+ lines managing auth complexity)
- **Password strength**: PasswordStrengthIndicator component provides visual feedback

### Styling
- **Tailwind CSS** with custom CSS variables for theme colors (defined in tailwind.config.js)
- **Custom classes**: e.g., `glass-btn` for glassmorphic buttons (check auth.css)
- **Responsive**: Mobile-first; components adapt via Tailwind breakpoints
- **Safe area**: Components use `env(safe-area-inset-bottom)` for iOS notch/home indicator (see AppLayout)

### State Management
- **Prop drilling**: Pages receive `onOpenXxx` callbacks from App.jsx
- **No global state library**: Keep state in App or local components
- **useCallback + useMemo**: Optimize re-renders in heavy components (e.g., StrategyReturnChart with useMemo for filtered data)

### Rate Limiting & Security
- **Auth rate limits**: Hardcoded in AuthForm.jsx top (OTP_EXPIRY_TIME=180s, MAX_OTP_ATTEMPTS=5, LOGIN_COOLDOWN=1800s, etc.)
- **Progressive backoff**: Two-tier cooldown system (COOLDOWN_TIMES=[300, 1800]) for repeated failures
- **Biometric state**: Stored in localStorage with encryption flags; works on both iOS and Android
- **DEBUG_BIOMETRICS flag**: Set to `true` in AuthForm.jsx (line ~26) to enable verbose biometric logging via Logcat (Android) or Safari console (iOS)

## Common Tasks

### Adding a New Page
1. Create `src/pages/NewPage.jsx` with props for navigation callbacks
2. Import and add to App.jsx page list (top of file)
3. Add route case in App.jsx's page switch statement
4. Pass `onOpenXxx` callbacks down from App.jsx
5. Use `useProfile` and `useRequiredActions` hooks if user data needed
6. Match page parameter naming: `onOpenNewPage` callback pattern

### Modifying Auth
- **Auth logic**: Mostly in [AuthForm.jsx](../src/components/AuthForm.jsx#L1) (handles signup, login, OTP, recovery, biometrics)
- **Rate-limiting**: Hardcoded constants at top (OTP_EXPIRY_TIME, MAX_OTP_ATTEMPTS, etc.); update COOLDOWN_TIMES for progressive backoff
- **Biometric integration**: Check [biometrics.js](../src/lib/biometrics.js#L1) for platform detection; iOS checks via `Capacitor.getPlatform()`
- **Email verification**: OTP sent via Supabase auth; verify with `.verifyOtp()` and compare `currentStep` state
- **Password recovery**: Hash params parsed in App.jsx; triggers `newPassword` step in AuthForm

### Fetching Data
- Always check `if (!supabase)` before queries (handles dev without env vars)
- Use `.from(table).select().eq().maybeSingle()` for optional rows; handle null gracefully
- Use `.from(table).select().eq().single()` only if row must exist (will error if missing)
- Use `isMounted` flag in useEffect to prevent memory leaks
- Toast messages for errors via `setToast({ message, visible })` pattern in AuthForm
- Supabase errors auto-logged; don't repeat error logging
- **Strategy data**: Always use `getStrategiesWithMetrics()` from `strategyData.js`; never compute strategy prices from security prices in frontend
- **Strategy pricing**: Use `strategy_metrics.last_close` for price, `change_pct` for daily change, `change_abs` for absolute change
- **Strategy charts**: Fetch from `strategy_prices` table via `getStrategyPriceHistory()`, not from securities

### Styling Components
- Import Tailwind classes; no additional CSS files needed unless custom animations
- Use className composition for conditional styles (e.g., `${isActive ? 'bg-blue-500' : 'bg-gray-200'}`)
- Check `src/styles/auth.css` and `tailwind.css` for custom utilities
- Custom color vars via HSL in tailwind.config.js (e.g., `hsl(var(--primary))`)
- Don't use inline styles; compose Tailwind classes instead

### Debugging
- Open `BiometricsDebugPage` in dev for biometric testing (see src/pages/BiometricsDebugPage.jsx)
- Check browser console for Supabase error logs (always present)
- localStorage inspection for biometric state and login history
- Vite dev server hot-reloads on file changes; watch for component re-mount issues

## Build & Deployment

- **Dev**: `npm run dev` (Vite on localhost:5000)
- **Build**: `npm run build` outputs to `dist/` (configured in capacitor.config.json as webDir)
- **Preview**: `npm run preview` tests production build locally
- **Deploy**: `npm run deploy` pushes to GitHub Pages (via gh-pages package)
- **Android**: `npm run build && npx cap sync android` to update native project; build APK via `cd android && ./gradlew assembleDebug`
- **iOS**: `npm run build && npx cap sync ios` to update Xcode project in `ios/` folder

## Database Schema

Key Supabase tables expected:
- **`profiles`**: `id` (uuid), `email`, `first_name`, `last_name`, `avatar_url`, `phone_number`, `date_of_birth`, `gender`, `address`
- **`required_actions`**: `user_id` (uuid), `kyc_verified` (bool), `bank_linked` (bool) – auto-created by useRequiredActions if missing
- **`strategies`**: `id` (uuid), `name`, `description`, `risk_level`, `is_active` – investment strategies
- **`strategy_metrics`**: `strategy_id` (FK), `as_of_date`, `last_close` (NAV), `prev_close`, `change_abs`, `change_pct`, `r_1w`, `r_1m`, `r_3m`, `r_6m`, `r_ytd`, `r_1y` – strategy-level metrics
- **`strategy_prices`**: `strategy_id` (FK), `ts` (timestamp), `nav` (net asset value) – historical strategy pricing for charts
- Auth metadata stored in Supabase `auth.users.user_metadata` (first_name, last_name, etc.)

## iOS Specific

- **Capacitor config**: Configured in [capacitor.config.json](../capacitor.config.json) with `com.algohive.mint.app` appId and `https://mint-henna.vercel.app/` as production server
- **Biometric plugin**: `@capgo/capacitor-native-biometric@^8.3.1` for Face ID / Touch ID; iOS-only check via `isNativeIOS()`
- **Platform checks**: Use `isNativePlatform()`, `isNativeIOS()` from biometrics.js; `Capacitor.getPlatform()` returns 'ios' or 'web'
- **Build**: Run `npm run build` then `npx cap sync` to update Xcode project (in ios/ folder)
- **Safe area insets**: `env(safe-area-inset-bottom)` used in [AppLayout](../src/layouts/AppLayout.jsx) for notch/home indicator padding
- **biometricAutoPrompted** ref: Prevents duplicate biometric prompts on hot reloads (see AuthForm useEffect)

## Android Specific

- **Biometric support**: Use `isNativeAndroid()` from biometrics.js; Fingerprint/Face Unlock via same plugin as iOS
- **Platform checks**: ALWAYS use `(isNativeIOS() || isNativeAndroid())` for biometric features; never iOS-only checks
- **Permissions**: `android.permission.USE_BIOMETRIC` (API 28+) and `android.permission.USE_FINGERPRINT` (API 23-27) set in AndroidManifest.xml
- **Build**: Run `npm run build && npx cap sync android` then `cd android && ./gradlew assembleDebug` for APK
- **Install**: `adb install -r app/build/outputs/apk/debug/app-debug.apk` or use Android Studio
- **Debug**: Enable `DEBUG_BIOMETRICS=true` in AuthForm.jsx, view logs via `adb logcat | grep Biometrics`
- **Key fixes**: See [ANDROID_FIXES.md](../ANDROID_FIXES.md) for biometric integration history and [ANDROID_QUICK_REFERENCE.md](../ANDROID_QUICK_REFERENCE.md) for quick commands

## Key Files Reference

- [App.jsx](../src/App.jsx#L1): Main router and state management
- [AuthForm.jsx](../src/components/AuthForm.jsx#L1): Complex auth UI (consider breaking down if extending)
- [supabase.js](../src/lib/supabase.js#L1): Backend client
- [useProfile.js](../src/lib/useProfile.js#L1): Profile data hook pattern
- [strategyData.js](../src/lib/strategyData.js#L1): Strategy data fetching with caching
- [HomePage.jsx](../src/pages/HomePage.jsx#L1): Dashboard with actions and transaction history
- [MarketsPage.jsx](../src/pages/MarketsPage.jsx#L1): Markets dashboard with stocks, strategies, and news
- [FactsheetPage.jsx](../src/pages/FactsheetPage.jsx#L1): Strategy detail view with real data
- [InvestAmountPage.jsx](../src/pages/InvestAmountPage.jsx#L1): Investment amount selection
- [PaymentPage.jsx](../src/pages/PaymentPage.jsx#L1): Paystack payment integration

## Common Gotchas & Error Handling

### State Updates on Unmounted Components
All data-fetching hooks use `isMounted` flag to prevent memory leaks:
```javascript
let isMounted = true;
// ... async operations ...
if (isMounted) setLoading(false);
return () => { isMounted = false; };
```

### Missing Supabase Client
When env vars are missing, `supabase` is null. Always guard queries:
```javascript
if (!supabase) return; // dev without env vars
```

### Rate Limit State Management
AuthForm uses complex cooldown tracking with multiple intervals. When modifying:
- Clear all refs in cleanup: `clearInterval(otpExpiryInterval.current)`, etc.
- Use `setShowRateLimitScreen` to conditionally render throttle UI
- Test two-tier COOLDOWN_TIMES=[300, 1800] (5min, then 30min)

### Biometric Login State
`biometricAutoPrompted` ref prevents duplicate prompts on re-renders. Don't remove this pattern—it's critical for iOS/web dev consistency.

### Component Re-mounting on Hash Navigation
Hash-based routing causes page components to unmount/remount. Avoid storing critical state in component trees; use App.jsx state instead.

### Toast Timing
Toast messages auto-hide with `setTimeout(toastTimeout.current)`. Ensure cleanup in useEffect return; don't nest multiple toast setups.

