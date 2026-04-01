# NEO Mission Control Dashboard — Project Spec

## Overview

A single-page, vanilla HTML/CSS/JS dashboard that visualizes near-Earth object (NEO) data in real time from NASA and JPL APIs. The aesthetic is dark, industrial, and professional — built to serve as a portfolio centerpiece. No frameworks, no build tools, one self-contained HTML file.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Language | Vanilla HTML5 / CSS3 / ES6+ JavaScript |
| Fonts | IBM Plex Mono (data/labels) + IBM Plex Sans (UI copy) via Google Fonts |
| Charts | None — custom CSS/SVG only |
| Dependencies | Zero runtime dependencies |
| Deployment | Single `index.html` file, works from any static host or local open |

---

## APIs

### 1. JPL SBDB Close Approach Data API
- **Base URL:** `https://ssd-api.jpl.nasa.gov/cad.api`
- **No API key required**
- **Default query params:**
  - `date-min=now`
  - `date-max=+30` (next 30 days)
  - `dist-max=0.05` (within 0.05 AU of Earth)
  - `neo=true`
  - `fullname=true`
  - `diameter=true`
- **Used by:** Close Approach Feed panel, Size Comparison panel, cross-reference linking

### 2. JPL Sentry API
- **Base URL:** `https://ssd-api.jpl.nasa.gov/sentry.api`
- **No API key required**
- **Default query:** mode S (summary of all monitored objects, no params needed)
- **Used by:** Impact Risk Board panel, cross-reference linking

### 3. NASA API (api.nasa.gov)
- **API Key:** `Y09T1n4t9kh4pyKTcgeEZRzJcfeNMwe8IqE9rOgu`
- **Reserved** for potential future APOD or NeoWs integration — not used in v1

---

## Layout

Single-page, full-viewport layout. No scrolling on desktop (fits within 100vh). Three-panel body below a fixed top bar.

```
┌─────────────────────────────────────────────────────┐
│  TOP BAR — title, live clock (UTC), refresh button, │
│  summary counts (objects tracked, PHAs, Sentry hits)│
├───────────────────────┬─────────────────────────────┤
│                       │                             │
│  CLOSE APPROACH FEED  │   IMPACT RISK BOARD         │
│  (CAD API)            │   (Sentry API)              │
│                       │                             │
│  Scrollable table     │   Scrollable risk list      │
│  Sort controls above  │   Sorted by impact prob.    │
│                       │                             │
├───────────────────────┴─────────────────────────────┤
│                                                     │
│  SIZE COMPARISON VISUAL                             │
│  Horizontally scrollable asteroid size bar          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Panels

### Top Bar
- Left: wordmark — `NEO // MISSION CONTROL` in IBM Plex Mono, cyan accent color
- Center: live UTC clock, ticking every second
- Right: three summary stat pills (objects in window / PHAs / on Sentry list) + manual **Refresh** button with spinner state

### Panel 1 — Close Approach Feed
**Data source:** CAD API

**Columns:**
| Column | Field | Notes |
|---|---|---|
| Object | `fullname` | Truncated, cyan accent |
| Date | `cd` | Formatted `YYYY-Mon-DD HH:MM` |
| Distance | `dist` | In AU, colored green if < 0.01, yellow if < 0.03 |
| Miss Distance | `dist_min` | In AU |
| Velocity | `v_rel` | km/s, amber tint |
| H Mag | `h` | Absolute magnitude |
| Diameter | `diameter` | km, shown if available, else `—` |

**Sort controls** (button group above the table):
- `DATE` (default active)
- `DISTANCE`
- `VELOCITY`

Clicking a sort button re-sorts the in-memory data array and re-renders the table — no re-fetch.

**Row interaction:**
- Clicking a row selects it (highlighted with cyan left border)
- If the object's designation matches any entry in the Sentry dataset, the matching Sentry row is highlighted in Panel 2
- Drives the Size Comparison panel — selected object's diameter is rendered there

### Panel 2 — Impact Risk Board
**Data source:** Sentry API (mode S)

**Displayed fields per row:**
- Object name (`fullname`)
- Cumulative impact probability (`ip`) — formatted as `1 in N` for readability
- Palermo scale (`ps_cum`) — color-coded: green < -2, amber -2 to 0, red > 0
- Torino scale (`ts_max`) — shown as integer badge
- Potential impact year range (`range`)
- Diameter estimate (`diameter`) in km

**Sorted by:** impact probability descending (highest risk first)

