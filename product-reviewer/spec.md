# Product Review Generator — Spec

## Context
Build a single-page web app that generates fake product reviews using OpenAI. The user supplies product details and a set of "voice" controls; the app assembles a system prompt and streams a review back via an Express backend proxy. No API key is ever exposed to the browser.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Backend | Node.js + Express |
| Frontend | Vanilla HTML / CSS / JS (single `public/index.html`) |
| AI | OpenAI `gpt-4o` via server-side proxy |
| Streaming | Server-Sent Events (SSE) — Express streams OpenAI chunks to browser |

---

## Project Location

All files go inside: `C:\Users\timot\Desktop\tmank5\product-reviewer\`

## Project Structure

```
Desktop/tmank5/product-reviewer/
├── spec.md
├── server.js            # Express app — static + /api/generate SSE endpoint
├── package.json
├── .env                 # OPENAI_API_KEY (never committed)
├── .env.example
├── .gitignore
└── public/
    └── index.html       # All HTML, CSS, JS in one file
```

---

## Controls (Form Inputs)

| Control | Type | Values |
|---|---|---|
| Product name | Text input | e.g. "Sony WH-1000XM5" |
| Product details / notes | Textarea | Free-form: features, gripes, keywords the AI must weave in |
| Star rating | Visual 1–5 star picker | 1 ★ → 5 ★ |
| Platform style | Select | Amazon, Yelp, Google Reviews, Reddit, App Store |
| Temperament | Pill buttons | Happy, Satisfied, Neutral, Disappointed, Angry, Sarcastic |
| Persona / demographic | Select | None, Gen Z, Millennial, Boomer, Tech Bro, Soccer Mom, Academic |
| Education slider | Range 1–5 | Labels: "Barely literate" / "Average" / "PhD-level" |
| Authenticity slider | Range 1–5 | Labels: "Polished" / "Natural" / "Chaotic (typos, no caps)" |
| Review length | Toggle | Short (~50w), Medium (~150w), Long (~350w) |

---

## Output Area

- Streamed review text rendered progressively (word by word as SSE chunks arrive)
- Animated blinking cursor while streaming
- **Copy** button (clipboard) — appears after generation completes
- **Regenerate** button — reruns with same settings, different `temperature` seed
- Character/word count badge

---

## Backend: `server.js`

```
POST /api/generate
Body: { product, details, stars, platform, temperament, persona, education, authenticity, length }
Response: text/event-stream SSE
  data: <token>\n\n   (streamed chunks)
  data: [DONE]\n\n    (terminal event)
```

- Reads `OPENAI_API_KEY` from `.env` via `dotenv`
- Builds system + user prompts from inputs (see Prompt Design below)
- Calls `openai.chat.completions.create({ stream: true, model: "gpt-4o", ... })`
- Pipes each `chunk.choices[0].delta.content` back as SSE
- Sets temperature: education slider maps 1→5 to 0.9→0.5 (higher education = more controlled)
- Authenticity slider at 5 injects explicit instruction for typos/informal punctuation

---

## Prompt Design

**System prompt template:**
```
You are a {persona} writing a {platform}-style product review.
Tone: {temperament}.
Education level: {education_label} — {education_instruction}.
Authenticity: {authenticity_instruction}.
Length: approximately {length_words} words.
Rating: {stars} out of 5 stars.
Write ONLY the review text. No preamble, no quotation marks around the whole review.
```

**User prompt:**
```
Product: {product}
Details to work in: {details}
```

**Education level labels/instructions:**
- 1: "barely literate — short sentences, simple vocabulary, may misspell common words"
- 2: "below average — casual, occasional grammatical errors"
- 3: "average — everyday vocabulary, natural flow"
- 4: "above average — varied vocabulary, well-structured paragraphs"
- 5: "PhD-level — sophisticated vocabulary, complex sentence structure, may reference technical specs"

**Authenticity instructions:**
- 1: "Write in polished, correct prose"
- 2: "Mostly clean, minor informal phrasing"
- 3: "Natural voice — occasional contractions, casual punctuation"
- 4: "Informal — some typos, run-on sentences, missing commas"
- 5: "Chaotic — deliberate typos, no caps, stream-of-consciousness, emoji ok"

---

## UI Design (reference: ai-dashboard aesthetic)

- Neutral minimal style — CSS variables for light/dark mode
- DM Sans body, JetBrains Mono for output text
- Two-column layout on desktop: controls left, output right
- Controls panel has subtle border, generous padding
- Star picker uses `★` / `☆` characters toggled via JS
- Sliders show live label beneath them as value changes
- Submit button disabled + shows spinner while streaming
- Output card fades in on first token

---

## Files to Create

1. `package.json` — dependencies: `express`, `openai`, `dotenv`
2. `server.js` — Express server with SSE `/api/generate` route
3. `public/index.html` — all frontend in one file
4. `.env.example` — `OPENAI_API_KEY=`
5. `.gitignore` — node_modules, .env

---

## Verification

1. `npm install && node server.js` — server starts on port 3000
2. Open `http://localhost:3000`
3. Enter a product name, fill details, adjust sliders, click Generate
4. Review streams word-by-word in the output panel
5. Copy button copies clean text to clipboard
6. Regenerate reruns without clearing inputs
7. Test all temperament/persona combinations produce distinct voices
8. Education slider at 1 vs 5 produces clearly different vocabulary
9. Authenticity slider at 5 produces visible typos/informal style
