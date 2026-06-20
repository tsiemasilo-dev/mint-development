# INVEST Animation — Mint Baskets Coach Mark

## Overview

This is a two-phase coach-mark animation that plays every time the user opens the Mint Baskets tab on the Markets page. It teaches the user what Mint Baskets are through progressive disclosure — first pointing out the tab itself, then spotlighting a real strategy card with a contextual explanation.

No fullscreen overlay is used. The actual page content stays visible and readable at all times.

---

## Phase 0 — Tab Coach Mark (auto, ~2.5 seconds)

**What the user sees:**
- A semi-transparent dark overlay dims the entire page.
- An animated pulsing ring appears around the "Mint Baskets" toggle button in the header — two concentric rings expand outward and fade, repeatedly.
- A glow halo radiates from the ring border.
- A bouncing upward arrow below the ring draws the eye toward the tab.
- A label reads "Mint Baskets" in lavender above/near the ring.

**How it works:**
- `basketsTabRef` is attached to the Mint Baskets `<button>` in `MarketsPage.jsx`.
- The explainer receives this ref via prop and reads `.getBoundingClientRect()` on mount.
- A `position: fixed` div is placed at the exact tab coordinates with a `box-shadow: 0 0 0 9999px rgba(0,0,0,0.65)` to create a spotlight cutout.
- Two `<motion.div>` rings animate `scale` from 1 → 1.7 with `opacity` from 0.7 → 0 on a loop.
- After 2 500 ms, the animation automatically advances to Phase 1.

---

## Phase 1 — Strategy Card Spotlight

**What the user sees:**
- The tab ring fades out.
- The horizontal strategy card scroll container scrolls smoothly until the "Mint Famous Brands" basket card is centred on screen.
- Everything except that card is dimmed (dark overlay with a spotlight hole over the card).
- The card pulses with a subtle violet border glow.
- A brief "press" animation fires: the card scales down to 97% for 200 ms then springs back — simulating a tap.
- A callout panel slides in from the left side of the card with:
  - The basket name
  - A 2-line description
  - Three bullet pills: "JSE-listed", "Expert-built", "From R100"
  - Each line animates in sequentially (staggered fade-up, 120 ms apart).
- A "Got it" button at the bottom of the callout dismisses the entire overlay.

**How it works:**
- On entering Phase 1, the explainer runs `document.querySelector('[data-coach-target="true"]')` to find the Featured/Famous Brands card, falling back to `[data-coach-first="true"]` (the first card in the list).
- `el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })` scrolls the card into view.
- After 900 ms (allowing smooth scroll to complete), `getBoundingClientRect()` captures the card's screen coordinates.
- A `position: fixed` spotlight div is placed at those coordinates with `box-shadow: 0 0 0 9999px rgba(0,0,0,0.7)` — this creates the hole-in-overlay effect without needing clip-path.
- A Framer Motion `animate` on `scale: [1, 0.97, 1]` fires once to simulate the press.
- The callout is `position: fixed`, placed to the left of the card (`cardRect.left - calloutWidth - 16`), vertically centred with the card.
- Text lines use `initial={{ opacity:0, y:8 }}` → `animate={{ opacity:1, y:0 }}` with staggered delays.

---

## Data Attributes Added to MarketsPage

| Attribute | Added to | Purpose |
|---|---|---|
| `data-coach-target="true"` | Strategy card button where `displayName` includes "famous" (case-insensitive) | Primary scroll target |
| `data-coach-first="true"` | The very first strategy card in `filteredStrategies` | Fallback if no Famous Brands card found |
| `ref={basketsTabRef}` | The "Mint Baskets" toggle button | Gives the explainer the tab's screen position |

---

## Dismissal

- Phase 0 auto-advances after 2 500 ms (no user action needed).
- Phase 1 is dismissed by tapping "Got it →" on the callout.
- Tapping the dark overlay also dismisses.
- When the user switches away from the Mint Baskets tab (`viewMode !== "openstrategies"`), the animation resets so it replays on return.

---

## Files

| File | Role |
|---|---|
| `src/components/MintBasketsExplainer.jsx` | Main animation component |
| `src/pages/MarketsPage.jsx` | Mounts the explainer; provides `basketsTabRef` and `data-coach-*` attributes |
