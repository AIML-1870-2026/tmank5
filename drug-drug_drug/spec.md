# DrugSafe — Drug Interaction Checker
## Project Specification for Claude Code

---

## Project Overview

Build a fully client-side HTML/CSS/JS web application that allows users to manage their medication list and check for drug-drug interactions using the free OpenFDA API. No backend, no API key required. All data is fetched directly in the browser from `https://api.fda.gov`.

### Design Direction

**Aesthetic**: Clean, medical-grade precision with warmth. Think: a premium health app — not sterile and clinical, not playful. Dark navy/slate sidebar with a bright white content area. Strong typographic hierarchy. Color-coded severity system. The one thing users will remember: the **Safety Report Card** — a beautiful, scannable summary of their entire medication profile.

**Fonts** (load from Google Fonts):
- Display/headings: `DM Serif Display` — authoritative, warm
- Body/UI: `DM Sans` — modern, readable, medical-appropriate
- Monospace (drug names in code): `JetBrains Mono`

**Color Palette** (CSS variables):
```css
--navy: #0f1f3d;
--navy-light: #1a3260;
--slate: #2d3a52;
--accent: #3b82f6;       /* blue — informational */
--safe: #10b981;         /* green */
--caution: #f59e0b;      /* amber */
--danger: #ef4444;       /* red */
--critical: #7c3aed;     /* purple — contraindicated */
--bg: #f8fafc;
--surface: #ffffff;
--border: #e2e8f0;
--text-primary: #0f172a;
--text-secondary: #64748b;
--text-muted: #94a3b8;
```

**Layout**: Fixed left sidebar (280px, dark navy) + scrollable main content area. No page reloads — everything is single-page with JS-driven view switching.

---

## File Structure

```
drugSafe/
├── index.html
├── css/
│   ├── main.css          # global styles, layout, variables
│   ├── components.css    # reusable UI components
│   └── views.css         # view-specific styles
├── js/
│   ├── app.js            # app init, routing, global state
│   ├── api.js            # all OpenFDA API calls
│   ├── medications.js    # medication list state + localStorage
│   ├── interactions.js   # interaction detection logic
│   ├── views/
│   │   ├── dashboard.js
│   │   ├── myMeds.js
│   │   ├── search.js
│   │   ├── adverseEvents.js
│   │   ├── recalls.js
│   │   └── reportCard.js
│   └── utils.js          # helpers, severity scoring, formatters
└── spec.md
```

---

## Global State

Manage all state in a single `AppState` object in `app.js`. Persist `myMedications` to `localStorage`.

```js
const AppState = {
  myMedications: [],       // [{ id, name, genericName, ndcCode, addedAt }]
  interactions: [],        // cached results from last analysis
  currentView: 'dashboard',
  isLoading: false,
  lastAnalyzedAt: null,
};
```

---

## Navigation (Sidebar)

Fixed left sidebar, dark navy background. Items:

| Icon | Label | View Key |
|------|-------|----------|
| 🏠 | Dashboard | `dashboard` |
| 💊 | My Medications | `my-meds` |
| 🔍 | Drug Search | `search` |
| ⚠️ | Adverse Events | `adverse-events` |
| 🚨 | Recall Alerts | `recalls` |
| 📋 | Safety Report Card | `report-card` |

Below nav items, show a "My Medications" mini-summary: count of drugs in list, and a colored dot (green/amber/red) based on highest severity interaction found.

---

## Views

---

### View 1: Dashboard

**Purpose**: Overview and entry point.

**Layout**:
- Top row: 4 metric cards
  - `# Medications tracked`
  - `# Interactions found` (colored by max severity)
  - `# Active recalls` for your meds
  - `# Adverse event reports` (total across your drugs)
- Middle: "Interaction Matrix" — a grid/table showing every pairwise combination of the user's medications, color-coded by severity (green = no known interaction, amber = caution, red = major, purple = contraindicated). Hovering a cell shows a tooltip with the interaction summary.
- Bottom: "Recent Alerts" — 3 most severe interactions found, as card previews.

**Behavior**:
- On load, if `myMedications` has 2+ drugs, auto-run interaction analysis.
- Show a loading skeleton while fetching.
- If no medications added yet, show an onboarding empty state with a CTA to "Add your first medication."

---

### View 2: My Medications

**Purpose**: Manage the user's medication list.

**Components**:

**Search & Add Bar**:
- Text input: user types a drug name
- Autocomplete dropdown powered by OpenFDA `/drug/ndc.json` search
- Each result shows: brand name, generic name, dosage form
- On select: add to `AppState.myMedications`, persist to localStorage
- Prevent duplicates (match on generic name)

