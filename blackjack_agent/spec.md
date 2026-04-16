# Blackjack — Product & Design Specification

## Vision

A desktop blackjack game that feels like a quiet room. No noise, no flash, no pressure. The kind of interface that respects the player's attention — where every interaction is deliberate, every animation earns its place, and the table itself becomes almost meditative. The game should feel like the best version of playing cards alone on a Sunday afternoon.

The goal isn't to trick players into staying longer with dark patterns. It's to make the experience so pleasant and frictionless that they *want* to stay.

---

## Aesthetic Direction

**Concept:** "The Quiet Table" — a zen-minimalist take on casino blackjack. Inspired by Japanese stationery design, Scandinavian interiors, and the feel of high-quality linen.

### Color Palette

| Role | Color | Notes |
|---|---|---|
| Background | `#F2EDE8` | Warm off-white, like aged paper |
| Table surface | `#E8E2DB` | Slightly darker, soft felt suggestion |
| Table border | `#C8BFB4` | Subtle definition, no harsh lines |
| Primary text | `#2C2825` | Near-black with warmth |
| Secondary text | `#8C7E72` | Muted warm gray for labels |
| Card face | `#FDFAF7` | Warm white, not cold |
| Card shadow | `rgba(44,40,37,0.10)` | Gentle depth |
| Accent (action) | `#4A6741` | Muted sage green — calm, not loud |
| Accent hover | `#3D5636` | Deepened sage on hover |
| Danger / bust | `#8B4A42` | Muted terracotta, not aggressive red |
| Win state | `#4A6741` | Same sage — restrained celebration |
| Chip colors | See chip section | |

