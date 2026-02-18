# 🌌 Cosmic Color Wheel — Project Specification

## Overview

A visually stunning, space-themed interactive color mixing wheel built as a web app using HTML, CSS, and vanilla JavaScript. Users explore color theory through a cosmic/nebula aesthetic — colors swirl like galaxies colliding, particles drift through space, and the universe reacts to every mix. Designed for students learning color theory, this app is both an educational tool and a mesmerizing visual experience.

---

## Visual Theme: Cosmic / Nebula

The entire UI should feel like gazing into deep space. Key aesthetic decisions:

- **Background:** Deep space black (`#0a0a1a`) with a subtle animated star field (small white dots twinkling at varying opacities)
- **Color Wheel:** Rendered on an HTML5 Canvas with the full spectrum visible, set against a glowing nebula-like aura. The wheel should softly pulse and rotate slowly when idle.
- **Typography:** Clean, modern sans-serif (e.g. `Inter` or `Space Grotesk` from Google Fonts) in white/light purple tones
- **Glow Effects:** CSS `box-shadow` and `filter: blur()` used liberally to give colors a luminous, cosmic feel
- **Particle System:** When two colors are mixed, particle "stardust" animates outward from the result, matching the mixed color
- **Color Palette for UI Chrome:** Deep navy, soft violet, muted indigo, with white and gold accent text

---

## Color Model Support

The app supports all three major color models, switchable via a toggle in the UI:

| Model | Description | Use Case Shown to User |
|-------|-------------|------------------------|
| **RGB** | Additive light mixing | Screen/digital design |
| **RYB** | Subtractive pigment mixing | Traditional painting & art |
| **CMYK** | Subtractive ink mixing | Print design |

- The active color model affects how two colors mix together mathematically
- The wheel visually updates to reflect the selected model's color relationships
- A small tooltip/info panel explains the active model to the student

---

## Core Features

### 1. The Color Wheel
- Full spectrum color wheel rendered via Canvas API, always visible
- Two "color slots" (draggable orbs or clickable pickers) let users select colors from the wheel
- Selected colors are **highlighted** on the wheel with a glowing ring/halo effect
- The rest of the spectrum remains visible but dimmed slightly to emphasize selections

### 2. Color Mixing
- A prominent **"Mix Colors"** button triggers the mix interaction
- On click: an animation plays showing the two selected colors swirling together (CSS keyframe or Canvas animation) before revealing the result
- The result is displayed in a large swatch with its values shown in all three formats: HEX, RGB, and CMYK
- Mixing logic is determined by the currently active color model

### 3. Color Theory Relationships Panel
- Below or beside the wheel, display the active color's relationships:
  - **Complementary** — the color directly opposite on the wheel
  - **Triadic** — two colors equally spaced around the wheel (120° apart)
  - **Analogous** — two neighboring colors (30° on either side)
  - **Split-Complementary** — a softer alternative to complementary
- Each relationship is shown as a small labeled color swatch
- Hovering a swatch highlights that position on the wheel with a beam/line

### 4. Animation & Physics Effects
- **Idle wheel:** Slowly rotates (1 RPM) with a soft outer nebula glow that shifts hue over time
- **Star field background:** Canvas-rendered stars with parallax drift on mouse move
- **Mix animation:** Two color "blobs" orbit each other and merge — inspired by galaxy collision
- **Particle burst:** On mix completion, 30–50 particles explode outward from the result swatch, colored by the result, then fade out
- **Hover states:** Color swatches and buttons have smooth glow transitions on hover

---

## UI Layout

```
┌─────────────────────────────────────────────────────┐
│  🌌  COSMIC COLOR WHEEL          [RGB] [RYB] [CMYK] │
├──────────────────────┬──────────────────────────────┤
│                      │  COLOR A        COLOR B       │
│   [Color Wheel       │  [  swatch  ]  [  swatch  ]  │
│    Canvas]           │                               │
│                      │       [ MIX COLORS ✨ ]       │
│                      │                               │
│                      │  ── RESULT ──                 │
│                      │  [    large result swatch   ] │
│                      │  HEX: #______                 │
│                      │  RGB: (_, _, _)               │
│                      │  CMYK: (_, _, _, _)           │
├──────────────────────┴──────────────────────────────┤
│  COLOR THEORY RELATIONSHIPS                          │
│  [Complementary] [Triadic x2] [Analogous x2]        │
│  [Split-Complementary x2]                           │
└─────────────────────────────────────────────────────┘
```

---

## Technical Architecture

### File Structure
```
cosmic-color-wheel/
├── index.html
├── style.css
├── js/
│   ├── main.js          # App init, event listeners
│   ├── wheel.js         # Canvas color wheel rendering
│   ├── mixer.js         # Color mixing logic (RGB/RYB/CMYK)
│   ├── relationships.js # Color theory calculations
│   ├── particles.js     # Particle system & animations
│   └── starfield.js     # Background star field canvas
└── README.md
```

### Key Technical Decisions
- **No frameworks or build tools** — vanilla HTML/CSS/JS only, runnable by opening `index.html`
- **Two Canvas elements** — one for the star field background, one for the color wheel
- **Color conversions** — implement HSL ↔ RGB ↔ CMYK ↔ RYB conversion functions in `mixer.js`
- **RYB mixing** — use the Itten color wheel interpolation method (map RYB to RGB space for rendering, but mix in RYB space)
- **CSS custom properties** — use variables for theming so the cosmic palette is easy to adjust
- **RequestAnimationFrame** — drive all animations through a single game loop

### Color Mixing Logic (per model)
- **RGB:** Average the R, G, B channels of both colors
- **RYB:** Convert both to RYB space, average, convert back to RGB for display
- **CMYK:** Average the C, M, Y, K channels, convert to RGB for display

---

## Educational Components

Since the target audience is **students learning color theory**, the app should teach as well as delight:

- A collapsible **"Learn"** sidebar or tooltip system that explains:
  - What the current color model means and when it's used
  - Why the mixed result looks the way it does
  - What each relationship type (triadic, complementary, etc.) is used for in design
- Short, friendly 1–2 sentence explanations — not walls of text
- The color model switcher should visually demonstrate how the *same two colors* mix differently under RGB vs RYB vs CMYK

---

## Stretch Goals (Out of Scope for V1)

- Save / export palette as PNG or copy HEX codes to clipboard
- Color history / undo system (last 5 mixes shown)
- Mobile touch support
- Accessibility mode (high contrast, reduced motion)

---

## Success Criteria

- A student can select two colors, mix them, and understand *why* the result looks different across RGB, RYB, and CMYK
- The color theory relationships panel correctly identifies and highlights complementary, triadic, and analogous colors
- Animations run smoothly at 60fps on a modern laptop browser
- The app is self-contained — no server, no dependencies, no install required
- The cosmic visual theme is immediately striking and feels cohesive

---

## Inspiration & References

- [Adobe Color](https://color.adobe.com) — color relationship UI patterns
- [Coolors.co](https://coolors.co) — clean swatch presentation
- NASA Hubble imagery — nebula color palettes and cosmic aesthetics
- Itten's *The Art of Color* — RYB color theory foundations
