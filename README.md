# Mint — Investment & Wealth Platform

<p align="center">
  <img src="public/mint-logo.png" alt="Mint Logo" width="80" />
</p>

<p align="center">
  A full-stack financial management and investment platform built for the South African market.<br />
  iOS-style glassmorphism UI · Real-time portfolio tracking · KYC onboarding · Strategy-based investing · Credit · Gifting · Family accounts.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-blue?logo=react" />
  <img src="https://img.shields.io/badge/Vite-7-purple?logo=vite" />
  <img src="https://img.shields.io/badge/Express-5-black?logo=express" />
  <img src="https://img.shields.io/badge/Supabase-BaaS-green?logo=supabase" />
  <img src="https://img.shields.io/badge/Capacitor-8-blue?logo=capacitor" />
  <img src="https://img.shields.io/badge/TailwindCSS-3-teal?logo=tailwindcss" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Features](#features)
- [Onboarding Flow](#onboarding-flow)
- [Investment Engine](#investment-engine)
- [Third-Party Integrations](#third-party-integrations)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)

---

## Overview

Mint is a wealth and investment platform targeting South African retail investors. Users can invest in curated strategy baskets (multi-stock JSE portfolios), track live portfolio performance, manage credit facilities, send investment gifts, and onboard family members — all through a native-feeling mobile web app with optional Capacitor-based iOS/Android packaging.

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| **React** | 18.3 | UI component framework |
| **Vite** | 7 | Build tool and dev server |
| **Tailwind CSS** | 3.4 | Utility-first styling |
| **Framer Motion** | 11 | Page transitions and animations |
| **Recharts** | 3.8 | Portfolio equity curves and pie charts |
| **Lucide React** | 0.451 | Icon library |
| **jsPDF + jspdf-autotable** | 4.2 / 5.0 | Client-side PDF generation (factsheets, statements, loan agreements) |
| **Signature Pad** | 5.1 | In-app digital signature capture |
| **react-pdf / pdfjs-dist** | 10.4 / 5.4 | In-app PDF rendering |
| **CryptoJS** | 4.2 | SHA-256 PIN hashing |
| **@sumsub/websdk-react** | 2.6 | Embedded KYC verification widget |
| **@anthropic-ai/sdk** | 0.96 | AI-powered features |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| **Node.js** | 20 | Runtime |
| **Express** | 5.2 | REST API server |
| **Supabase JS** | 2.107 | Database queries, auth, realtime |
| **Resend** | 6.12 | Transactional email delivery |
| **node-cron** | 4.2 | Scheduled jobs (gift expiry, price refreshes) |
| **Multer** | 2.1 | File upload handling |
| **xml2js** | 0.6 | XML parsing (broker webhook payloads) |
| **ws** | 8.21 | WebSocket transport for Supabase realtime |
| **pg** | 8.21 | Direct PostgreSQL access for migrations |
| **Axios** | 1.17 | HTTP client for third-party APIs |

---

## Architecture

The app runs as two concurrent processes:

- **Express server** (`server/index.cjs`) on port `3001` — handles all secure server-side logic: Supabase admin operations, third-party API proxying, cron jobs, file uploads, and webhooks.
- **Vite dev server** on port `5000` — serves the React frontend and proxies all `/api/*` requests to the Express server.

In production, the Express server runs standalone and the frontend is served as a static Vite build, with additional lightweight endpoints handled by Vercel serverless functions under `api/`.

### Navigation

The app uses a custom state-based navigation stack in `App.jsx` (not React Router). Pages are rendered based on `currentPage` state, with `window.history` kept in sync for browser back-button support and deep-linking.

### Authentication

Supabase Auth handles all authentication — email/password signup with OTP email verification, session refresh, and JWT-based API authorization. Sessions are cached in `sessionCache.js` to reduce redundant Supabase calls.

### Biometrics & PIN

- Native biometric authentication via `@capgo/capacitor-native-biometric` (Face ID / Touch ID)
- 5-digit PIN lock screen with SHA-256 hashing
- Both are opt-in and configurable per user in Settings

---

## Features

- **Portfolio Dashboard** — live JSE holdings, unrealised P&L, equity curves across multiple timeframes
- **Strategy Baskets** — curated multi-stock portfolios with automated weighting and fill tracking
- **Markets** — browse and filter all JSE-listed securities and strategies
- **Invest** — buy strategies or individual stocks with Ozow (EFT) or Paystack (card/EFT)
- **Credit** — credit scoring, liquidity facilities, and loan management
- **Gifting** — send investment gifts via shareable gift codes; recipients redeem into their portfolio
- **Family Accounts** — add and manage child/spouse sub-accounts with linked portfolios
- **Funeral Cover** — quote and purchase funeral cover with automated policy PDF generation
- **Statements** — downloadable PDF statements with strategy, holdings, and financial tabs
- **KYC Onboarding** — 9-step onboarding flow with Sumsub/Experian identity verification and TruID bank linking
- **Notifications** — real-time in-app notifications via Supabase subscriptions, grouped by date
- **Settings** — biometric toggle, PIN management, session timeout, active session management

---

## Onboarding Flow

```
Signup → Email OTP Verification
  ↓
Identity (SA ID Number)
  ↓
KYC — Experian / Sumsub (document scan + liveness check)
  ↓
Employment & Tax Details
  ↓
Discretionary Mandate (digital signature)
  ↓
Risk Disclosure Acceptance
  ↓
Source of Funds Declaration
  ↓
Bank Account Linking (TruID) + Bank Confirmation Letter Upload
  ↓
Terms & Conditions + Account Agreement Signature
  ↓
Onboarding Complete → Portfolio Access Unlocked
```

Completion is tracked in `user_onboarding.sumsub_raw` as individual boolean flags. `parseOnboardingFlags()` evaluates all flags consistently on both client and server.

---

## Investment Engine

### Strategy Baskets
- Strategies are defined in `strategies_c` with constituent stocks, weights, and logos
- Each purchase calculates share quantities by scaling the investment amount against the basket's reference cost
- Holdings are inserted as pending rows (`avg_fill: null`) per stock per purchase
- Rows are filled by the broker webhook (`/api/webhooks/broker`) which sets `avg_fill` (fill price in cents)

### Holdings Aggregation

```javascript
// Groups raw stock_holdings_c rows by (security_id, strategy_id, family_member_id)
// Returns one logical row per position with batches[] for stacked-card UIs
aggregateHoldings(rows) → aggregatedRows
```

### P&L Calculation
- **Pending**: `avg_fill === null` → displayed with a "Pending" badge, no P&L shown
- **Filled**: `P&L = (last_price × qty) − (avg_fill / 100 × qty)`
- `last_price` and `avg_fill` are stored in **cents** — divide by 100 for Rand values
- Strategy-level P&L is aggregated in `client_strategy_returns_c` by a scheduled job

### Minimum Investment
- Enforced per strategy based on the basket's reference price
- Calculated as `shares × (last_price / 100)` to verify the investment meets the minimum threshold

---

## Third-Party Integrations

### Experian (KYC)
- ID verification via Experian KYC V2 + ID Me Now APIs
- Controlled by `EXPERIAN_MOCK=true` in development for safe testing without live API calls

### Sumsub (KYC — legacy)
- Embedded WebSDK React component available as a fallback KYC path
- Server generates short-lived access tokens per user session

### TruID Connect (Bank Verification)
- OAuth-style redirect flow for live bank account verification
- Captures account holder name, number, and branch code
- Stores the full snapshot in `truid_bank_snapshots`

### Ozow / Paystack (Payments)
- Ozow: South African instant EFT (ZAR)
- Paystack: Card, bank, and EFT payments
- Both record transactions in the ledger on success
- Dedicated webhook endpoints for async payment confirmation

### Resend (Email)
- Order confirmation and fill notification emails
- Loan agreement and funeral cover policy emails
- All emails logged to the `order_emails` table

### Anthropic (AI)
- Accessed via `AI_INTEGRATIONS_ANTHROPIC_API_KEY` (Replit integration, auto-provisioned)

### Yahoo Finance (Market Data)
- Custom server-side proxy to avoid CORS and rate limiting
- Powers live JSE stock quotes and price history charts
- JSE prices returned in ZAp (South African cents) — same unit as `securities_c.last_price`

---

## Project Structure

```
mint/
├── server/
│   ├── index.cjs                        # Express API server (all backend routes)
│   ├── truidClient.cjs                  # TruID API client
│   └── funeralCoverMigration.cjs        # DB migration helper
│
├── api/                                 # Vercel serverless functions
│   ├── _lib/                            # Shared utilities (supabase, fees, email templates)
│   ├── onboarding/                      # Onboarding status & completion endpoints
│   ├── user/                            # User profile endpoints
│   ├── settlement/                      # Settlement config
│   ├── gift/                            # Gift creation, claim, expiry
│   ├── family-members/                  # Family account management
│   ├── credit-check/                    # Experian credit check proxy
│   ├── experian/                        # Experian KYC endpoints
│   ├── sumsub/                          # Sumsub webhook & token endpoints
│   └── ...
│
├── src/
│   ├── pages/                           # 50+ page components
│   │   ├── AuthPage.jsx                 # Login / Signup
│   │   ├── HomePage.jsx                 # Portfolio dashboard
│   │   ├── NewPortfolioPage.jsx         # Holdings & allocations
│   │   ├── MarketsPage.jsx              # Live markets & strategy discovery
│   │   ├── OnboardingPage.jsx           # KYC onboarding flow
│   │   ├── PaymentPage.jsx              # Payment method selection & processing
│   │   ├── StockDetailPage.jsx          # Individual stock view
│   │   ├── StatementsPage.jsx           # Portfolio statements & PDF export
│   │   ├── CreditPage.jsx               # Credit facility dashboard
│   │   ├── GiftStrategyPickerPage.jsx   # Investment gifting
│   │   ├── FamilyDashboardPage.jsx      # Family / child account management
│   │   └── credit/                      # Credit sub-pages (liquidity, apply, repay)
│   │
│   ├── components/                      # Reusable UI components
│   │   ├── SwipeableBalanceCard.jsx     # Home balance card + equity curve chart
│   │   ├── Navbar.jsx                   # Bottom navigation bar
│   │   ├── PinLockScreen.jsx            # PIN entry overlay
│   │   ├── PaymentMethodModal.jsx       # Payment method picker
│   │   ├── MandateViewer.jsx            # Discretionary mandate document viewer
│   │   ├── ChildInvestModal.jsx         # Child investment flow modal
│   │   └── ...
│   │
│   ├── lib/                             # Hooks, utilities, and services
│   │   ├── useFinancialData.js          # Holdings, transactions, balances
│   │   ├── useUserStrategies.js         # Strategy P&L from client_strategy_returns_c
│   │   ├── useProfile.js                # User profile state
│   │   ├── useOnboardingStatus.js       # Onboarding step tracker
│   │   ├── useInactivityTimeout.jsx     # Session timeout logic
│   │   ├── checkOnboardingComplete.js   # Shared onboarding flag parser
│   │   ├── NotificationsContext.jsx     # Real-time notification state (Context API)
│   │   ├── supabase.js                  # Supabase client with session refresh
│   │   ├── sessionCache.js              # Module-level session caching
│   │   ├── generateFactsheetPdf.js      # Strategy factsheet PDF generator
│   │   ├── generateMintStatement.js     # Account statement PDF generator
│   │   ├── generateLoanAgreementPdf.js  # Loan agreement PDF generator
│   │   ├── LendingEngine.js             # NCR-compliant credit scoring engine
│   │   ├── strategyData.js              # Strategy price history fetch
│   │   ├── marketData.js                # Market data utilities
│   │   ├── biometrics.js                # Biometric auth wrapper
│   │   ├── usePin.js                    # PIN management hook
│   │   ├── usePersistedFilters.js       # localStorage filter persistence
│   │   └── userCacheReset.js            # Cache invalidation callbacks
│   │
│   ├── App.jsx                          # Root app with navigation stack
│   └── main.jsx                         # Entry point
│
├── scripts/
│   ├── post-merge.sh                    # Runs npm install after git merges
│   └── run_daily_metrics.sh             # Daily metrics cron helper
│
├── public/                              # Static assets (fonts, images, email templates)
├── capacitor.config.json                # Capacitor iOS/Android config
├── vite.config.js                       # Vite build configuration
├── tailwind.config.js                   # Tailwind theme configuration
├── vercel.json                          # Vercel deployment config
└── package.json
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- A Supabase project (PostgreSQL + Auth)
- (Optional) Capacitor CLI for mobile builds

### Installation

```bash
git clone https://github.com/your-org/mint.git
cd mint
npm install
```

### Development

```bash
npm run dev
```

Starts both the Express API server (port `3001`) and the Vite dev server (port `5000`) concurrently. Open `http://localhost:5000`.

### Build

```bash
npm run build
```

### Mobile (Capacitor)

```bash
npx cap sync
npx cap open ios      # Open in Xcode
npx cap open android  # Open in Android Studio
```

---

## Environment Variables

All secrets should be stored in your environment's secret manager (Replit Secrets, Vercel Environment Variables, etc.) — **never hardcoded in source files or committed to version control**.

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (server-side only) |
| `VITE_PAYSTACK_PUBLIC_KEY` | ✅ | Paystack public key (client-side) |
| `PAYSTACK_SECRET_KEY` | ✅ | Paystack secret key (server-side) |
| `OZOW_SITE_CODE` | ✅ | Ozow site code |
| `OZOW_PRIVATE_KEY` | ✅ | Ozow private key |
| `RESEND_API_KEY` | ✅ | Resend email API key |
| `SUMSUB_APP_TOKEN` | Optional | Sumsub KYC app token |
| `SUMSUB_SECRET_KEY` | Optional | Sumsub KYC secret key |
| `EXPERIAN_KYC_USERNAME` | Optional | Experian KYC username |
| `EXPERIAN_KYC_PASSWORD` | Optional | Experian KYC password |
| `GOOGLE_CLOUD_VISION_API_KEY` | Optional | Google Vision OCR for bank letter verification |
| `ADMIN_SECRET` | Optional | Secret for admin-only API routes |
| `EXPERIAN_MOCK` | Dev | Set to `true` to skip live Experian calls in development |

---

## Deployment

### Vercel (Web)
The app deploys to Vercel with:
- Vite static build for the frontend (`dist/`)
- Serverless functions under `api/` for lightweight endpoints
- The Express server (`server/index.cjs`) running alongside for cron jobs, webhooks, and file uploads

```bash
npm run build
vercel --prod
```

### Replit (Development / Staging)
The app runs natively on Replit via the `npm run dev` workflow. All secrets are managed via Replit Secrets (not `.env` files).

### Mobile (Capacitor)
Update `server.url` in `capacitor.config.json` to your production domain before running:

```bash
npx cap sync
npx cap open ios
```

---

## License

Private — All rights reserved. © 2026 Mint Platforms (Pty) Ltd.
