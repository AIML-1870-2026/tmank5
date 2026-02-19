# Readability Explorer — Product Specification

## Overview

**Readability Explorer** is an interactive, single-page web application that lets users experiment with typography and color to understand how visual design choices affect human readability. It's equal parts design tool, accessibility auditor, and educational playground.

---

## Core Concept & Tone

The aesthetic direction is **"scientific instrument meets editorial design"** — think a high-end typography journal crossed with a color lab. Dark-mode-first, with precise monospaced labels, clean serif body text, and a UI that feels like it belongs in a design school rather than a SaaS dashboard.

---

## Layout

The screen is divided into two primary zones that are always visible simultaneously:

### Left Panel — Control Center (~35% width)
All controls for manipulating the reading experience. Organized into collapsible sections. Has a fixed/sticky position.

### Right Panel — Reading Canvas (~65% width)
A live preview area showing the sample text rendered with the currently selected settings. Updates in real-time as any control changes.

---

## Feature Specifications

### 1. Color Controls

#### Text Color
- Three RGB sliders (R, G, B) each ranging from 0–255
- Numeric input fields alongside each slider (editable directly)
- A live color swatch preview chip showing the current text color
- Hex value display (auto-calculated, also manually editable with `#` prefix)

#### Background Color
- Same structure as text color: 3 RGB sliders, numeric inputs, swatch, hex value

#### Color Swap Button
- One-click button to instantly swap text and background colors

---

### 2. Typography Controls

#### Font Size
- Slider ranging from 8px to 72px
- Labeled in both px and pt
- Preset size buttons: Caption (11px), Body (16px), Large (20px), Heading (28px), Display (42px)

#### Font Family
- Dropdown with curated options spanning multiple categories:
  - **Serif**: Georgia, Playfair Display, Lora, Merriweather
  - **Sans-Serif**: Helvetica Neue, Source Sans Pro, Nunito, DM Sans
  - **Monospace**: Courier New, Fira Code, IBM Plex Mono
  - **Dyslexia-Friendly**: OpenDyslexic, Lexie Readable

#### Font Weight
- Slider: Thin (100) → Black (900) in 100-step increments
- Only weights available for the selected font are enabled

#### Line Height (Leading)
- Slider: 0.8 → 3.0 in 0.1 steps
- Labeled with common names: Tight (1.0), Normal (1.5), Relaxed (1.8), Airy (2.2)

#### Letter Spacing (Tracking)
- Slider: -0.1em → 0.5em
- Labeled: Tight, Normal, Wide, Very Wide

#### Column Width
- Slider: 200px → 900px (the width of the reading canvas text block)
- Shows character-per-line estimate alongside (e.g., "~45 CPL") since 45–75 CPL is considered ideal

#### Text Alignment
- Four toggle buttons: Left, Center, Right, Justify

---

### 3. Readability Metrics Panel

A dedicated "Metrics" section in the control panel showing live-calculated scores. These update any time a relevant setting changes.

| Metric | Description |
|---|---|
| **WCAG Contrast Ratio** | Calculated contrast ratio (e.g., 4.52:1). Color-coded badge: Fail / AA Large / AA / AAA |
| **WCAG Level Badge** | Shows which WCAG 2.1 conformance level is met (None / A / AA / AAA) |
| **Luminance Values** | Relative luminance of text and background (0–1 scale) |
| **Estimated CPL** | Characters per line based on font, size, and column width |
| **Readability Score** | A composite 0–100 score blending: contrast ratio weight (40%), CPL optimality (20%), line height optimality (20%), font size score (20%) |
| **Optical Clarity Index** | A custom heuristic combining font size, weight, and letter spacing into a 0–10 score |
| **APCA Score** *(stretch goal)* | Advanced Perceptual Contrast Algorithm score for more nuanced modern contrast evaluation |

Metrics are displayed as cards with sparkline-style visual indicators (mini progress bars, gauges, or color-coded icons).

---

### 4. Vision Simulation

A section that applies CSS/SVG filter transforms to the Reading Canvas to simulate how the current design appears under various visual conditions. Only one simulation is active at a time.

