# Mint — User Experience Improvement Notes

## Animations

### ✅ 1. Stock Chart Entry Animation
When switching period tabs (1W → 1M → YTD), the chart data swaps instantly with no transition. A smooth path-draw animation (SVG stroke-dashoffset trick or Recharts animation prop) would make the chart feel alive rather than jarring.
**Implemented:** `motion.svg` with `key={selectedPeriod}` triggers a fade-in transition on every tab switch via Framer Motion.

### ✅ 2. Balance Card Number Counter
When the home balance loads, the number jumps from 0 to the actual value abruptly. An animated counting effect (counting up over ~600ms) would make the balance feel premium and satisfying — common in top fintech apps.
**Implemented:** `useAnimatedNumber` hook in `SwipeableBalanceCard.jsx` smoothly counts from previous to new value with an ease-out cubic curve (~900ms).

### ✅ 3. Notification Badge Pulse
The notification bell badge is static. A subtle pulse/ring animation when a new notification arrives would draw attention naturally without being annoying.
**Implemented:** `NotificationBell.jsx` now uses Framer Motion `animate` ping/scale cycles when `hasNew` is true.

### ✅ 4. Pull-to-Refresh Indicator
There is no visual feedback when data is refreshing. A custom Framer Motion spring indicator (instead of the browser's native one) would feel more iOS-native.
**Implemented:** Touch-based pull indicator in `HomePage.jsx` with a rotating arrow that tracks pull distance and transitions to a spinner when threshold is met.

### ✅ 5. Skeleton Loading States
Several screens show blank/empty states while data loads. Shimmer skeleton placeholders (animated gradient sweep) would make loading feel intentional rather than broken.
**Implemented:** Bar-chart shimmer skeleton in `StockDetailPage.jsx` chart section — staggered animated bars replace the "Loading chart..." text.

---

## User Journey

### 6. Onboarding Progress Feel
The 6-step onboarding flow does not give users a clear sense of how long it will take upfront. A quick "This takes about 5 minutes" intro screen with a step overview would reduce abandonment.

### 7. First Investment Moment
After a user places their first investment, there is no celebration moment. A confetti burst or subtle "You're invested!" hero card would mark the milestone and build emotional attachment to the product.

### ✅ 8. Empty Portfolio State
When a user has no holdings, the home screen shows nothing meaningful. A personalised "Your investment journey starts here" card with a direct CTA to browse strategies would reduce friction at the most critical drop-off point.
**Implemented:** Gradient purple card in `HomePage.jsx` with "View Strategies" and "Browse Stocks" CTAs shown when `!hasInvestments && !financialLoading`.

### 9. Child Account Creation
The 4-step child account modal is dense. Breaking it into a guided visual wizard (with illustrations per step) would make it feel less like a form and more like a guided flow.

### ✅ 10. Strategy "Learn Before You Invest" Flow
Users go from browsing a strategy directly to investing with no middle step. A brief strategy summary screen (risk level, top holdings, past returns) before the invest button is tapped would build confidence and reduce hesitation.
**Implemented:** "Know before you invest" panel in `OpenStrategiesPage.jsx` strategy preview modal showing risk level badge, description, and a risk disclosure note — appears above the View Factsheet button.

---

## UX Improvements

### ✅ 11. Swipe to Dismiss Notifications
Swipe-to-delete is implemented but there is no visual affordance — no swipe hint, no red background revealed on partial swipe. Adding the red delete reveal as the user swipes would make it feel native.
**Implemented:** `NotificationsPage.jsx` `NotificationItem` now uses Framer Motion `drag="x"` with a red background that's always present beneath and revealed as the card slides — auto-dismisses at 80px threshold with a collapse animation.

### ✅ 12. Period Tab Persistence on Stock Detail Page
If you are on the 3M tab and navigate back, then forward to the same stock, the tab resets to default. Persisting the last-used period per stock (like how filters are already persisted elsewhere) would feel polished.
**Implemented:** `StockDetailPage.jsx` reads from `localStorage.getItem("stockDetailPeriod")` on mount and writes back on every tab change.

### ✅ 13. Long-Press / Scrub on Chart
There is no scrubbing or crosshair interaction on the stock charts. Holding and dragging to see the price at any historical date is a standard fintech pattern (Robinhood, Trading212) that significantly increases engagement.
**Implemented:** `StockDetailPage.jsx` chart container listens to mouse/touch move events, renders a dashed vertical crosshair + filled dot on the line, and shows a price + date tooltip above the chart.

### 14. Haptic Feedback on Invest Confirmation
The investment confirmation button fires a transaction but there is no haptic response. A success haptic (via Capacitor) on order confirmation would make the action feel concrete and final.

### 15. Settings Biometric Toggle Confirmation
When the biometric toggle is switched on, the transition is instant. A brief "Face ID enabled ✓" inline confirmation that fades out would close the loop for the user without needing a toast.

---

## Priority Picks
The highest-impact improvements, based on the moments users care about most:

1. ✅ **#13 — Chart scrubbing / long-press crosshair** (engagement)
2. ✅ **#1 — Chart period tab animation** (polish)
3. **#7 — First investment celebration moment** (emotional attachment)
4. ✅ **#8 — Empty portfolio state with CTA** (conversion / retention)
