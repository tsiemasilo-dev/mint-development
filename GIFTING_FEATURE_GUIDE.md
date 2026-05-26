# MINT Gifting Feature - Developer Handover Guide

## Overview
The gifting feature allows MINT users to send investment gifts (stocks or strategies) to friends and family. Recipients can claim these gifts by entering a 6-digit code and their SA ID number.

---

## Table of Contents
1. [Architecture](#architecture)
2. [Database Schema](#database-schema)
3. [API Endpoints](#api-endpoints)
4. [Frontend Flow](#frontend-flow)
5. [User Flows](#user-flows)
6. [Key Features](#key-features)
7. [Configuration](#configuration)
8. [Testing Guide](#testing-guide)
9. [Troubleshooting](#troubleshooting)

---

## Architecture

### System Components
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   API Server    │────▶│   Supabase      │
│   (React/Vite)  │◀────│   (Express)     │◀────│   (Postgres)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Gift Flow Architecture
```
Sender Flow:
  InvestPage/StockBuyPage ──▶ GiftToggleV2 ──▶ POST /api/gift/create-v2
                                                          │
                                                          ▼
  SentGiftsPageV2 ◀──────────── gift_claims table ◀──── Success
         │
         ├──▶ POST /api/gift/extend (extend expiry)
         ├──▶ POST /api/gift/cancel (cancel gift)
         └──▶ POST /api/gift/claim-to-self (claim expired)

Recipient Flow:
  GiftCodeEntryPage ──▶ POST /api/gift/verify-code
                              │
                              ▼
                    ┌──────────────────────┐
                    │  Recipient Status?   │
                    └──────────────────────┘
                          │         │
                    Registered   Not Registered
                          │         │
                          ▼         ▼
                   GiftPreviewPage  Signup Flow
                          │
                          ▼
                   POST /api/gift/claim-v2
```

---

## Database Schema

### Primary Table: `gift_claims`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `sender_user_id` | UUID | User who sent the gift |
| `recipient_user_id` | UUID | User who claimed (null until claimed) |
| `recipient_identifier` | TEXT | SA ID number of recipient |
| `amount` | INTEGER | Amount in cents |
| `asset_type` | TEXT | "strategy" or "stock" |
| `asset_name` | TEXT | Display name of asset |
| `strategy_id` | UUID | Strategy reference (if strategy gift) |
| `security_id` | UUID | Security reference (if stock gift) |
| `security_symbol` | TEXT | Stock symbol (if stock gift) |
| `token` | TEXT | 6-digit gift code (e.g., "123456") |
| `status` | TEXT | pending_claim, claimed, expired, cancelled |
| `message` | JSON | `{fn, ln, msg}` - recipient names + message |
| `expires_at` | TIMESTAMP | Expiry time (default: 4 hours) |
| `created_at` | TIMESTAMP | Creation time |
| `claimed_at` | TIMESTAMP | When claimed |
| `cancelled_at` | TIMESTAMP | When cancelled |
| `extension_fees` | INTEGER | Total fees paid for extensions (cents) |

### Status Flow
```
[pending_claim] ──▶ [claimed]
       │
       ├──▶ [expired] (after 4 hours or cron job)
       └──▶ [cancelled] (sender action)
```

---

## API Endpoints

### 1. Create Gift
**POST** `/api/gift/create-v2`

Creates a new gift and deducts amount from sender's wallet.

**Request:**
```json
{
  "asset_type": "strategy" | "stock",
  "strategy_id": "uuid",
  "security_id": "uuid",
  "security_symbol": "AAPL",
  "asset_name": "Conservative Strategy",
  "amount": 100000,
  "recipient_first_name": "John",
  "recipient_last_name": "Doe",
  "message": "Happy Birthday!"
}
```

**Response:**
```json
{
  "success": true,
  "token": "123456",
  "expires_at": "2025-01-15T16:00:00Z",
  "gift_id": "uuid"
}
```

**Error Codes:**
- 401: Unauthorized
- 400: Invalid input, insufficient wallet balance
- 500: Database error, code generation failed

---

### 2. Verify Gift Code
**POST** `/api/gift/verify-code`

Validates gift code + SA ID, returns gift preview and recipient status.

**Request:**
```json
{
  "sa_id": "9001011234087",
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "gift_preview": {
    "asset_name": "Conservative Strategy",
    "sender_name": "Jane Smith",
    "message": "Happy Birthday!",
    "expires_at": "2025-01-15T16:00:00Z",
    "amount_cents": 100000,
    "amount_display": "R1,000.00"
  },
  "is_registered": true,
  "has_kyc": true,
  "has_mint_number": true,
  "onboarding_complete": true
}
```

**Rate Limiting:** 5 attempts per 10-minute window per SA ID.

---

### 3. Claim Gift
**POST** `/api/gift/claim-v2`

Claims the gift and allocates holdings to recipient's portfolio.

**Requirements:**
- User must be authenticated
- SA ID must match authenticated user's profile
- KYC must be complete (kyc_status = "verified" or "onboarding_complete")
- Must have mint_number set

**Request:**
```json
{
  "code": "123456",
  "sa_id": "9001011234087"
}
```

**Response:**
```json
{
  "success": true,
  "holding_id": "uuid",
  "asset_name": "Conservative Strategy"
}
```

**What it does:**
1. Verifies gift is pending and not expired
2. Validates recipient's KYC and mint_number
3. Allocates strategy holdings or stock holdings
4. Marks gift as claimed
5. Records credit transaction for recipient
6. Notifies sender

---

### 4. Get Sent Gifts
**GET** `/api/gift/sent`

Returns all gifts sent by authenticated user.

**Response:**
```json
{
  "success": true,
  "active": [...],
  "history": [...]
}
```

---

### 5. Extend Gift
**POST** `/api/gift/extend`

Extends gift expiry time (sender only).

**Extensions:**
- "10h" - 10 hours, 5% fee
- "24h" - 24 hours, 9% fee

**Request:**
```json
{
  "gift_id": "uuid",
  "extension": "10h" | "24h"
}
```

---

### 6. Cancel Gift
**POST** `/api/gift/cancel`

Cancels a pending gift and refunds sender's wallet.

**Request:**
```json
{
  "gift_id": "uuid"
}
```

---

### 7. Claim to Self
**POST** `/api/gift/claim-to-self`

Allows sender to claim an expired/cancelled gift to their own portfolio.

**Request:**
```json
{
  "gift_id": "uuid"
}
```

**Requirements:**
- Only sender can claim
- Gift must be expired or cancelled
- Sender needs KYC and mint_number
- Wallet is charged the gift amount (treating as purchase)

---

### 8. Expire Gifts (Cron)
**POST** `/api/gift/expire`

Marks expired gifts and refunds senders. Called by cron job.

---

## Frontend Flow

### 1. Sending a Gift

**Entry Points:**
- `InvestAmountPage.jsx` - Strategy investment with gift toggle
- `StockBuyPage.jsx` - Stock purchase with gift toggle

**Component:** `GiftToggleV2.jsx`

```jsx
// Usage in InvestAmountPage
<GiftToggleV2
  enabled={giftEnabled}
  onToggle={setGiftEnabled}
  onDone={onGiftDone}
  security={{ id: strategy.id, symbol: strategy.name, name: strategy.name }}
  assetType="strategy"
  totalCostCents={Math.round(fees.totalCost * 100)}
  amountDisplay={formatCurrency(fees.totalCost, currency)}
/>
```

**GiftToggleV2 States:**
1. Collapsed (toggle off)
2. Form open (recipient details)
3. Confirming (loading state)
4. Success (show 6-digit code + expiry)

---

### 2. Claiming a Gift

**Entry Points:**
- `GiftCodeEntryPage.jsx` - Manual code entry
- Gift received popup (from notification)

**Flow:**
```
GiftCodeEntryPage
    │
    ├──▶ Enter SA ID + 6-digit code
    │
    ├──▶ POST /api/gift/verify-code
    │       │
    │       ├──▶ Not registered ──▶ Signup flow
    │       │
    │       ├──▶ No KYC ──▶ FICA verification flow
    │       │
    │       └──▶ Ready ──▶ GiftPreviewPage
    │
    └──▶ GiftPreviewPage
            │
            └──▶ Claim button ──▶ POST /api/gift/claim-v2
```

---

### 3. Managing Sent Gifts

**Page:** `SentGiftsPageV2.jsx`

**Features:**
- Two tabs: "Active" and "History"
- Active gifts show countdown timer
- Extend button (with fee display)
- Cancel button
- Claim to self (for expired/cancelled gifts)

---

### 4. Strategy Gift Picker

**Page:** `GiftStrategyPickerPage.jsx`

Shows available strategies with gift button, navigates to investment flow with gifting enabled.

---

## User Flows

### Flow 1: Sender - Gift a Strategy
```
1. User navigates to GiftStrategyPickerPage
2. Selects a strategy
3. Goes to InvestAmountPage with gift toggle
4. Enables gift toggle, enters recipient details
5. Confirms → sees 6-digit code
6. Shares code with recipient
7. Can view/manage in SentGiftsPageV2
```

### Flow 2: Sender - Gift a Stock
```
1. User goes to StockBuyPage
2. Selects stock and amount
3. Enables gift toggle
4. Enters recipient details
5. Confirms → sees 6-digit code
```

### Flow 3: Recipient - Claim Gift (Registered User)
```
1. Receives 6-digit code
2. Goes to GiftCodeEntryPage
3. Enters SA ID + code
4. Sees gift preview
5. Clicks Claim
6. Gift added to portfolio immediately
```

### Flow 4: Recipient - Claim Gift (New User)
```
1. Receives 6-digit code
2. Goes to GiftCodeEntryPage
3. Enters SA ID + code
4. System shows "Sign up required" gate
5. User completes signup
6. Returns to claim flow
```

### Flow 5: Sender - Manage Expired Gift
```
1. Sender goes to SentGiftsPageV2
2. Sees expired gift in History tab
3. Clicks "Add to my portfolio"
4. Gift holdings added to sender's portfolio
```

---

## Key Features

### 1. Extension Fees
| Extension | Duration | Fee |
|-----------|----------|-----|
| 10h | +10 hours | 5% of gift amount |
| 24h | +24 hours | 9% of gift amount |

Fees are deducted from sender's wallet.

### 2. Expiry Handling
- Default expiry: 4 hours from creation
- Cron job (`/api/gift/expire`) processes expired gifts
- Expired gifts refund sender automatically
- Sender can claim to self within 30 days

### 3. Rate Limiting
- Code verification: 5 attempts per 10 minutes per SA ID
- Prevents brute force attacks on gift codes

### 4. Onboarding Gates
Recipient must complete before claiming:
- Registration (account created)
- KYC/FICA verification
- Mint account setup (mint_number assigned)

### 5. Message Encoding
Recipient name and message stored as JSON in `message` column:
```json
{
  "fn": "John",
  "ln": "Doe",
  "msg": "Happy Birthday!"
}
```

---

## Configuration

### Environment Variables
```env
# Supabase (required)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Optional: Gift expiry hours (default: 4)
GIFT_EXPIRY_HOURS=4
```

### Important Constants
| Constant | Location | Value |
|----------|----------|-------|
| EXPIRY_HOURS | api/gift/create-v2.js | 4 hours |
| RATE_LIMIT | api/gift/verify-code.js | 5 attempts |
| RATE_WINDOW_MS | api/gift/verify-code.js | 10 minutes |

---

## Testing Guide

### Test Case 1: Create Strategy Gift
```bash
# POST /api/gift/create-v2
{
  "asset_type": "strategy",
  "strategy_id": "your-strategy-uuid",
  "asset_name": "Test Strategy",
  "amount": 50000,
  "recipient_first_name": "Test",
  "recipient_last_name": "User"
}
```

### Test Case 2: Verify and Claim
```bash
# POST /api/gift/verify-code
{
  "sa_id": "9001011234087",
  "code": "123456"
}

# POST /api/gift/claim-v2 (with auth token)
{
  "code": "123456",
  "sa_id": "9001011234087"
}
```

### Test Case 3: Extend Gift
```bash
# POST /api/gift/extend
{
  "gift_id": "your-gift-uuid",
  "extension": "10h"
}
```

### Test Case 4: Claim Expired to Self
1. Let gift expire (or modify expires_at in DB)
2. POST /api/gift/claim-to-self
3. Verify holdings added to sender portfolio

---

## Troubleshooting

### Issue: 404 on API endpoints
**Cause:** Port 3001 occupied by another process  
**Fix:** Kill node processes: `pkill -9 -f "node"` then restart

### Issue: "Database not connected"
**Cause:** Missing Supabase env variables  
**Fix:** Check `.env.local` has all required keys

### Issue: Gift code not found
**Cause:** Code expired or already claimed  
**Check:** Query gift_claims table for status

### Issue: Rate limited on verify-code
**Cause:** Too many attempts (5 per 10 min)  
**Fix:** Wait 10 minutes or check `gift_code_attempts` tracking

### Issue: Extension fails
**Cause:** Insufficient wallet balance for fee  
**Fix:** Check wallet balance >= (gift_amount * fee_percentage)

---

## File Reference

### API Files
```
api/gift/
├── create-v2.js         # Create new gift
├── verify-code.js       # Validate code + SA ID
├── claim-v2.js          # Claim gift to portfolio
├── claim-to-self.js     # Sender claims expired gift
├── sent.js              # List sent gifts
├── extend.js            # Extend expiry
├── cancel.js            # Cancel gift
└── expire.js            # Cron job for expiry
```

### Frontend Files
```
src/pages/
├── GiftStrategyPickerPage.jsx   # Strategy selection
├── GiftCodeEntryPage.jsx        # Code entry + verification
├── GiftPreviewPage.jsx          # Gift preview + claim
├── SentGiftsPageV2.jsx          # Manage sent gifts
├── InvestAmountPage.jsx         # Strategy invest (has GiftToggleV2)
└── StockBuyPage.jsx              # Stock buy (has GiftToggleV2)

src/components/
└── GiftToggleV2.jsx             # Gift form component
```

---

## Future Feature: Direct Child Gifting

### Current Limitation
The existing gifting system works for **independent recipients** who can:
- Receive a 6-digit code via email
- Log into their own MINT account
- Enter SA ID + code to claim the gift

**This does NOT work for managed child accounts** because:
- Child accounts don't have their own login credentials
- Child accounts are managed by the parent
- The "claim by code" flow requires the recipient to authenticate

### Desired Feature
**Direct family member gifting** — allow parents to gift directly to a child's portfolio without a claim process.

### How It Would Work

```
Parent on InvestPage/StockBuyPage
    │
    ├──▶ Select "Gift to Family Member" (new toggle option)
    │
    ├──▶ Dropdown shows managed children + external recipient option
    │       [Child 1 - Sarah, Child 2 - Mike, Someone Else...]
    │
    ├──▶ Selects "Child 1 - Sarah"
    │
    └──▶ Confirms → Holdings added DIRECTLY to Sarah's portfolio
                (no code, no expiry, no claiming)
```

### Required Implementation

**1. Frontend Changes:**
```jsx
// GiftToggleV2.jsx modifications:
- Add FamilyDropdown component (existing component can be reused)
- Add toggle: "External Recipient" vs "Family Member"
- Pass family_member_id to API when gifting to child
```

**2. Database Changes:**
```sql
-- Add to gift_claims table:
ALTER TABLE gift_claims ADD COLUMN target_family_member_id UUID REFERENCES family_members(id);
```

**3. API Changes:**

**Option A: Extend create-v2.js**
- Accept optional `family_member_id` parameter
- When present, skip code generation, auto-allocate holdings

**Option B: Create new endpoint**
- `POST /api/gift/create-for-family-member`
- Direct allocation without gift_claims row (or with status="direct")

**4. Holdings Allocation:**
```javascript
// Similar to claim-v2.js but:
- No code verification needed
- Holdings created with family_member_id set
- sender_user_id = parent
- recipient_user_id = null (child doesn't have auth account)
```

### Business Logic Considerations

| Aspect | External Gift | Family Member Gift |
|--------|--------------|-------------------|
| Code required | Yes (6-digit) | No |
| Expiry | 4 hours | None (immediate) |
| Claim process | Required | Skipped |
| Wallet deduction | At creation | At creation |
| Holdings created | On claim | Immediately |
| Cancel/Extend | Yes | No (already allocated) |

### Decision for New Dev Team

**Recommended approach:**
1. Add dropdown to `GiftToggleV2` for family member selection
2. Extend `create-v2.js` to handle `family_member_id`
3. Create immediate allocation logic (reuse claim-v2.js allocation functions)
4. Skip `gift_claims` table for family gifts OR create with status="direct_allocated"

**Estimated effort:** 1-2 days

---

## Support Contacts

For issues with:
- **Gift flow logic**: Check this guide first
- **Database issues**: Check Supabase logs
- **Payment/wallet issues**: Verify wallet balance
- **KYC verification**: Check user_onboarding table

---

*Document Version: 1.1*  
*Last Updated: May 26, 2025*  
*Feature Branch: feature/gifting*
