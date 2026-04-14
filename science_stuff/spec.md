# Science Experiment Generator — Spec

## 1. Overview
A Node.js + Express web app that generates grade-appropriate science experiments based on user-defined parameters. The user enters an OpenAI API key, configures experiment options, inputs available supplies, and receives a fully-structured science experiment — streamed token-by-token. A secondary "Suggest Supplies" flow lets the AI generate a supply list before the user commits to generating an experiment.

Modeled after the product-reviewer project in this repo. Single-page frontend in `public/index.html`, Express backend in `server.js`.

---

## 2. Architecture

```
science_stuff/
├── server.js            — Express app (SSE endpoints, OpenAI proxy)
├── package.json
├── .env                 — OPENAI_API_KEY (optional server-side fallback)
├── public/
│   └── index.html       — Single-file SPA (HTML + CSS + JS)
└── spec.md
```

**Key design decisions:**
- API key is sent from browser → backend in each POST request body (never stored server-side between requests, never persisted in browser)
- Backend proxies OpenAI streaming API → SSE to browser (same pattern as product-reviewer)
- No frontend framework; vanilla JS + CSS variables

---

## 3. Backend (`server.js`)

### Dependencies
```json
{
  "express": "^4.18",
  "openai": "^4.x",
  "dotenv": "^16.x",
  "cors": "^2.8"
}
```

### Endpoints

#### `POST /api/suggest-supplies`
Generates a supply list based on grade level, subject, safety level, indoor/outdoor, and team size.

Request body:
```json
{
  "apiKey": "sk-...",
  "model": "gpt-4o",
  "gradeLevel": "3-5",
  "subject": "Chemistry",
  "safetyLevel": "home-safe",
  "indoorOutdoor": "indoor",
  "teamSize": "small-group"
}
```

Streams back: a plain-text list of 8–12 suggested supplies, one per line, formatted as a markdown bullet list.

#### `POST /api/generate-experiment`
Generates a full science experiment writeup.

Request body:
```json
{
  "apiKey": "sk-...",
  "model": "gpt-4o",
  "gradeLevel": "3-5",
  "subject": "Chemistry",
  "difficulty": "medium",
  "timeRequired": "30-60",
  "safetyLevel": "home-safe",
  "indoorOutdoor": "indoor",
  "teamSize": "small-group",
  "supplies": "baking soda, vinegar, food coloring, dish soap, a plastic bottle",
  "surpriseMe": false
}
```

Streams back: a structured markdown experiment (see §6 for format).

### Prompt Construction

**Suggest-supplies system prompt:**
```
You are a science curriculum expert. Generate a practical supply list for a ${gradeLabel} science experiment.
Subject: ${subject}
Safety level: ${safetyLabel}
Setting: ${indoorOutdoor}
Team size: ${teamSizeLabel}
Return exactly 8–12 items as a markdown bullet list. Each item should be common and easy to find.
No preamble, no explanation — just the list.
```

**Generate-experiment system prompt:**
```
You are an experienced science teacher creating a complete science experiment guide.
Grade level: ${gradeLabel}
Subject: ${subject}
Difficulty: ${difficulty}
Time required: ${timeLabel}
Safety level: ${safetyLabel}
Setting: ${indoorOutdoor}
Team size: ${teamSizeLabel}
Available supplies: ${supplies}

Write a complete experiment in the following markdown format. Use exactly these section headers in this order:
## [Experiment Title]
**Learning Objective:** one sentence
**NGSS Alignment:** one or two standard tags (e.g. 3-PS2-1)
**Estimated Time:** X minutes
**Team Size:** X students

### Materials
Bullet list using only the provided supplies (plus water/paper/pencil if needed).

### Safety Notes
Brief safety notes appropriate for the grade and safety level. If home-safe, say so.

### Procedure
Numbered step-by-step instructions written at the appropriate grade reading level.

### What to Expect
What students should observe during and after the experiment.

### The Science Behind It
Explanation of the underlying concept at grade-appropriate depth.

### Discussion Questions
3–5 questions to prompt reflection and deeper thinking.

### Extensions
2–3 variations or follow-up experiments to try.

### Teacher / Parent Notes
Tips for facilitating, common pitfalls, and preparation notes.
```