**Medication Cards**:
- Each saved medication shown as a card:
  - Drug name (brand + generic)
  - Dosage form
  - Date added
  - Severity badge (based on worst interaction with any other drug in the list)
  - "View interactions" button → jumps to search view pre-filtered
  - "Remove" button (with confirmation)
- Cards animate in on add, animate out on remove

**Bulk Actions**: "Clear all" button (with confirmation modal).

---

### View 3: Drug-Drug Search

**Purpose**: Search for interactions between any two (or more) drugs, not just those in the user's list.

**Sub-modes** (tabs):
1. **By Name** — two autocomplete inputs, user picks Drug A and Drug B, click "Check Interaction"
2. **By Drug Class** — dropdown of drug classes (e.g. SSRIs, NSAIDs, ACE Inhibitors, Beta-Blockers, Statins, Opioids, Benzodiazepines, Anticoagulants, Antifungals, Antibiotics). User picks a class, sees all known inter-class interactions.
3. **My Meds vs. New Drug** — single search input, checks a candidate drug against every drug in `myMedications`. Great for "I was just prescribed X, is it safe?"

**Results Display**:
- Severity badge (see Severity System section)
- Interaction summary (plain-English from FDA label `drug_interactions` field)
- Source: which drug's label reported the interaction
- "Add to my list" button if the drug isn't already tracked

---

### View 4: Adverse Event Explorer

**Purpose**: Show real-world side effect frequency from FAERS (FDA Adverse Event Reporting System).

**Input**: Select a drug from `myMedications` or search any drug.

**Output**:
- **Top 10 reported reactions** — horizontal bar chart (pure CSS or Canvas)
  - Each bar labeled with reaction name and count
  - Color-coded: high count = red, medium = amber, low = green
- **Reporter breakdown** — pill badges showing: % reported by patients, % by healthcare professionals, % by manufacturers
- **Outcome breakdown** — how many reports resulted in: hospitalization, disability, death, other serious outcomes
- **Trend note**: disclaimer that FAERS data reflects *reported* events, not proven causation

**Implementation**:
- Endpoint: `GET https://api.fda.gov/drug/event.json?search=patient.drug.openfda.brand_name:"DRUGNAME"&count=patient.reaction.reactionmeddrapt.exact&limit=10`
- Parse `results` array: `[{ term: "NAUSEA", count: 1234 }, ...]`

---

### View 5: Recall Alerts

**Purpose**: Check if any of the user's medications have active FDA recalls.

**Layout**:
- Auto-checks all drugs in `myMedications` on view load
- Also allows manual search for any drug
- Results shown as alert cards:
  - Drug name + NDC
  - Recall class (Class I = most severe → red, Class II → amber, Class III → yellow)
  - Reason for recall
  - Recall initiation date
  - Recalling firm
  - Distribution pattern (nationwide vs regional)
- If no recalls found: green "All Clear" banner
- Link to FDA recall database for full details

**Endpoint**: `GET https://api.fda.gov/drug/enforcement.json?search=brand_name:"DRUGNAME"+AND+status:"Ongoing"&limit=5`

---

### View 6: Safety Report Card

**Purpose**: A beautiful, printable/shareable summary of the user's full medication safety profile.

**Sections**:

1. **Header** — patient-facing title, date generated, total medications count

2. **Overall Safety Score** — a large circular gauge (SVG-drawn, animated on load):
   - 0–100 score calculated from:
     - Number of interactions found
     - Maximum severity of any interaction
     - Number of active recalls
     - Number of serious adverse events reported across drugs
   - Score color: 80–100 = green, 60–79 = amber, 40–59 = orange, 0–39 = red
   - Plain-language verdict below the gauge: "Your medication combination appears low-risk" / "Some caution advised" / "Significant interactions detected — consult your pharmacist"

3. **Medication Summary Table**:
   - Column: Drug Name | Generic | Worst Interaction | Active Recall?
   - Severity badge in each row

4. **Interaction Details** — expandable accordion per pair:
   - Drug A ↔ Drug B
   - Severity badge
   - FDA label excerpt (plain-language summary)
   - Recommended action

5. **Recall Summary** — brief list of any active recalls

6. **Disclaimer** — "This tool uses publicly available FDA data and is not a substitute for professional medical advice."

**Export**:
- "Print / Save as PDF" button — uses `window.print()` with `@media print` CSS that hides nav, formats cleanly
- "Copy summary text" button — copies a plain-text version to clipboard

---

## Severity System

All interactions must be classified into one of four severity levels. This drives all color coding and scoring.

