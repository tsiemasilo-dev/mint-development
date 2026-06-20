# INVEST Animation — Mint Baskets Coach Mark

## Overview

A two-phase coach-mark animation that plays every time the user opens the Mint Baskets tab on the Markets page. It teaches the user what Mint Baskets are through progressive disclosure — first highlighting the tab itself, then spotlighting a real strategy card with a clean contextual description written directly on the blurred background.

The animation never uses a heavy dark overlay. The page remains visible at all times with only a light blur and a subtle ~20% dim applied through 4 surrounding panels. The spotlight area itself is completely clear.

---

## Overlay Technique — 4-Panel Blur

Rather than a single fullscreen overlay with a cutout (which causes `backdrop-filter` + `clip-path` incompatibility), the overlay is composed of **4 separate panels** — top, bottom, left, right — each with:

```css
backdrop-filter: blur(7px);
background: rgba(0, 0, 0, 0.20);
```

The panels surround the spotlight target exactly, leaving a pixel-perfect clear window at the target element's `getBoundingClientRect()` position (with 8–10 px padding). The page content inside the spotlight is fully readable, unblurred, and at full opacity.

---

## Phase 0 — Tab Coach Mark (2.5 seconds, auto-advances)

**What the user sees:**
- 4 blur panels surround the "Mint Baskets" toggle button, leaving it in a clear spotlight.
- A white ring appears around the tab with `box-shadow` glow.
- Two concentric pulse rings expand outward and fade in a loop, creating a "radar" effect.
- A bouncing upward arrow + "MINT BASKETS" label appears just below the ring.
- Auto-advances to Phase 1 after 2 500 ms — no tap needed.

**Implementation:**
- `basketsTabRef` attached to the Mint Baskets `<button>` in `MarketsPage.jsx`.
- `getBoundingClientRect()` is read on mount and on window resize.
- Panels are `position: fixed` divs clipped to the four sides of the tab rect.
- Ring and pulse rings are `position: fixed` at the tab rect, using `border` + Framer Motion `animate`.

---

## Phase 1 — Card Spotlight + Left Callout

**What the user sees:**
- 4 blur panels switch to surround the target strategy card.
- The strategy card list scrolls horizontally so the card lands at ~42% from the left edge — leaving the left 38–40% of the screen as a clear blurred panel for the text callout.
- A white ring glows around the card, and a subtle opacity pulse animates on it.
- A brief press animation fires: the card scales to 97.5% and springs back.
- Clean white text appears on the LEFT blur panel directly (no box, no dark glass card):
  - "MINT BASKET" — tiny uppercase label, low-opacity white
  - Basket name — large bold white
  - Thin white divider
  - Description — regular weight, muted white
  - Three pills: JSE-listed · Expert-built · From R100
  - Thin white divider
  - "Got it" button — minimal, white border, white text
- Each text element fades and slides in sequentially (staggered, 120 ms apart).
- Tapping the dimmed area or pressing "Got it" dismisses the animation.

**Implementation:**
- `document.querySelector('[data-coach-target="true"]')` finds the Famous Brands card; falls back to `[data-coach-first="true"]` (first card in `filteredStrategies`).
- `data-coach-name` and `data-coach-desc` attributes on each card pass the real name and description.
- Scroll: `scrollContainer.scrollTo({ left: cardOffsetLeft - (window.innerWidth * 0.42), behavior: 'smooth' })` positions the card at 42% from left.
- After 950 ms, `getBoundingClientRect()` captures the card's final screen position.
- Callout width = `holeRect.left - 20` (uses whatever space is to the left of the card).
- Fallback: if left space < 40 px, a bottom sheet with the same clean white text appears instead.

---

## Callout Text Style

The callout is intentionally plain and professional — **no dark backgrounds, no purple/violet glass cards**. Text is written directly on the blurred background panel:

| Element | Style |
|---|---|
| Section label | 9px, 700 weight, `rgba(255,255,255,0.5)`, uppercase, wide tracking |
| Basket name | 14px, 700 weight, `rgba(255,255,255,0.95)` |
| Divider | 1px `rgba(255,255,255,0.2)` line |
| Description | 11px, 400 weight, `rgba(255,255,255,0.65)`, 1.5 line-height |
| Pill badges | 9px, `rgba(255,255,255,0.7)`, `rgba(255,255,255,0.08)` bg, white border |
| "Got it" button | 11px, `rgba(255,255,255,0.15)` bg, white border, no colour fills |

---

## Data Attributes Added to MarketsPage

| Attribute | Added to | Purpose |
|---|---|---|
| `data-coach-target="true"` | Strategy card where `displayName` includes "famous" (case-insensitive) | Primary scroll target |
| `data-coach-first="true"` | The first card in `filteredStrategies` | Fallback if no Famous Brands card exists |
| `data-coach-name` | Every strategy card | Passes real basket name to the callout |
| `data-coach-desc` | Every strategy card | Passes real description to the callout |
| `ref={basketsTabRef}` | "Mint Baskets" toggle button | Gives the explainer the tab's screen coordinates |

---

## Dismissal

- Phase 0 auto-advances after 2 500 ms.
- Phase 1: tap "Got it" or the blurred overlay area to dismiss.
- Navigating away from the Mint Baskets tab resets the animation (replays on return).

---

## Files

| File | Role |
|---|---|
| `src/components/MintBasketsExplainer.jsx` | Main animation component |
| `src/pages/MarketsPage.jsx` | Mounts the explainer; provides `basketsTabRef` and `data-coach-*` attributes |
| `INVEST_Animation.md` | This documentation file |