**Cross-reference behavior:**
- When a row in Panel 1 is selected, if that object appears in the Sentry list, its row here gets a highlighted border and scrolls into view
- If no match, a subtle `NO SENTRY ENTRY` label appears at the top of Panel 2

### Panel 3 — Size Comparison Visual
**Data source:** diameter field from selected CAD row (or default to largest object in feed on load)

**Behavior:**
- Renders a horizontal SVG scale bar
- Plots the selected asteroid as a labeled circle, sized proportionally
- Places labeled landmark silhouettes at fixed real-world sizes for comparison:

| Landmark | Height/Size |
|---|---|
| Football field | 91 m |
| Eiffel Tower | 330 m |
| Empire State Building | 443 m |
| Golden Gate Bridge span | 1,280 m |
| Manhattan island length | 21,000 m |

- Scale is logarithmic so objects from 10m to 50km all render legibly
- Object name, diameter in meters/km, and orbit class label shown above the asteroid circle
- If no diameter data is available for the selected object, panel shows `DIAMETER UNKNOWN — NO OPTICAL DATA`

---

## Data Flow

```
Page Load
  │
  ├─► fetch CAD API ──► parse JSON ──► store cadData[]
  │
  ├─► fetch Sentry API ──► parse JSON ──► store sentryData[]
  │
  ├─► build Sentry lookup map { des → sentryObject }
  │
  ├─► render Top Bar stats
  ├─► render Panel 1 table (sorted by date)
  ├─► render Panel 2 list (sorted by ip)
  └─► render Panel 3 (largest diameter object as default)

Sort Button Click
  └─► re-sort cadData[] in memory ──► re-render Panel 1 only

Row Click (Panel 1)
  ├─► highlight selected row
  ├─► lookup des in sentryMap
  ├─► if found: scroll + highlight Panel 2 row
  └─► update Panel 3 with selected object diameter

Refresh Button Click
  └─► re-run full Page Load sequence, clear all state
```

---

## Visual Design

### Color Palette (CSS Variables)
```css
--bg:       #0a0c0f   /* page background */
--bg2:      #111418   /* panel headers, top bar */
--bg3:      #181c22   /* hover states */
--border:   #1e2530   /* all borders, grid lines */
--accent:   #00d4ff   /* cyan — primary interactive, object names */
--accent2:  #ff6b35   /* orange — risk/threat emphasis */
--text:     #e2e8f0   /* primary text */
--muted:    #4a5568   /* column headers, labels */
--muted2:   #718096   /* secondary labels */
--danger:   #ff4444   /* high Palermo score */
--warn:     #ffaa00   /* mid-range values */
--safe:     #00cc88   /* low-risk distance values */
```

### Typography
- **IBM Plex Mono** — all data values, column headers, labels, the wordmark
- **IBM Plex Sans Light/Regular** — panel descriptions, status messages

### Grid Structure
- Top bar: `60px` fixed height
- Body: CSS Grid, `grid-template-columns: 1fr 1fr`, `grid-template-rows: 1fr auto`
- Panels separated by `1px` lines in `--border` color (grid gap trick — body background is the border color)
- Panel 3 spans full width, fixed `160px` height

### States
| State | Treatment |
|---|---|
| Loading | Monospace animated ellipsis `FETCHING DATA...` centered in panel |
| Error | `API UNAVAILABLE — CHECK CONSOLE` in danger red |
| No data | `NO OBJECTS MATCHING CRITERIA` in muted color |
| Selected row | Cyan `3px` left border, subtle cyan background tint |
| Sentry match | Orange `3px` left border on matched Sentry row |
| Refresh active | Button label becomes `REFRESHING...`, spinner icon, disabled state |

---

## File Structure

```
neo-dashboard/
└── index.html        ← entire app: HTML + <style> + <script>
```

All CSS lives in a `<style>` block in `<head>`. All JS lives in a `<script>` block before `</body>`. No external JS files, no CSS files, no build step.

---

## Out of Scope (v1)

- No URL routing or deep links
- No localStorage persistence
- No mobile layout (desktop-first, min-width ~900px)
- No NASA APOD or NeoWs endpoints
- No orbit class filter (sort only)
- No unit toggle (AU vs LD vs km)

These are reasonable v2 additions once the core is solid.

---

## Success Criteria

- Both APIs fetch and render without errors on page load
- Sort controls re-sort without re-fetching
- Clicking a CAD row correctly cross-references Sentry data
- Size comparison renders a legible, accurate logarithmic scale
- Refresh button re-fetches both APIs and re-renders all panels cleanly
- No external JS dependencies — works fully offline after first font load
- Looks portfolio-ready: clean, dark, professional, data-dense without feeling cluttered