| Level | Label | Color | CSS Var | Score Impact |
|-------|-------|-------|---------|--------------|
| 0 | No known interaction | Green | `--safe` | 0 |
| 1 | Minor / Monitor | Amber | `--caution` | -5 |
| 2 | Major — use caution | Red | `--danger` | -20 |
| 3 | Contraindicated | Purple | `--critical` | -40 |

**Severity detection logic** (in `interactions.js`):

FDA labels do not always use a consistent severity field. Use keyword matching on the `drug_interactions` text field:

```js
function classifyInteraction(text) {
  if (!text) return 0;
  const t = text.toLowerCase();
  if (t.includes('contraindicated') || t.includes('do not use') || t.includes('must not')) return 3;
  if (t.includes('major') || t.includes('serious') || t.includes('avoid') || t.includes('potentially fatal')) return 2;
  if (t.includes('monitor') || t.includes('caution') || t.includes('may increase') || t.includes('may decrease')) return 1;
  return 0;
}
```

---

## OpenFDA API Module (`api.js`)

All API calls centralized here. Base URL: `https://api.fda.gov`.

### Functions to implement:

```js
// Search drugs by name for autocomplete
async function searchDrugsByName(query, limit = 8)
// GET /drug/ndc.json?search=brand_name:"QUERY"+generic_name:"QUERY"&limit=8

// Get drug label (interactions, warnings, contraindications)
async function getDrugLabel(drugName)
// GET /drug/label.json?search=openfda.brand_name:"NAME"+openfda.generic_name:"NAME"&limit=1

// Get interaction text between two drugs
async function getInteractionText(drugA, drugB)
// Fetches label for drugA, searches drug_interactions field for drugB name

// Get adverse events for a drug
async function getAdverseEvents(drugName, limit = 10)
// GET /drug/event.json?search=patient.drug.openfda.brand_name:"NAME"&count=patient.reaction.reactionmeddrapt.exact&limit=10

// Get recall status for a drug
async function getRecallStatus(drugName)
// GET /drug/enforcement.json?search=brand_name:"NAME"&limit=5

// Get NDC info (generic name, dosage form, etc.)
async function getNDCInfo(drugName)
// GET /drug/ndc.json?search=brand_name:"NAME"&limit=1
```

### Error Handling:
- Wrap all calls in try/catch
- If a 404 is returned (no results), return `null` gracefully — never crash
- Rate limiting: OpenFDA allows 240 req/min without a key. Add a simple queue/debounce (300ms) on autocomplete inputs.
- Show a subtle toast notification on API errors

---

## UI Components

### Severity Badge
```html
<span class="badge badge--major">Major</span>
```
Pill shape, colored background, white text. Four variants: `safe`, `caution`, `danger`, `critical`.

### Drug Card
Used in "My Medications" view. White surface, 1px border, subtle hover shadow. Shows: name, generic, severity badge, action buttons.

### Interaction Cell (Matrix)
Square cell in the interaction matrix grid. Background color = severity color. On hover: expand tooltip with summary text.

### Metric Card
Dashboard summary card: large number, label, optional trend indicator.

### Loading Skeleton
Animated shimmer placeholder used while API calls are in flight. Match dimensions of the content being loaded.

### Toast Notifications
Bottom-right corner. Auto-dismiss after 4 seconds. Variants: `info`, `success`, `warning`, `error`.

### Modal / Confirmation Dialog
Used for "Remove drug" and "Clear all" confirmations. Centered overlay, backdrop blur.

### Safety Gauge (SVG)
Circular progress arc. Animated with `stroke-dashoffset` on load. Center shows numeric score + letter grade. Used in Report Card view.

---

## Drug-Class Interaction Reference

Hardcode this lookup table in `interactions.js` for the "By Drug Class" search mode. This supplements FDA API data with known class-level interactions.

```js
const CLASS_INTERACTIONS = [
  { classA: 'SSRIs', classB: 'MAOIs', severity: 3, note: 'Serotonin syndrome risk — contraindicated' },
  { classA: 'SSRIs', classB: 'Triptans', severity: 2, note: 'Risk of serotonin syndrome' },
  { classA: 'NSAIDs', classB: 'Anticoagulants', severity: 2, note: 'Increased bleeding risk' },
  { classA: 'NSAIDs', classB: 'ACE Inhibitors', severity: 1, note: 'May reduce antihypertensive effect' },
  { classA: 'Statins', classB: 'Antifungals', severity: 2, note: 'Increased statin levels, myopathy risk' },
  { classA: 'Opioids', classB: 'Benzodiazepines', severity: 3, note: 'Respiratory depression — FDA black box warning' },
  { classA: 'Opioids', classB: 'Alcohol', severity: 2, note: 'CNS depression potentiation' },
  { classA: 'Anticoagulants', classB: 'Antibiotics', severity: 1, note: 'Some antibiotics affect INR' },
  { classA: 'Beta-Blockers', classB: 'Calcium Channel Blockers', severity: 2, note: 'Additive cardiac depression' },
  { classA: 'ACE Inhibitors', classB: 'Potassium Supplements', severity: 2, note: 'Hyperkalemia risk' },
];
```