**Surprise Me:** When `surpriseMe: true`, the backend randomly selects grade level, subject, and a short list of common household supplies before running the generate prompt. The frontend disables all form controls and shows "Generating a surprise experiment…".

### Error Handling
- Missing or invalid API key → `400 { error: "API key is required" }` or pass OpenAI's 401 through
- Rate limit (429) → `429 { error: "Rate limit reached — wait a moment and try again" }`
- Other errors → `500 { error: message }`

---

## 4. Frontend (`public/index.html`)

Single-file SPA. All CSS in `<style>`, all JS in `<script>`.

### Layout

Two-column grid (matches product-reviewer):
```
┌─────────────────────┬──────────────────────────────┐
│   Controls Panel    │       Output Panel           │
│   (380px fixed)     │       (1fr)                  │
│                     │                              │
│  API Key            │  [Streaming experiment text] │
│  Model Selector     │                              │
│  ── Experiment ──   │  Word count · Copy · Print   │
│  Grade Level        │                              │
│  Subject            │  ── History ──               │
│  Difficulty         │  [Saved experiment cards]    │
│  Time Required      │                              │
│  Safety Level       │                              │
│  Indoor/Outdoor     │                              │
│  Team Size          │                              │
│  ── Supplies ──     │                              │
│  [textarea]         │                              │
│  [Suggest Supplies] │                              │
│                     │                              │
│  [Surprise Me 🎲]   │                              │
│  [Generate]         │                              │
└─────────────────────┴──────────────────────────────┘
```

Mobile (≤ 800px): stacks to single column, controls on top.

### CSS System

Matches tmank5 house style:

```css
:root {
  --bg: #ffffff;
  --bg-subtle: #f7f7f6;
  --surface: #ffffff;
  --border: #e8e8e7;
  --text-primary: #1a1a18;
  --text-secondary: #6b6b68;
  --text-muted: #a0a09d;
  --accent: #1a1a18;
  --accent-hover: #2d2d2b;
  --success: #0f9d58;
  --danger: #d93025;
  --shadow: 0 1px 3px rgba(0,0,0,.08);
  --shadow-md: 0 4px 12px rgba(0,0,0,.1);
  --radius: 8px;
  --transition: 160ms ease;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #111110;
    --bg-subtle: #1a1a18;
    --surface: #1f1f1d;
    --border: #2e2e2c;
    --text-primary: #ededec;
    --text-secondary: #a0a09d;
    --text-muted: #6b6b68;
    --accent: #ededec;
    --accent-hover: #ffffff;
  }
}
```

Font: `DM Sans` (body) from Google Fonts. `JetBrains Mono` for code blocks in output.

### Controls Panel — Form Fields

#### API Key
```html
<div class="field">
  <label>OpenAI API Key</label>
  <div class="api-key-wrap">
    <span class="api-key-icon">🔑</span>
    <input type="password" id="apiKey" placeholder="sk-…" />
    <button type="button" id="apiKeyToggle">Show</button>
  </div>
  <div class="api-key-hint">Sent with each request. Never stored.</div>
</div>
```

#### Model Selector
Pill buttons (single-select). Default: `gpt-4o`.
```
[ GPT-4o ] [ GPT-4o mini ] [ GPT-4-turbo ]
```

#### Grade Level
Single-select pill buttons. Default: `3–5`.
```
[ K–2 ] [ 3–5 ] [ 6–8 ] [ 9–12 ] [ College ]
```

#### Subject
Single-select pill buttons. Default: `Chemistry`.
```
[ Biology ] [ Chemistry ] [ Physics ]
[ Earth Science ] [ Engineering ] [ Environmental ]
```

#### Difficulty
Toggle group. Default: `Medium`.
```
[ Easy ] [ Medium ] [ Challenging ]
```

#### Time Required
Toggle group. Default: `30–60 min`.
```
[ < 30 min ] [ 30–60 min ] [ 1+ hour ]
```

#### Safety Level
Toggle group. Default: `Home-safe`.
```
[ Home-safe ] [ Adult supervision ] [ Lab only ]
```

#### Indoor / Outdoor
Toggle group. Default: `Indoor`.
```
[ Indoor ] [ Outdoor ] [ Either ]
```

#### Team Size
Pill buttons. Default: `Small group`.
```
[ Solo ] [ Pairs ] [ Small group ] [ Full class ]
```

