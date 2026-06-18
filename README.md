# Mint — Investment & Wealth Platform..

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
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Authentication & Security](#authentication--security)
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
| **Supabase JS** | 2.106 | Database queries, auth, realtime |
| **Resend** | 6.12 | Transactional email delivery |
| **node-cron** | 4.2 | Scheduled jobs (gift expiry) |
| **Multer** | 2.1 | File upload handling |
| **xml2js** | 0.6 | XML parsing (broker webhook payloads) |
| **ws** | 8.20 | WebSocket transport for Supabase realtime |
| **pg** | 8.21 | Direct PostgreSQL access for migrations |
| **Axios** | 1.16 | HTTP client for third-party APIs |

### Infrastructure & Services

| Service | Purpose |
|---|---|
| **Supabase** | PostgreSQL database, auth, real-time subscriptions, storage |
| **Vercel** | Serverless API deployment and cron scheduling |
| **Capacitor 8** | iOS and Android native app wrapper |
| **Sumsub** | KYC / AML identity verification |
| **TruID Connect** | Bank account verification and linking |
| **Ozow** | Instant EFT payment processing (ZAR) |
| **Paystack** | Card and bank payment gateway (ZAR) |
| **Resend** | Transactional email (order confirmations, newsletters, loan agreements) |
| **Yahoo Finance (proxy)** | Live JSE stock price data |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Frontend                           │
│         (Vite · Tailwind · Framer Motion · Recharts)            │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │  Pages (50+) │  │  Components  │  │  Custom Hooks/Lib  │   │
│  │  Auth · KYC  │  │ SwipeCard    │  │ useFinancialData   │   │
│  │  Portfolio   │  │ Modals       │  │ useUserStrategies  │   │
│  │  Markets     │  │ Charts       │  │ useProfile         │   │
│  │  Credit      │  │ PDFs         │  │ NotificationsCtx   │   │
│  │  Gifts       │  │ Realtime     │  │ useInactivityTimer │   │
│  └──────────────┘  └──────────────┘  └────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │  REST / Fetch
┌────────────────────────────▼────────────────────────────────────┐
│                     Express API Server                          │
│                    (server/index.cjs)                            │
│                                                                  │
│  Auth · Onboarding · Investments · Holdings · Wallets           │
│  KYC (Sumsub) · Banking (TruID) · Payments (Ozow/Paystack)     │
│  Credit · Sessions · Gifting · Family · Webhooks · Cron         │
└──────────┬──────────────────────────────┬───────────────────────┘
           │                              │
┌──────────▼──────────┐       ┌───────────▼───────────────────────┐
│     Supabase        │       │       Third-Party APIs             │
│  PostgreSQL · Auth  │       │  Sumsub · TruID · Ozow · Paystack  │
│  Realtime · Storage │       │  Resend · Yahoo Finance · Anthropic│
└─────────────────────┘       └────────────────────────────────────┘
```

### Key Architectural Decisions

- **Monorepo** — Frontend (React/Vite) and backend (Express) share one repository. `npm run dev` starts both concurrently.
- **Always-Insert Holdings** — Each investment purchase inserts new holding rows rather than updating existing ones, enabling full batch history and accurate pending/fill tracking. Client-side `aggregateHoldings()` collapses these into one logical position per security.
- **Client-side aggregation** — `aggregateHoldings()` groups raw `stock_holdings_c` rows by `(security_id, strategy_id, family_member_id)`. Downstream UI always sees one row per position with `batches[]` available for stacked-card UIs.
- **Module-level caching** — Strategies, sessions, and market data are cached in module-level variables to prevent skeleton flicker on navigation (survives component unmount/remount).
- **Singleton realtime subscriptions** — Supabase realtime channels (notifications, prices, required actions) use a singleton pattern to prevent duplicate subscriptions across page renders.
- **Ref-guarded submissions** — Payment confirmations use `useRef` flags (not state) for submission guards to prevent duplicate API calls from rapid taps — React state updates are async and cannot reliably block re-entrant calls.
- **JWT decode fallback** — When `supabase.auth.getUser()` returns "Auth session missing!" (invalidated session), the server decodes the JWT locally, extracts the `sub`, and confirms the user via the admin API — allowing valid users through without forcing re-login.

---

## Features

### Authentication
- Email + password signup with real-time strength validation
- 6-digit OTP email verification with 3-attempt lockout and countdown timers
- Progressive cooldowns on failed login attempts
- Secure session management with JWT decode fallback for invalidated sessions
- Active session listing and remote revocation
- Automatic session timeout with configurable inactivity period

### Security
- 5-digit PIN lock screen with SHA-256 hashing
- Native biometric authentication (Face ID / Fingerprint) via `@capgo/capacitor-native-biometric`
- Per-device session tracking with remote revocation support
- Admin API fallback for invalidated JWT sessions

### Onboarding (KYC & Compliance)
Multi-step onboarding flow required before investing:
1. **Identity** — SA ID number capture and validation
2. **KYC** — Sumsub embedded WebSDK (document scan + liveness check)
3. **Employment & Tax** — Income, employer, and tax number
4. **Discretionary Mandate** — Digital signature via Signature Pad
5. **Risk Disclosure** — Regulatory risk acceptance
6. **Source of Funds** — Declaration and acceptance
7. **Bank Account** — TruID-verified bank linking + bank confirmation letter upload
8. **Terms & Conditions** — Final agreement signature and PDF download

### Portfolio & Investing
- Strategy baskets — curated multi-stock JSE portfolios (e.g. Yield Basket, Growth Basket)
- Live JSE price data via Yahoo Finance proxy
- Pending / filled holdings tracking with settlement badges
- Portfolio equity curve charts (5D, 1M, YTD, All) anchored to purchase date
- Calendar returns heatmap
- PDF factsheet generation per strategy, personalised with the user's investment data
- Holdings breakdown with constituent stock drill-down
- Allocation pie chart with interactive segments

### Markets
- Live intraday data for 130+ JSE-listed securities
- Stock detail pages with price history charts
- Strategy discovery and performance comparison
- Persistent filter state (saved to localStorage per context)

### Payments
- **Wallet** — Internal balance with deduction and real-time update
- **Paystack** — Card / bank / EFT (ZAR)
- **Ozow** — Instant EFT (ZAR)
- **Direct EFT** — Manual bank transfer with reference generation and admin confirmation flow
- Duplicate-submission guard using a `useRef` lock (prevents double-tap race conditions)

### Credit & Liquidity
- Credit score assessment
- Instant and active liquidity facilities
- Loan application engine with scoring (`LendingEngine.js`)
- Repayment management
- Loan agreement PDF generation and email delivery

### Gifting
- Send investment gifts (strategy-linked) to other users or new contacts
- OTP-verified gift claiming
- Self-claim flow
- Gift expiry and extension management
- Sent gifts history

### Family & Child Accounts
4-step child account onboarding:
1. ID number capture
2. Birth certificate upload
3. Proof of address declaration
4. Parental responsibility agreement

Child accounts have fully isolated portfolios, wallets, and strategy returns — no data bleeds between parent and child caches.

### Notifications
- Real-time push via Supabase `postgres_changes` subscriptions
- Grouped by date with unread badge count
- Swipe-to-delete (mobile gesture)
- Mark all as read
- Required actions feed (KYC alerts, pending onboarding steps)

### Statements
- Strategy performance tab
- Holdings snapshot tab
- Financial transactions tab
- PDF statement download (generated client-side)

### Insurance (Funeral Cover)
- Policy application flow
- Premium calculation by tier
- Policy PDF generation and email delivery

### Scheduled Jobs (Cron)
| Job | Schedule | Description |
|---|---|---|
| Gift Expiry | Every 15 min | Automatically expires unclaimed gifts past their deadline |

---

## Database Schema

Core Supabase (PostgreSQL) tables:

| Table | Purpose |
|---|---|
| `profiles` | User profile (name, ID number, address, mint_number) |
| `user_onboarding` | KYC status, sumsub_raw flags, bank details, employment, signatures |
| `wallets` | User wallet balance (stored in cents) and rebalance residual |
| `stock_holdings_c` | Individual holding rows per purchase batch (always-insert pattern) |
| `strategies_c` | Strategy definitions (name, constituent stocks, weights, logos) |
| `client_strategy_returns_c` | Admin-computed daily P&L snapshots per user per strategy |
| `transactions` | Investment, fee, and payment transaction ledger |
| `securities` | JSE securities master (symbol, name, logo, last_price) |
| `securities_c` | Extended securities with intraday metrics |
| `stock_intraday_c` | Intraday OHLCV data per security |
| `News_articles` | Curated financial news articles |
| `family_members` | Child account linkage (parent_id → child profile) |
| `truid_bank_snapshots` | TruID bank verification snapshots |
| `loan_application` | Credit facility applications |
| `loan_engine_score` | Credit scoring results |
| `order_emails` | Log of sent order confirmation and fill emails |
| `user_onboarding_pack_details` | Extended onboarding document metadata |

---

## API Reference

All endpoints are prefixed `/api/` and served by `server/index.cjs`.

### Auth & Sessions
| Method | Route | Description |
|---|---|---|
| GET | `/api/health` | Server health check |
| GET | `/api/version` | App version |
| POST | `/api/sessions/record` | Record a new device session |
| GET | `/api/sessions/list` | List active sessions for the user |
| POST | `/api/sessions/revoke` | Revoke a specific session |
| POST | `/api/sessions/revoke-others` | Revoke all other sessions |
| POST | `/api/sessions/validate` | Validate a session token |

### Onboarding & KYC
| Method | Route | Description |
|---|---|---|
| GET | `/api/onboarding/status` | Full onboarding status with `is_fully_onboarded` flag |
| POST | `/api/onboarding/complete` | Mark onboarding complete |
| POST | `/api/onboarding/check-id-number` | Validate SA ID number (format + Luhn) |
| POST | `/api/onboarding/save-employment` | Save employment and income details |
| POST | `/api/onboarding/save-mandate` | Save discretionary mandate acceptance |
| POST | `/api/onboarding/upload-agreement` | Upload signed account agreement PDF |
| POST | `/api/onboarding/upload-bank-letter` | Upload bank confirmation letter |
| POST | `/api/onboarding/mandate` | Retrieve mandate document |

### Sumsub (KYC)
| Method | Route | Description |
|---|---|---|
| POST | `/api/sumsub/access-token` | Generate Sumsub WebSDK access token |
| GET | `/api/sumsub/status` | Current KYC review status |
| POST | `/api/sumsub/sync` | Sync Sumsub review result to DB |
| POST | `/api/sumsub/webhook` | Sumsub event webhook receiver |

### Banking (TruID)
| Method | Route | Description |
|---|---|---|
| POST | `/api/truid/initiate` | Initiate TruID bank-linking session |
| GET | `/api/truid/status` | Check TruID verification status |
| POST | `/api/truid/webhook` | TruID event webhook receiver |
| GET | `/api/banking/accounts` | List linked bank accounts |
| POST | `/api/banking/initiate` | Start bank verification |
| POST | `/api/banking/capture` | Capture bank details |
| GET | `/api/banking/status` | Bank verification status |
| POST | `/api/banking/unlink` | Unlink a bank account |
| POST | `/api/banking/verify-letter` | Verify uploaded bank confirmation letter |

### Investments & Portfolio
| Method | Route | Description |
|---|---|---|
| POST | `/api/record-investment` | Record a purchase (deduct wallet, insert holdings, create transactions) |
| GET | `/api/user/holdings` | Get aggregated user holdings |
| GET | `/api/user/transactions` | Get transaction history |
| GET | `/api/user/strategies` | Get user's active strategies with P&L |
| GET | `/api/user/strategy-subscriptions` | List strategy subscriptions |
| GET | `/api/stocks/quote` | Get live stock quote |
| GET | `/api/stocks/chart` | Get stock price history |
| POST | `/api/webhooks/broker` | Broker fill notification webhook |
| POST | `/api/webhooks/csdp` | CSDP settlement webhook |

### Payments
| Method | Route | Description |
|---|---|---|
| POST | `/api/eft-deposit` | Record EFT deposit intent or confirmation |
| POST | `/api/confirm-eft-deposit` | Admin confirms EFT receipt and releases holdings |
| POST | `/api/confirm-deposit` | Confirm a deposit |
| POST | `/api/ozow/initiate` | Initiate Ozow payment |
| POST | `/api/ozow/notify` | Ozow async payment notification |
| POST | `/api/ozow/record-success` | Record successful Ozow payment |
| POST | `/api/reconcile-payments` | Reconcile pending payment records |

### Gifting
| Method | Route | Description |
|---|---|---|
| POST | `/api/gift/create` | Create an investment gift |
| GET | `/api/gift/:token` | Get gift details by token |
| POST | `/api/gift/claim` | Claim a gift |
| POST | `/api/gift/verify-code` | Verify gift OTP code |
| POST | `/api/gift/request-otp` | Request a new gift OTP |
| GET | `/api/gift/sent` | List sent gifts |
| POST | `/api/gift/cancel` | Cancel a gift |
| POST | `/api/gift/expire` | Expire a gift |
| POST | `/api/gift/extend` | Extend a gift's expiry date |

### Family & Child Accounts
| Method | Route | Description |
|---|---|---|
| GET | `/api/family-members` | List family members |
| POST | `/api/family-members` | Add a family member |
| GET | `/api/family-members/:id` | Get a specific family member |
| POST | `/api/family-members/confirm-pairing` | Confirm child account pairing |
| POST | `/api/child-invest` | Record a child investment |
| GET | `/api/child-wallet` | Get child wallet balance |
| GET | `/api/child-transactions` | Get child transaction history |

### Credit
| Method | Route | Description |
|---|---|---|
| POST | `/api/credit-check` | Run credit assessment |
| GET | `/api/loan/email-agreement` | Email loan agreement PDF to user |

### Settlement & Config
| Method | Route | Description |
|---|---|---|
| GET | `/api/settlement/config` | Get settlement configuration (`fullyIntegrated` flag) |

---

## Authentication & Security

### JWT Auth Flow

```
Client  →  Bearer token in Authorization header
Server  →  supabase.auth.getUser(jwt)
            ├── Success → proceed with user
            └── "Auth session missing!" (invalidated session)
                  → Decode JWT locally → extract sub (user_id)
                  → supabaseAdmin.auth.admin.getUserById(userId)
                  → User confirmed → proceed with admin client
```

### Session Management
- Every login records a session row (device, IP, user-agent, timestamp)
- Users can view all active sessions and revoke any of them remotely
- Server validates session tokens on sensitive routes

### PIN Lock
- 5-digit PIN hashed with SHA-256 before storage
- Lock screen activates after a configurable inactivity timeout
- Failed PIN attempts trigger a lockout

### Biometrics
- `@capgo/capacitor-native-biometric` for Face ID / Touch ID on iOS and Android
- Falls back to PIN when biometrics are unavailable
- Toggle per user in Settings

---

## Onboarding Flow

```
Signup → Email OTP Verification
  ↓
Identity (SA ID Number)
  ↓
KYC — Sumsub WebSDK (document scan + liveness check)
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

Completion is tracked in `user_onboarding.sumsub_raw` as individual boolean flags. `parseOnboardingFlags()` evaluates all flags consistently on both client and server. Legacy users with `kyc_status = "onboarding_complete"` are grandfathered in automatically.

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
- Cost basis prefers `Expected_fill` (price at click time, in rands) over `avg_fill` (broker fill, in cents)
- Strategy-level P&L is aggregated in `client_strategy_returns_c` by an admin job

### Minimum Investment
- Enforced per strategy based on the basket's reference price
- Calculated as `shares × (last_price / 100)` to verify the investment meets the minimum threshold

---

## Third-Party Integrations

### Sumsub (KYC)
- Embedded WebSDK React component in the onboarding flow
- Server generates short-lived access tokens per user session
- Webhook receives review results and updates `user_onboarding.kyc_status`
- Client polls status with exponential backoff

### TruID Connect (Bank Verification)
- OAuth-style redirect flow for live bank account verification
- Captures account holder name, number, and branch code
- Stores the full snapshot in `truid_bank_snapshots`
- Pre-fills and verifies bank details during onboarding

### Ozow / Paystack (Payments)
- Ozow: South African instant EFT (ZAR)
- Paystack: Card, bank, and EFT payments
- Both record transactions in the ledger on success
- Dedicated webhook endpoints for async payment confirmation

### Resend (Email)
- Order confirmation emails on investment purchase
- Fill notification emails when broker confirms
- Loan agreement emails
- Funeral cover policy emails
- All emails logged to the `order_emails` table

### Yahoo Finance (Market Data)
- Custom server-side proxy to avoid CORS and rate limiting
- Powers live stock quotes and price history charts
- Supplemented by `stock_intraday_c` and `securities_c` Supabase tables

---

## Project Structure

```
mint/
├── server/
│   ├── index.cjs                        # Express API server (all routes)
│   ├── truidClient.cjs                  # TruID API client
│   ├── funeralCoverMigration.cjs        # DB migration script
│   └── strategySubscriptionMigration.cjs
│
├── api/                                 # Vercel serverless functions
│   ├── onboarding/
│   ├── user/
│   ├── settlement/
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
│   │   ├── LendingEngine.js             # Credit scoring engine
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
├── capacitor.config.json                # Capacitor iOS/Android config
├── vite.config.js                       # Vite build configuration
├── tailwind.config.js                   # Tailwind theme configuration
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

Starts both the Express API server and the Vite dev server concurrently. The app is available at `http://localhost:5000`.

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

Create a `.env.local` file in the project root:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Payments
VITE_PAYSTACK_PUBLIC_KEY=pk_live_...
PAYSTACK_SECRET_KEY=sk_live_...
OZOW_SITE_CODE=your-site-code
OZOW_PRIVATE_KEY=your-private-key

# Email
RESEND_API_KEY=re_...

# KYC
SUMSUB_APP_TOKEN=your-token
SUMSUB_SECRET_KEY=your-secret

# Banking
TRUID_CLIENT_ID=your-client-id
TRUID_CLIENT_SECRET=your-secret

# Admin
ADMIN_SECRET=your-admin-secret
```

---

## Deployment

The app deploys to **Vercel** with:
- Vite static build for the frontend (`dist/`)
- Serverless functions under `api/` for lightweight endpoints
- The Express server (`server/index.cjs`) running alongside for stateful work (cron jobs, webhooks, file uploads)

```bash
npm run build
vercel --prod
```

For Capacitor mobile builds, update `server.url` in `capacitor.config.json` to your production domain before running `npx cap sync`.

---

## License

Private — All rights reserved. © 2026 Mint Platforms (Pty) Ltd.
