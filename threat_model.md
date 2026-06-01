# Threat Model

## Project Overview

Mint Auth is a React 18 + Vite financial application with a mixed backend made up of Vercel-style serverless functions in `api/` and a separate Express server in `server/`. It handles user authentication via Supabase Auth, onboarding/KYC, wallet transfers, child/family account management, investment actions, gift flows, and credit-checking integrations with TruID and Experian.

Production scope for this scan includes the React client, the `api/` serverless routes, and backend code in `server/` that is used by the production app or scheduled jobs. Mock/dev-only surfaces such as `api/mock-mode/` are lower priority and should be ignored unless production reachability introduces real impact. TLS is assumed to be provided by the platform in production.

## Assets

- **User accounts and sessions** — Supabase user identities, access tokens, session fingerprints, PIN/biometric unlock state. Compromise enables account takeover or persistent unauthorized access.
- **Financial account data** — wallet balances, transactions, holdings, strategies, child-account balances, gift claims, and settlement state. Tampering can directly move or destroy value.
- **KYC and personal data** — names, email addresses, phone numbers, ID numbers, dates of birth, addresses, bank-linking status, and uploaded identity/address documents. Exposure creates privacy, fraud, and compliance risk.
- **Privileged backend credentials** — `SUPABASE_SERVICE_ROLE_KEY`, payment/provider keys, Resend credentials, Sumsub/TruID/Experian secrets. Leakage would bypass application-layer protections and expose upstream services.
- **Risk and credit-scoring inputs** — TruID bank snapshots, KYC pack details, onboarding employment data, and generated scoring outputs. These drive lending decisions and are sensitive both for privacy and business integrity.

## Trust Boundaries

- **Client to backend boundary** — browser/mobile clients call `/api/*` and Express endpoints. All client input is untrusted, even when the UI supplies it.
- **Backend to Supabase boundary** — server code can use either user-scoped Supabase clients or the service-role client. Any accidental use of service-role where user scoping is expected bypasses RLS and turns auth bugs into full data exposure.
- **Backend to external providers boundary** — Sumsub, TruID, Experian, Paystack, and Resend calls rely on backend-held credentials and process sensitive data.
- **Public to authenticated boundary** — some routes are intended to be public (gift landing/status style flows), while most financial, profile, family, and onboarding operations should require a valid authenticated user and server-side authorization.
- **Primary account to linked/family account boundary** — parent/spouse/child relationships create a high-risk authorization boundary. The backend must verify ownership and management rights rather than trusting caller-supplied IDs.
- **Production to dev/test boundary** — local diagnostics, mock-mode behavior, and server migration helpers may exist in the repo but should not be treated as safe if reachable in production.

## Scan Anchors

- Production entry points: `src/` frontend, `api/` serverless routes, `server/index.cjs` Express backend.
- Highest-risk areas: `api/_lib/supabase.js`, family/child account routes, gift claim flows, onboarding upload routes, credit-check and banking integrations.
- Public/authenticated boundary: gift preview/lookup style endpoints may be public; account, wallet, onboarding, family, and investment routes should be authenticated and authorized server-side.
- Dev-only or usually lower-priority areas: `api/mock-mode/`, static assets, mobile wrapper projects unless they expose tokens or weaken auth guarantees.

## Threat Categories

### Spoofing

The application relies on Supabase bearer tokens as the main identity proof. Protected routes must validate a live token on every request and must not fall back to caller-controlled identifiers when authentication fails. Session-related endpoints must never treat backend errors as implicit success.

### Tampering

Financial actions such as wallet transfers, child investments, gift claims, onboarding progression, and family-member updates must be authorized server-side against the authenticated user. The backend must compute or verify sensitive state transitions itself and must not trust user-controlled IDs, role hints, or relationship metadata supplied by the client.

### Information Disclosure

The application stores highly sensitive financial and KYC data, including SA ID numbers, addresses, bank-linking state, and child-account information. API responses must be scoped to the authenticated principal or explicitly public resource, and privileged service-role access must not be used in a way that exposes arbitrary rows to any authenticated or unauthenticated caller.

### Denial of Service

Public or weakly protected endpoints can be abused to trigger repeated expensive work, exhaust third-party quotas, or corrupt financial state. Credit-check, gift-code verification, upload, and transactional routes need rate limits and failure handling that do not let attackers burn resources or repeatedly mutate balances.

### Elevation of Privilege

The most important privilege boundary is between ordinary users and the backend’s service-role access. Any route that accidentally prefers a service-role client, omits ownership checks, or exposes legacy mutation endpoints can escalate a low-privilege or unauthenticated caller into broad cross-account data access or financial tampering.