#### Supplies Textarea
```html
<div class="field">
  <label>Supplies You Have Available</label>
  <textarea id="supplies" rows="5"
    placeholder="e.g. baking soda, vinegar, food coloring, dish soap, a plastic bottle…">
  </textarea>
  <button type="button" id="suggestBtn">✨ Suggest Supplies</button>
  <div class="field-hint">Separate items with commas. Leave blank to let AI choose.</div>
</div>
```

When "Suggest Supplies" is clicked:
1. Button shows spinner + "Suggesting…"
2. POST `/api/suggest-supplies` (streams response)
3. Streamed text replaces textarea content in real time
4. Button resets when done

#### Action Buttons
```html
<button type="button" id="surpriseBtn">🎲 Surprise Me</button>
<button type="submit" id="generateBtn">Generate Experiment</button>
```

"Surprise Me" disables all controls, sends `surpriseMe: true` to backend, and generates immediately.

### Output Panel

#### Experiment Output Card
Streamed markdown is rendered in real time using marked.js (CDN) into `outputContent`.

#### Output Metadata Bar
- Word count badge
- Copy button (copies raw markdown to clipboard)
- Print button (`window.print()` — print stylesheet hides controls, shows only output)
- Save button (appends to localStorage `scienceExperimentHistory`)

#### History Section
Below the output card. Renders saved experiment cards on page load from localStorage. Each card: title, grade, subject, date. Click to reload. Trash icon to delete. "Clear All" button.

---

## 5. State Management

```javascript
const State = {
  apiKey: '',
  model: 'gpt-4o',
  gradeLevel: '3-5',
  subject: 'Chemistry',
  difficulty: 'medium',
  timeRequired: '30-60',
  safetyLevel: 'home-safe',
  indoorOutdoor: 'indoor',
  teamSize: 'small-group',
  supplies: '',
  isGenerating: false,
  isSuggesting: false,
  currentExperimentMd: '',
};
```

---

## 6. Experiment Output Format

```markdown
## Volcano Eruption in a Bottle

**Learning Objective:** Students will observe an acid-base reaction that produces carbon dioxide gas.
**NGSS Alignment:** 5-PS1-4
**Estimated Time:** 20 minutes
**Team Size:** 2–3 students

### Materials
- Baking soda (2 tablespoons)
- White vinegar (½ cup)
- Dish soap (1 teaspoon)
- Food coloring (optional)
- Plastic bottle (16 oz)

### Safety Notes
...

### Procedure
1. ...

### What to Expect
...

### The Science Behind It
...

### Discussion Questions
1. ...

### Extensions
...

### Teacher / Parent Notes
...
```

---

## 7. Streaming Implementation

Backend uses `for await` over OpenAI stream → writes `data: <token>\n\n` SSE events.
Frontend reads via `ReadableStream` reader → appends tokens → re-renders markdown with `marked.parse()`.

Pattern is identical to product-reviewer's SSE streaming.

---

## 8. Privacy & Security

- API key stored in JS variable only — cleared on page close
- Never written to localStorage, sessionStorage, or cookies
- Sent in POST body over HTTPS in production
- Backend does not log or persist the API key

---

## 9. Responsive & Print

- ≥ 800px: `grid-template-columns: 380px 1fr`
- < 800px: single column
- `@media print`: hide controls panel, metadata bar, history; show only output card content; 12pt font; 1in margins

---

## 10. Verification Checklist

- [ ] `npm install` succeeds
- [ ] `node server.js` starts on port 3000
- [ ] Valid API key + Generate streams an experiment to the output panel
- [ ] Suggest Supplies streams a bullet list into the textarea
- [ ] Surprise Me randomizes settings and generates without user input
- [ ] Model switching (GPT-4o, mini, turbo) is reflected in OpenAI requests
- [ ] All selectors (grade/subject/difficulty/etc.) update State and the prompt
- [ ] Save writes to localStorage; history renders on reload
- [ ] Print opens browser print dialog with clean output
- [ ] Copy copies raw markdown to clipboard
- [ ] Dark mode renders correctly
- [ ] Mobile layout stacks cleanly at ≤ 800px
- [ ] Invalid/missing API key shows inline error
- [ ] Rate-limit 429 shows user-friendly message