**No pure black. No pure white. No neons. No gradients (except the table's subtle vignette).**

### Typography

- **Display / card values:** `Cormorant Garamond` — elegant, serif, historically resonant with playing cards
- **UI / labels / scores:** `DM Sans` — clean, geometric, highly legible at small sizes
- **Button text:** `DM Sans Medium` — weighted but not heavy

### Card Design

Cards are the heart of the experience. They must feel premium.

- Dimensions: `~90px × 130px` at standard scale
- Border radius: `8px`
- Subtle inner shadow to suggest thickness/depth
- Suit symbols rendered using Unicode (♠ ♥ ♦ ♣) in Cormorant Garamond
- Red suits: `#8B4A42` (muted terracotta) — NOT harsh red
- Black suits: `#2C2825` — warm near-black
- Card back: Simple geometric pattern — a 4×4 repeating diamond motif in `#C8BFB4` on `#E0D9D0`
- **Deal animation:** cards slide in from a deck position (top-right), rotating slightly as they arrive, with a gentle ease-out curve. Each card in a deal has a staggered `60ms` delay.
- **Flip animation:** face-down cards rotate on the Y-axis (3D flip) over `350ms` with a subtle ease-in-out

### Chip Design

Chips are the betting currency. Each denomination has a distinct muted color:

| Value | Color |
|---|---|
| $5 | `#8B9E7A` (sage) |
| $25 | `#7A8B9E` (slate blue) |
| $100 | `#9E8A7A` (warm brown) |
| $500 | `#9E7A8A` (dusty rose) |

Chips are circular SVGs with a dashed inner ring and value text. Clicking a chip adds it to the bet. Stack animation: chips stack with a slight vertical offset.

---

## Layout

### Desktop Canvas (1280px × 800px reference, responsive down to 1024px)

```
┌─────────────────────────────────────────────────────┐
│  [Balance: $1,000]              [⟳ New Game]        │  ← Header bar, minimal
├─────────────────────────────────────────────────────┤
│                                                     │
│         DEALER                           [Score: ?] │
│         [ ] [ ]   ← cards               [ ] [ ]    │
│                                                     │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │  ← subtle divider
│                                                     │
│         PLAYER                          [Score: 14] │
│         [ ] [ ]   ← cards                          │
│                                                     │
│                 [ Bet: $25 ]                        │  ← bet display
│                                                     │
│    [$5] [$25] [$100] [$500]   [Clear] [Deal →]      │  ← betting phase only
│         [Hit]  [Stand]  [Double]                    │  ← play phase only
│                                                     │
└─────────────────────────────────────────────────────┘
```

The layout never shifts. Dealer zone and player zone are fixed. Action buttons swap in-place between betting phase and play phase with a crossfade.

---

## Game States & Flows

### 1. Betting Phase
- Chip tray visible at bottom
- "Deal" button appears once bet > $0, with a gentle fade-in
- Current bet shown as a stacked chip display above the action area
- Balance shown top-left, updates immediately on chip click

### 2. Deal Phase
- Cards animate out from a "deck" in the top-right corner
- Order: player card 1 → dealer card 1 → player card 2 → dealer card 2 (face down)
- Stagger: 60ms between each card
- After deal completes (~400ms total), action buttons fade in

### 3. Player Turn
- **Hit:** New card deals from deck position, score updates with a number pop animation
- **Stand:** Briefly dims player's hand, transitions to dealer turn
- **Double Down:** Doubles the bet (shown immediately), deals exactly one more card, then auto-stands. Only available as first action on a hand.
- If player busts: Cards get a subtle red tint overlay, "BUST" label fades in over the hand, round ends

### 4. Dealer Turn
- Dealer's face-down card flips over (3D Y-axis flip)
- Dealer draws with a 600ms pause between each card (creates natural tension without being slow)
- Dealer stands on soft 17

### 5. Round End
- **Player wins:** A soft sage green glow pulses under the player's cards, winnings added to balance with a counting animation
- **Dealer wins:** A muted fade — no harsh colors. Cards simply dim slightly.
- **Push (tie):** Bet returns, a simple "Push" label fades in
- **Blackjack:** Special subtle shimmer effect on the cards, 1.5× payout
- After 1.5 seconds, a "Play Again" button appears (same position as Deal button), with a gentle fade-in

### 6. Game Over (balance = $0)
- Soft modal overlay: "Out of chips. Start fresh?" with a single button

---

## Interaction Design

### Keyboard Shortcuts
Full keyboard support — crucial for smooth desktop gameplay:

| Key | Action |
|---|---|
| `H` | Hit |
| `S` | Stand |
| `D` | Double Down |
| `1` `2` `3` `4` | Add $5, $25, $100, $500 chip |
| `Backspace` | Clear bet |
| `Enter` or `Space` | Deal / Play Again |

Keyboard shortcuts shown as small labels beneath buttons (subtle, not distracting).

### Button States
- **Idle:** Soft off-white fill, warm gray border, DM Sans medium text
- **Hover:** Border darkens to accent sage, very subtle background shift (no dramatic color change)
- **Active/Press:** Scales down to `0.97` with `80ms` transition — physical press feel
- **Disabled:** Opacity `0.35`, no pointer events, no hover effects
- **Focus (keyboard):** Clean sage-colored outline, `2px` offset — clearly visible but not ugly

### Score Display
- Score updates with a tiny "pop" scale animation (scale 1 → 1.12 → 1, over 200ms)
- Shows "?" for dealer's hidden card during player turn
- Shows "BJ" for blackjack instead of "21"
- Soft red color when at 18+ (approaching bust range) as gentle visual feedback

---

## Animation Principles

All animations follow these rules:

1. **Nothing is instant, nothing is slow.** Fast feedback (< 150ms) for direct interactions. Meaningful transitions (200–400ms) for state changes. Narrative moments (600ms+) only for dealer's reveal.
2. **Ease-out for arrivals** (cards dealing in). **Ease-in for departures** (cards leaving). **Ease-in-out for flips and state changes.**
3. **Never block input unnecessarily.** Hit is available as soon as the new card lands.
4. **Physics-adjacent card motion.** Cards don't slide in a perfect straight line — they have a very slight arc/rotation as they travel from deck to position, suggesting a physical deal.

---

## Sound Design (Optional Enhancement)

If implemented, all sounds are subtle and off by default:
- Card deal: soft paper/felt slide sound
- Card flip: clean snap
- Chip click: light ceramic tap
- Win: one warm piano note
- Bust: one low, soft thud

Toggle in header. Respects system audio preferences.

---

## Technical Architecture

### Stack
- **React** (functional components + hooks)
- **CSS Modules** or styled-components for scoped styles
- **Framer Motion** for all card animations and transitions
- No external game libraries — pure logic implementation

### State Management
Single `useReducer` hook with clearly typed actions:

```
PLACE_BET | CLEAR_BET | DEAL | HIT | STAND | DOUBLE_DOWN | DEALER_PLAY | RESOLVE_ROUND | NEW_ROUND | NEW_GAME
```

### Game Logic
- Single 6-deck shoe, reshuffled when < 25% cards remain
- Standard Vegas rules: dealer hits soft 16, stands soft 17
- Double down: available on any first two cards (no restriction to 9/10/11 only)
- No split (out of scope for v1)
- No insurance (out of scope for v1)
- Blackjack pays 3:2

### Card Representation
```js
{ suit: 'hearts' | 'diamonds' | 'clubs' | 'spades', value: 'A'|'2'...'K', faceUp: boolean }
```

### Performance
- All card animations use `transform` and `opacity` only (GPU-composited, no layout thrash)
- Chip tray renders as static SVG, not re-rendering on every state change
- Dealer think-time uses `setTimeout` chains, not blocking loops

---

## File Structure

```
/src
  /components
    Card.jsx          — Individual card with flip/deal animations
    CardHand.jsx      — Hand container, manages card positions
    ChipTray.jsx      — Betting chip selector
    BetDisplay.jsx    — Stacked chip visualization of current bet
    ActionBar.jsx     — Hit/Stand/Double or Chip/Deal/Clear
    ScoreDisplay.jsx  — Animated score counter
    Header.jsx        — Balance, settings
    ResultOverlay.jsx — Win/lose/push messaging
    Table.jsx         — Layout shell
  /hooks
    useBlackjack.js   — All game state via useReducer
    useKeyboard.js    — Keyboard shortcut bindings
    useSounds.js      — Optional sound effects
  /logic
    deck.js           — Deck creation, shuffling, shoe management
    scoring.js        — Hand evaluation, soft/hard ace logic
    rules.js          — Dealer AI, payout calculations
  /styles
    tokens.css        — All CSS variables (colors, spacing, radii, fonts)
    global.css        — Reset, base typography
  App.jsx
```

---

## Metrics for Success

A well-built version of this game should feel:

- **Snappy:** Zero perceptible lag between button press and visual response
- **Calm:** No flashing, no jarring color shifts, no aggressive sound
- **Trustworthy:** Clear scores, clear bet display, no ambiguity about game state
- **Replayable:** The loop from round-end back to betting should take < 2 seconds and feel satisfying
- **Keyboard-native:** A skilled player should be able to play entirely without touching the mouse

---

## Out of Scope (v1)

- Split hands
- Insurance
- Side bets
- Multiplayer
- Account persistence / leaderboards
- Mobile layout
- Tutorial / strategy hints

These can be added in v2 without structural changes to the architecture above.
