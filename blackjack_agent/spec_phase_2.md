# Blackjack — Phase 2 Spec: Cheats Mode

**Project:** `Desktop/tmank5/blackjack`  
**Phase:** 2  
**Status:** Ready for implementation  
**Author:** Generated spec — February 2026

---

## Overview

Phase 2 introduces a **Cheats Mode** — an optional training overlay that teaches real blackjack strategy without altering core gameplay or the leaderboard. When active, a slide-in side drawer surfaces three real-time analytical tools: a bust probability meter, a Hi-Lo card counting trainer, and an optimal move advisor.

The philosophy is *transparency without friction* — cheats mode should feel like having a coach whispering in your ear, not like a separate game mode.

---

## Toggle Button

### Placement
A **"Cheats 👁"** button sits in the **top-right corner** of the game UI, persistently visible at all times.

### Behavior
- **Off state:** Subtle, muted styling (e.g., gray/outlined). Drawer is hidden and no cheat overlays are rendered.
- **On state:** Button glows or uses an accent color (e.g., amber/gold) to make it unmistakably clear that cheats are active. A small persistent badge or label ("Training Mode") appears somewhere unobtrusive on the screen so players never forget the mode is on.
- Clicking the button **slides the drawer open** if closed, or **toggles it closed** if already open, while keeping cheats mode active in the background (stats and overlays continue updating).
- State persists across hands within a session. Does **not** persist across page reloads (no localStorage needed).

---

## Side Drawer

### Layout
- Slides in from the **right side** of the viewport.
- Width: `320px` on desktop, full-width on mobile.
- Smooth CSS transition: `transform: translateX` with ~`250ms ease-in-out`.
- The main game layout should either compress (push layout) or the drawer should overlay it — **overlay is preferred** to avoid layout reflow on smaller screens. A semi-transparent backdrop behind the drawer on mobile.
- Drawer has a visible **close button (×)** at the top-right of the drawer itself.
- Drawer is divided into **three labeled sections**, one per feature, each collapsible independently.

### Drawer Header
```
👁 Cheats Mode         [×]
──────────────────────────
```

---

## Feature 1: Bust Probability Meter

### What it does
Displays the **percentage chance that the player's next hit will cause a bust** (exceed 21), calculated from the known remaining deck composition.

### Calculation Logic
1. Track all cards that have been dealt and are visible (player hand, dealer hand, any previously played cards if tracking across hands).
2. Determine the player's **current hand total**.
3. Count how many cards in the remaining deck would push that total over 21.
4. `Bust % = (busting cards remaining) / (total cards remaining) × 100`
5. For hands with an Ace counted as 11, calculate based on the soft total first; if that busts, recalculate with Ace as 1.

### UI
- **Label:** "Bust if you Hit"
- **Large percentage number** (e.g., `64%`) as the focal point.
- **Color-coded progress bar** below the number:
  - `0–30%` → Green
  - `31–55%` → Yellow/Amber
  - `56–75%` → Orange
  - `76–100%` → Red