#### Simulation Modes
| Mode | Simulation Method |
|---|---|
| **Normal Vision** | No filter (default) |
| **Protanopia** (red-blind) | SVG color matrix filter |
| **Deuteranopia** (green-blind) | SVG color matrix filter |
| **Tritanopia** (blue-blind) | SVG color matrix filter |
| **Achromatopsia** (full color-blind / grayscale) | `filter: grayscale(100%)` |
| **Low Contrast Sensitivity** | `filter: contrast(60%) brightness(110%)` |
| **Low Vision / Blur** | `filter: blur(1.5px)` |
| **Cataracts** | `filter: blur(1px) brightness(90%) sepia(20%)` |
| **Glaucoma (tunnel vision)** | Radial gradient vignette overlay darkening edges |

Implemented using SVG `<feColorMatrix>` filters for color-blindness (well-established matrices available in accessibility literature) and CSS filters for the others.

Each mode has a brief tooltip explaining the condition.

---

### 5. Preset Color Schemes

A grid of preset chips that instantly apply both text and background colors. Organized into categories:

#### Accessibility Presets
- **WCAG Black on White** — #000000 / #FFFFFF
- **WCAG White on Black** — #FFFFFF / #000000
- **High Contrast Yellow** — #FFFF00 / #000000
- **WCAG AA Minimum** — a mid-gray on white that exactly hits 4.5:1

