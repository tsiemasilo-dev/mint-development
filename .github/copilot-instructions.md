# Copilot Instructions for Mint

## Project Overview

**Mint** is a React + Vite fintech application deployed as a web app and native iOS app (via Capacitor). It's a personal finance platform featuring KYC verification, credit management, investment strategies, and biometric authentication.

**Tech Stack:**
- Frontend: React 18 + Vite 5 with Tailwind CSS and PostCSS
- Mobile: Capacitor 8 (iOS only currently)
- Backend: Supabase (PostgreSQL + Auth)
- Charts: Recharts; Icons: Lucide React; UI: Framer Motion
- Biometrics: Capacitor Native Biometric plugin

## Architecture

### App Structure

1. **Single-Page Routing** (`src/App.jsx`): Hash-based page navigation without a router library. App state manages:
   - `currentPage`: Active page name ("home", "auth", "credit", etc.)
   - `authStep`: Auth substep ("email", "otp", "signup", "newPassword")
   - Two layouts: `AuthLayout` (minimal) and `AppLayout` (navbar + sidebar)

2. **Data Layer** (`src/lib/`):
   - **`supabase.js`**: Single Supabase client instance using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   - **`useProfile.js`**: Custom hook merging Supabase `auth.getUser()` + `profiles` table, builds profile from user metadata + row data
   - **`useRequiredActions.js`**: Tracks user compliance (KYC verified, bank linked) from `required_actions` table; auto-creates row if missing
   - **`biometrics.js`**: Platform detection, biometric availability check, encrypted localStorage flags for biometric state

3. **Component Hierarchy**:
   - Pages (`src/pages/`) are feature-based: AuthPage, HomePage, CreditPage, InvestmentsPage, etc.
   - Shared UI components (`src/components/`) use forwardRef for form inputs, className composition for styling
   - Skeleton components provide loading states for each major page

### Auth Flow

- **Signup**: Email → OTP (sent via Supabase) → Password → Create profile
- **Login**: Email + Password (with rate-limiting) OR biometric if enabled on first login
- **Recovery**: Hash-based token parsing in App.jsx triggers recovery mode (`newPassword` step)
- **Biometrics**: iOS-only; enabled after first login, stored in localStorage with email; auto-prompts on subsequent visits

## Critical Patterns

### Custom Hooks
All data hooks follow this pattern:
- Use cleanup flag (`isMounted`) to prevent state updates on unmounted components
- Return `{ data, loading }` or `{ data, error, loading }`
- Example: `useProfile()` loads from `profiles` table only after auth check

### Form Components
- **Controlled inputs**: Use `value` + `onChange` props
- **forwardRef support**: TextInput, PasswordInput accept ref for focus management
- **className composition**: Merge baseClassName + custom className (see `TextInput.jsx`)
- **No form library**: Manual validation in AuthForm (1300+ lines managing auth complexity)

### Styling
- **Tailwind CSS** with custom CSS variables for theme colors (defined in tailwind.config.js)
- **Custom classes**: e.g., `glass-btn` for glassmorphic buttons (check auth.css)
- **Responsive**: Mobile-first; components adapt via Tailwind breakpoints

### State Management
- **Prop drilling**: Pages receive `onOpenXxx` callbacks from App.jsx
- **No global state library**: Keep state in App or local components
- **useCallback + useMemo**: Optimize re-renders in heavy components (e.g., StrategyReturnChart with useMemo for filtered data)

## Common Tasks

### Adding a New Page
1. Create `src/pages/NewPage.jsx` with props for navigation callbacks
2. Import and add to App.jsx page list
3. Add route case in App.jsx's page switch statement
4. Pass onOpenXxx callbacks down from App.jsx
5. Use `useProfile` and `useRequiredActions` hooks if user data needed

### Modifying Auth
- **Auth logic**: Mostly in `AuthForm.jsx` (handles signup, login, OTP, recovery, biometrics)
- **Rate-limiting**: Hardcoded constants at top (OTP_EXPIRY_TIME, MAX_OTP_ATTEMPTS, etc.)
- **Biometric integration**: Check `biometrics.js` for platform detection; iOS checks via `Capacitor.getPlatform()`

### Fetching Data
- Always check `if (!supabase)` before queries (handles dev without env vars)
- Use `supabase.from(table).select().eq().maybeSingle()` for optional rows
- Use `isMounted` flag in useEffect to prevent memory leaks (e.g., `if (isMounted) setLoading(false)`)

### Styling Components
- Import Tailwind classes; no additional CSS files needed unless custom animations
- Use `className` composition for conditional styles (e.g., `${isActive ? 'bg-blue-500' : 'bg-gray-200'}`)
- Check `auth.css` and `tailwind.css` for custom utilities

## Build & Deployment

- **Dev**: `npm run dev` (Vite on localhost:5000)
- **Build**: `npm run build` outputs to `dist/` (configured in capacitor.config.json as webDir)
- **Preview**: `npm run preview` tests production build locally
- **Deploy**: `npm run deploy` pushes to GitHub Pages (via gh-pages package)

## iOS Specific

- **Capacitor config**: Configured in `capacitor.config.json` with `com.algohive.mint.app` appId
- **Biometric plugin**: `@capgo/capacitor-native-biometric@^8.3.1` for Face ID / Touch ID
- **Platform checks**: Use `isNativePlatform()`, `isNativeIOS()` from biometrics.js; Capacitor.getPlatform() returns 'ios' or 'web'
- **Build**: Run `npm run build` then `npx cap sync` to update Xcode project (in ios/ folder)

## Key Files Reference

- [App.jsx](../src/App.jsx#L1): Main router and state management
- [AuthForm.jsx](../src/components/AuthForm.jsx#L1): Complex auth UI (consider breaking down if extending)
- [supabase.js](../src/lib/supabase.js#L1): Backend client
- [useProfile.js](../src/lib/useProfile.js#L1): Profile data hook pattern
- [HomePage.jsx](../src/pages/HomePage.jsx#L1): Dashboard with actions and transaction history