- Updates **immediately** when the player's hand changes (after each hit).
- When it's not the player's turn (e.g., dealer's turn, between hands), shows `—` or a disabled state.

### Edge Cases
- If player total is ≤ 11, bust % is always `0%` — show green bar at 0 with a note: *"You can't bust."*
- If player has blackjack or has stood, show `—`.

---

## Feature 2: Card Counting Trainer (Hi-Lo System)

### What it does
Teaches the **Hi-Lo card counting system** in real time. Every card dealt flashes its count value, and a running count is tracked and displayed.

### Hi-Lo Values
| Cards | Count Value |
|-------|-------------|
| 2–6   | +1          |
| 7–9   | 0           |
| 10, J, Q, K, A | -1 |

### UI Components

**Running Count Display**
- Large, prominent number with a `+` or `-` prefix.
- Color: positive count → green, zero → white/neutral, negative → red.
- Label: "Running Count"

**True Count Display**
- Below the running count: `True Count = Running Count ÷ Decks Remaining`
- Decks remaining calculated from cards seen vs. total deck size.
- Label: "True Count" with a small `(?)` tooltip explaining: *"True count adjusts for remaining decks. Higher = more favorable."*

**Card Flash Animation**
- When any card is dealt, a small **value badge** (`+1`, `0`, `-1`) briefly animates near the card for ~`1 second` before fading out.
- This helps players train their eye to associate cards with count values.

**Interpretation Hint**
- A one-line contextual hint below the counts:
  - True Count ≥ +2: *"Deck favors you — consider betting more."*
  - True Count 0 to +1: *"Neutral deck."*
  - True Count ≤ -1: *"Deck favors dealer — play conservatively."*

### Count State Management
- Running count resets to `0` when the deck is reshuffled.
- A small "Deck reshuffled" notification should appear in the drawer when this happens.
- Count tracks **all visible cards** — player cards, dealer cards (including face-up dealer card), and any burned/discarded cards if exposed.
- Dealer's **hole card** is NOT counted until it is revealed; at reveal, the count updates immediately.

---

## Feature 3: Optimal Move Advisor

### What it does
Recommends the **statistically optimal play** for the player's current hand vs. the dealer's visible upcard, based on standard basic strategy.

### Strategy Table
Implement a lookup table covering:
- **Hard totals** (8 through 21) vs. dealer upcards (2–A)
- **Soft totals** (A+2 through A+9) vs. dealer upcards
- **Pairs** (2-2 through A-A) vs. dealer upcards

Moves: `Hit`, `Stand`, `Double Down`, `Split`, `Surrender` (if game supports it)

> The full basic strategy matrix should be stored as a static data structure (object/map), not computed on the fly.

### UI Components

**Recommended Action Badge**
- Prominent pill/badge showing the recommended move:
  - `HIT` → Blue
  - `STAND` → Green  
  - `DOUBLE` → Purple
  - `SPLIT` → Amber
- Updates immediately when hand state changes.

**Reasoning Line**
- One-line explanation below the badge:
  - e.g., *"Dealer shows 6 — high bust risk. Stand and let them bust."*
  - e.g., *"Soft 17 vs. dealer 9 — hitting improves expected value."*
- Keep these short, plain-English, and educational.

**Deviation Indicator**
- If the player makes a move that differs from the recommendation, a brief non-intrusive toast/flash appears: *"Basic strategy: [recommended move]"* — shown for ~2 seconds.
- This is logged internally for the session accuracy report (see Stats section below).

### When Advisor is Hidden
- Between hands (no active player hand): show *"Waiting for hand…"*
- After player stands or busts: show the last recommendation grayed out.
- Dealer-only turn: hide or dim the panel.

---

## Leaderboard & Stats Integration

Cheats mode **does not disqualify scores** from the leaderboard. However:

- All scores are saved to the **same leaderboard** regardless of cheats mode status.
- A small **"🎓" icon** is appended to leaderboard entries recorded during a session where cheats were active at any point, so players can distinguish trained vs. unassisted scores.
- The icon is purely cosmetic and does not affect ranking.

### Session Stats Panel (Bonus — end of session)
When a session ends (or optionally via a "Session Report" button in the drawer), display:
- Hands played
- Strategy accuracy % (how often player followed the advisor's recommendation)
- Running count accuracy (if a "self-test" feature is added later — out of scope for Phase 2)

---

## State Architecture Notes

All cheats mode logic should live in an isolated module/service so it doesn't bleed into core game logic. Suggested structure:

```
/cheats
  cheatsStore.js     — reactive state: isEnabled, runningCount, bustPercent, recommendedMove
  hiLoCounter.js     — card counting logic
  bustCalculator.js  — bust probability calculation
  basicStrategy.js   — full strategy lookup table
  CheatsDrawer.jsx   — drawer UI component
  CheatsBadges.jsx   — in-game overlay badges (card flash, deviation toast)
```

Core game logic should **emit events** when cards are dealt or hands change, and the cheats module subscribes to those events — keeping coupling minimal and making cheats easy to disable or extend.

---

## Accessibility & Polish

- Drawer must be keyboard-navigable (focusable sections, Escape key closes it).
- All color indicators must have text labels too (don't rely on color alone for meaning).
- On mobile, the drawer overlays the game rather than pushing content.
- Animations should respect `prefers-reduced-motion`.

---

## Out of Scope for Phase 2

- Insurance recommendations
- Bet sizing advice beyond count hints
- Multi-player cheats visibility
- Persistent stats across sessions
- Hole card reveal ("What if" simulator)

These are candidates for Phase 3.

---

## Acceptance Criteria

- [ ] Cheats toggle button visible in top-right at all times
- [ ] Side drawer slides in/out with smooth animation
- [ ] Bust % meter calculates correctly from remaining deck and updates per hit
- [ ] Hi-Lo running count tracks all visible cards including dealer reveal
- [ ] True count displayed and updates with deck size
- [ ] Card flash animations appear on deal
- [ ] Basic strategy advisor shows correct recommendation for all hard/soft/pair hands
- [ ] Deviation toast fires when player ignores recommendation
- [ ] Leaderboard entries from cheat sessions marked with 🎓 icon
- [ ] Cheats module is isolated from core game logic
- [ ] All features work on mobile (drawer is full-width overlay)