#### Classic Editorial
- **Newspaper** — Near-black on warm off-white (#1A1A1A / #F5F0E8)
- **Sepia Book** — Dark brown on aged paper (#3B2A1A / #F0E6D0)
- **Blueprint** — White on deep navy (#FFFFFF / #003366)
- **Chalkboard** — Pale yellow on dark green (#F5F0C0 / #1A3A1A)

#### Modern UI
- **Dark Mode** — #E0E0E0 / #121212
- **GitHub Light** — #24292F / #FFFFFF
- **VS Code Dark** — #D4D4D4 / #1E1E1E
- **Solarized Light** — #657B83 / #FDF6E3
- **Solarized Dark** — #839496 / #002B36

#### Bad Practices (for learning)
- **Low Contrast Gray** — #AAAAAA / #FFFFFF (fails WCAG)
- **Vibrating Colors** — #FF0000 / #00FF00 (chromatic aberration demo)
- **Invisible Text** — #FEFEFE / #FFFFFF

---

### 6. Sample Text Controls

#### Content Options
- Dropdown to select sample text type:
  - **Lorem Ipsum** (classic placeholder)
  - **Pangram** ("The quick brown fox…" and variants)
  - **News Article** (realistic paragraph of prose)
  - **Technical Documentation** (code comments, specs)
  - **Legal Text** (dense, complex sentence structure)
  - **Children's Book** (simple, short sentences)
  - **Custom** — user types their own text into a textarea

#### Text Case Override
- Buttons: Default / UPPERCASE / lowercase / Title Case / Small Caps

---

### 7. Comparison Mode *(Creative Addition)*

A toggle that splits the Reading Canvas into two side-by-side panels:
- **Left** — your current settings
- **Right** — a "saved" snapshot (you click a "Save Snapshot" button to capture it)

This lets you A/B compare two configurations directly. Both show their metric scores beneath the panel. Useful for comparing "before optimization" vs "after."

---

### 8. History & Timeline *(Creative Addition)*

A horizontally scrollable strip at the bottom of the control panel showing the last 10 setting states as small thumbnail swatches (showing the text/bg color combo). Clicking any thumbnail restores that state. Allows non-destructive exploration.

---

### 9. Export & Share *(Creative Addition)*

- **Copy CSS** button — generates a CSS snippet for the current settings (`color`, `background-color`, `font-size`, `line-height`, `letter-spacing`, `font-family`) and copies to clipboard
- **Export Report** button — generates a styled PDF/HTML summary showing: current settings, all metric scores, a screenshot of the reading canvas, and a WCAG compliance summary
- **Share Link** button — encodes all settings into URL query parameters so a specific configuration can be shared via URL

---

### 10. Dyslexia & Readability Aids *(Creative Addition)*

A toggle section for accessibility overlays applied to the reading canvas:

| Aid | Effect |
|---|---|
| **Bionic Reading** | Bold the first half of each word to create anchor points |
| **Line Focus** | Subtle horizontal band highlighting the current line (follows mouse Y) |
| **Word Spacing Boost** | Increases `word-spacing` by 0.5em (WCAG 1.4.12 spacing test) |
| **Ruler Overlay** | A movable horizontal line the user can drag to track their reading position |
| **Reading Mask** | Dims all text above and below a 3-line "window" around the cursor |

---

### 11. Environmental Simulation *(Creative Addition)*

A dropdown that simulates different ambient lighting conditions by applying a CSS mix-blend-mode overlay to the whole screen:

| Environment | Effect |
|---|---|
| **Standard Screen** | No overlay |
| **Bright Sunlight** | High brightness + slight washed-out overlay |
| **Night / Dark Room** | Dim overall luminance |
| **Warm Lamp** | Warm sepia tint |
| **Blue Light Filter** | Warm orange overlay (night mode simulation) |
| **Office Fluorescent** | Slight cool-blue tint and increased contrast |

This helps users understand how their design holds up in real-world conditions beyond a calibrated monitor.

---

## Technical Stack Recommendation

- **Framework**: React (functional components + hooks)
- **Styling**: Tailwind CSS utility classes + custom CSS variables for theme
- **Color Math**: Custom utility functions for luminance and WCAG contrast ratio calculations (no heavy libraries needed — formulas are straightforward)
- **SVG Filters**: Inline `<defs>` with `<feColorMatrix>` filters for color-blindness simulation
- **Fonts**: Google Fonts API for the font selector
- **State Management**: `useState` / `useReducer` — no external store needed
- **Export**: `html2canvas` + `jsPDF` for report export (or a simple CSS print stylesheet)

---

## Aesthetic Direction

**Visual Identity**: Scientific-editorial. Think lab equipment designed by a typographer.

- **Color palette for the UI chrome**: Very dark near-black background (#0D0D0D), off-white text (#E8E4DC), accent in a muted amber/gold (#C8A84B) for active states and highlights
- **Typography for UI labels**: A monospaced font (IBM Plex Mono) for metric readouts and labels — gives it an instrument/readout feel. Clean humanist sans for descriptive text.
- **Control styling**: Sliders with custom thumb styling, minimal and precise. No rounded-pill inputs — prefer rectangular with subtle borders.
- **Metric cards**: Styled like instrument readouts — numbers large, label small, unit annotated. Color-coded status (green/yellow/red for pass/warn/fail).
- **Animations**: Smooth real-time transitions on the reading canvas (150ms ease) when settings change. Metrics tick/animate when values change.

---

## Accessibility of the Tool Itself

Somewhat meta, but the tool should itself be accessible:
- All controls keyboard-navigable
- Sliders use proper `<input type="range">` with ARIA labels
- Color contrast of the tool UI meets WCAG AA
- Screen reader announcements for metric score changes (live regions)

---

## Non-Goals (Out of Scope v1)

- User accounts or cloud sync
- Mobile-optimized layout (desktop-first is fine for v1)
- RTL text support
- Animated/video text backgrounds

---

## Summary of Creative Additions

Beyond the core requirements, the following features elevate this from a simple tool to an educational and professional instrument:

1. **Comparison Mode** — A/B two configurations side by side with metrics for each
2. **History Strip** — Non-destructive state timeline with visual thumbnails
3. **Export & Share** — Copy CSS, export a PDF report, share via URL
4. **Dyslexia & Readability Aids** — Bionic reading, line focus, reading mask
5. **Environmental Simulation** — How does your text look in sunlight vs. at night?
6. **APCA Contrast Score** — More nuanced than WCAG alone, reflects modern research
7. **Optical Clarity Index** — A custom composite metric giving a single "how sharp does this look" score
8. **Bad Practice Presets** — Educational negative examples showing what NOT to do, with explanations
9. **Characters Per Line Estimator** — Live CPL count with the optimal range (45–75) highlighted
10. **Dyslexia-Friendly Fonts** — OpenDyslexic and Lexie Readable in the font selector