---

## Local Storage Schema

```js
// Key: 'drugSafe_medications'
// Value: JSON array
[
  {
    id: 'uuid-v4',
    brandName: 'Lipitor',
    genericName: 'atorvastatin',
    dosageForm: 'TABLET',
    ndcCode: '0071-0155-23',
    addedAt: '2026-04-02T18:00:00Z'
  }
]

// Key: 'drugSafe_lastAnalysis'
// Value: JSON object — cached interaction results to avoid re-fetching on every load
```

---

## Interaction Matrix Algorithm

In `interactions.js`, implement `analyzeAllInteractions(medications)`:

```
1. Generate all unique pairs from medications array
   - For n drugs: n*(n-1)/2 pairs
2. For each pair [drugA, drugB]:
   a. Fetch label for drugA → search drug_interactions text for drugB name
   b. Fetch label for drugB → search drug_interactions text for drugA name
   c. Take max severity from (a) and (b)
   d. Cache result in AppState.interactions
3. Update dashboard matrix with results
4. Store to localStorage
```

Run in parallel where possible using `Promise.allSettled()`.

---

## Performance & UX Requirements

- **Debounce** all search inputs: 300ms
- **Lazy load** views: only initialize a view's JS when first navigated to
- **Skeleton screens** for all async content — never show a blank area
- **Graceful degradation**: if OpenFDA returns no data for a drug, show "No FDA data available" rather than an error
- **Offline notice**: if `navigator.onLine` is false, show a persistent banner
- **Responsive**: must work at 375px (mobile) through 1440px (desktop). Sidebar collapses to a hamburger menu on mobile.
- **Accessibility**: all interactive elements must have ARIA labels, keyboard navigable, sufficient color contrast

---

## Print / PDF Styles (`@media print`)

When printing the Safety Report Card:
- Hide sidebar, hide navigation, hide all buttons except the report content
- Force white background
- Expand all accordions
- Show DrugSafe logo/title and generation date in header
- Page break before "Interaction Details" section

---

## Animations & Micro-interactions

- **Page transitions**: views fade in with `opacity 0→1` + `translateY 8px→0` (150ms)
- **Medication card add**: slide down + fade in
- **Medication card remove**: slide up + fade out → neighbors animate into place
- **Safety gauge**: `stroke-dashoffset` animates from full to score value over 1.2s on view load (use `requestAnimationFrame` or CSS animation)
- **Metric cards**: numbers count up from 0 on dashboard load
- **Severity badge**: gentle pulse animation on `danger` and `critical` badges
- **Interaction matrix cells**: staggered fade-in row by row on load

---

## Sample Drug Data (for testing / empty state demo)

Pre-load these as example medications in the onboarding empty state (not actually saved — just shown as demo):

```
- Warfarin (anticoagulant)
- Aspirin (NSAID)
- Atorvastatin (statin)
- Fluconazole (antifungal)  ← triggers statin interaction
- Sertraline (SSRI)
- Tramadol (opioid)         ← triggers serotonin syndrome with SSRI
```

This combination deliberately includes several known interactions to showcase the app immediately.

---

## Disclaimers to Display

Must appear in footer and prominently in Report Card:

> "DrugSafe uses publicly available data from the U.S. Food and Drug Administration (OpenFDA). This tool is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult your pharmacist or physician before making changes to your medications."

---

## Out of Scope (v1)

- User accounts / cloud sync (localStorage only)
- Drug dosage tracking
- Prescription scheduling / reminders
- Pediatric / pregnancy-specific interaction data
- Non-US drug databases

These are natural v2 features.

---

## Claude Code Implementation Notes

- Use **vanilla JS** (no frameworks). ES6+ modules via `<script type="module">`.
- Use **CSS custom properties** throughout — no hardcoded colors in CSS rules.
- All API calls go through `api.js` — views never fetch directly.
- Use `crypto.randomUUID()` for medication IDs.
- Keep each JS file under ~300 lines. Split logic aggressively.
- Comment all FDA API endpoints with the exact URL pattern used.
- Test with: Warfarin + Aspirin (known interaction), Oxycodone + Alprazolam (opioid + benzo — critical), Atorvastatin + Fluconazole (statin + antifungal — major).
