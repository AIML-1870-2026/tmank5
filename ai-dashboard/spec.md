# LLM Switchboard — spec.md
### Vibe Coding Assignment · University of Nebraska at Omaha

---

## 1. Project Overview

A single-file (`index.html`) AI model comparison dashboard that sends a prompt to multiple LLMs simultaneously and displays their responses. The aesthetic is **clean and minimal — Notion/Linear style**: crisp typography, generous whitespace, subtle borders, neutral palette, no clutter.

Users can compare OpenAI and Anthropic models side-by-side or in Race Mode. Each response card shows token count, estimated cost in USD, and latency. The app supports both **unstructured** (free text) and **structured** (JSON schema) output modes.

---

## 2. Tech Stack

- **Single file:** `index.html` — all HTML, CSS, and JavaScript in one file
- **No backend, no framework, no build tools**
- **CDN libraries (loaded via `<script>` tags):**
  - [Marked.js](https://cdn.jsdelivr.net/npm/marked/marked.min.js) — markdown rendering
  - [Highlight.js](https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js) — code syntax highlighting
- **Fetch API + ReadableStream** — streaming token-by-token responses
- **In-memory only** — API keys are never written to localStorage, sessionStorage, or any persistent store. They live only in JS variables for the lifetime of the page session.

---

## 3. API Key Handling

### Input Methods
Users can provide API keys in two ways:

1. **Manual paste** — A text input field per provider (OpenAI, Anthropic) in a settings panel
2. **File upload** — User uploads a `.env` or `.csv` file; the app parses it client-side and extracts keys matching `OPENAI_API_KEY` and `ANTHROPIC_API_KEY`

### Storage Rules
- Keys are stored **in JavaScript variables only** (e.g., `let openaiKey = ""`)
- Keys are **never** written to `localStorage`, `sessionStorage`, cookies, or any external service
- A clear privacy notice is shown: *"Your API keys are stored in memory only and are never saved or sent anywhere except the provider's API."*
- Keys are cleared when the page is refreshed or closed

### UI
- Settings panel is accessible via a ⚙️ icon in the top-right header
- A slide-out drawer opens from the right side
- Each provider has its own key input with a show/hide toggle (👁 icon)
- A green dot indicator appears next to the provider name when a key is present
- A "Clear Keys" button wipes all keys from memory

---

## 4. Providers & Models

### OpenAI
| Display Name | Model ID | Input $/1M tokens | Output $/1M tokens |
|---|---|---|---|
| GPT-4o | `gpt-4o` | $2.50 | $10.00 |
| GPT-4o mini | `gpt-4o-mini` | $0.15 | $0.60 |
| GPT-4 Turbo | `gpt-4-turbo` | $10.00 | $30.00 |
| GPT-3.5 Turbo | `gpt-3.5-turbo` | $0.50 | $1.50 |
| o1 | `o1` | $15.00 | $60.00 |
| o1-mini | `o1-mini` | $1.10 | $4.40 |
| o3-mini | `o3-mini` | $1.10 | $4.40 |

### Anthropic
| Display Name | Model ID | Input $/1M tokens | Output $/1M tokens |
|---|---|---|---|
| Claude 3.5 Sonnet | `claude-sonnet-4-5` | $3.00 | $15.00 |
| Claude 3.5 Haiku | `claude-haiku-4-5` | $0.80 | $4.00 |
| Claude 3 Opus | `claude-3-opus-20240229` | $15.00 | $75.00 |
| Claude 3 Sonnet | `claude-3-sonnet-20240229` | $3.00 | $15.00 |
| Claude 3 Haiku | `claude-3-haiku-20240307` | $0.25 | $1.25 |

> **Note on Anthropic CORS:** Anthropic's API does not allow direct browser-to-API calls due to CORS policy. When a user selects an Anthropic model and submits a prompt, the response card will display a clear, friendly explanation:
>
> *"Anthropic's API is designed to be called from a backend server and blocks direct browser requests (CORS restriction). To use Claude models, you'd need a small server or proxy. OpenAI models work great from the browser!"*
>
> The card should not show a cryptic error — it should be educational and visually clean.

---

## 5. Layout & UI

### Header
- App name: **LLM Switchboard** (left-aligned, clean wordmark)
- Subtitle: *"Compare AI models side by side"* (muted text)
- Right side: mode toggle (Side-by-Side / Race Mode) + settings icon

### Prompt Area (top section, full width)
- Large textarea — placeholder: *"Enter your prompt here..."*
- Below the textarea, a row of controls:
  - **Output Mode toggle:** `Unstructured` | `Structured (JSON)`
  - **Temperature slider:** 0.0 – 1.0 (default 0.7), shown as a number
  - **Max tokens input:** numeric, default 1024
  - **Example Prompts dropdown** (see Section 7)
  - **Submit button:** "Send to All" — primary action, full-color button

### Model Selector Bar
- A horizontal row of toggleable model pills/chips below the prompt area
- Each pill shows the provider logo (simple colored dot or letter) + model name
- Clicking a pill toggles that model on/off for the next run
- Disabled if no API key is present for that provider (greyed out with tooltip: *"Add an API key in Settings"*)
- Default selected: GPT-4o and GPT-4o mini

### Response Area

#### Side-by-Side Mode
- CSS Grid: equal-width columns, one per selected model
- Each column is a **Response Card** (see Section 6)
- Cards appear as soon as the model starts streaming
- Horizontally scrollable if more than 3 models are selected

#### Race Mode
- All selected models stream simultaneously
- A **leaderboard bar** appears at the top of the response area:
  - Shows each model name and a live timer (e.g., `GPT-4o · 1.2s`)
  - When a model finishes, its timer locks and shows a 🏁 icon
  - Models are ranked by completion time in real time
- Response cards are shown below in the same column layout as Side-by-Side
- A subtle animated progress bar runs at the top of each card while streaming

### Settings Drawer (slide-out from right)
- Triggered by ⚙️ icon in header
- Sections:
  1. **OpenAI** — API key input + show/hide + status dot
  2. **Anthropic** — API key input + show/hide + status dot
  3. **File Upload** — drag-and-drop or click to upload `.env` / `.csv`
  4. **Privacy Notice** — short paragraph explaining in-memory-only storage
  5. **Clear All Keys** — red button

---

## 6. Response Card

Each model gets one response card per run. Cards are the core UI element.

### Card Header
- Model name (e.g., "GPT-4o") + provider badge
- Status indicator: `Waiting…` → `Streaming…` → `Done` → `Error`
- Latency timer (counting up while streaming, locks when done)

### Card Body
- **Unstructured mode:** Rendered markdown (via Marked.js) with syntax-highlighted code blocks (via Highlight.js). Text streams in token by token.
- **Structured mode:** Raw JSON displayed in a styled code block. After completion, a schema validation result is shown (see Section 8).

### Card Footer
- Token counts: `↑ 312 in · ↓ 847 out`
- Estimated cost: `~$0.0094`
- Copy button (copies raw response text to clipboard)
- Expand button (opens response in a fullscreen modal for reading)

### Error State
- Red border on card
- Icon + short error message (e.g., "Rate limit reached", "Invalid API key", or the Anthropic CORS explanation)
- No cryptic stack traces shown to user

---

## 7. Output Modes

### Unstructured Mode (default)
- Prompt is sent as-is
- Response is rendered as markdown
- Streaming is enabled (tokens appear as they arrive)

### Structured Mode (JSON Schema)
- A JSON schema editor appears below the prompt textarea
- Users can type or paste a custom JSON schema
- A dropdown of **schema templates** is available (see below)
- The system prompt is automatically set to instruct the model to return only valid JSON matching the schema
- Response is displayed as a formatted JSON code block
- After completion: a **schema validator** runs and shows a ✅ / ❌ report per field

#### Schema Templates
| Name | Description |
|---|---|
| Element Info | Name, symbol, atomic number, fun fact |
| Movie Review | Title, rating (1–10), pros, cons, summary |
| Recipe | Name, ingredients (array), steps (array), prep time |
| News Summary | Headline, source, date, key points (array), sentiment |
| Study Guide | Topic, key concepts (array), quiz questions (array) |
| Custom | Blank editor for user-defined schema |

---

## 8. Structured Output Validator

After a structured mode response is received:
- Parse the JSON response
- Compare against the user's schema
- Display a small validation panel below the response card:
  - ✅ for each field that matched the schema
  - ❌ for each required field that was missing
  - ⚠️ for each field with a type mismatch
- A summary line: *"4/5 fields matched schema"*

---

## 9. Example Prompts

Pre-loaded in the "Example Prompts" dropdown in the prompt area:

| Label | Prompt |
|---|---|
| Explain it simply | "Explain how transformers work in machine learning, as if I'm a curious high schooler." |
| Creative story | "Write a 3-paragraph short story set on a space station where the AI has developed a fear of silence." |
| Code challenge | "Write a Python function that takes a list of integers and returns the two that sum closest to zero." |
| Debate this | "Make the strongest possible argument that social media has been a net positive for democracy." |
| Periodic table | "Tell me something fascinating about the element Osmium that most people don't know." |
| Career advice | "I'm a sophomore studying data science. What three skills should I prioritize developing this year?" |

---

## 10. Metrics Per Response Card

| Metric | How It's Calculated |
|---|---|
| **Input tokens** | Returned by API in `usage.prompt_tokens` (OpenAI) or `usage.input_tokens` (Anthropic) |
| **Output tokens** | Returned by API in `usage.completion_tokens` or `usage.output_tokens` |
| **Estimated cost** | `(input_tokens / 1,000,000 * input_price) + (output_tokens / 1,000,000 * output_price)` using the pricing table in Section 4 |
| **Latency** | `performance.now()` delta from submit click to last token received |

Cost is displayed as `~$0.0094` (always 4 significant decimal places, with a `~` prefix to indicate estimate).

---

## 11. Visual Design System

### Aesthetic
Clean, minimal, Notion/Linear style. No gradients, no heavy shadows. Everything breathes.

### Typography
- **Display/UI font:** `DM Sans` (Google Fonts CDN)
- **Monospace (code blocks):** `JetBrains Mono`
- Base size: 15px, line-height: 1.6

### Color Palette (CSS variables)
```css
:root {
  --bg: #ffffff;
  --bg-subtle: #f7f7f6;
  --border: #e8e8e7;
  --border-strong: #d1d1cf;
  --text-primary: #1a1a18;
  --text-secondary: #6b6b68;
  --text-muted: #a0a09d;
  --accent: #1a1a18;
  --accent-hover: #333330;
  --success: #16a34a;
  --error: #dc2626;
  --warning: #d97706;
  --openai-color: #10a37f;
  --anthropic-color: #d4501e;
}
```

### Spacing
- Base unit: 4px
- Card padding: 20px
- Section gaps: 24px
- Border radius: 8px (cards), 6px (inputs), 20px (pills/badges)

### Motion
- Settings drawer: slides in from right, 250ms ease-out
- Response cards: fade in with slight upward translate (150ms)
- Streaming text: no animation — just appears naturally
- Race mode leaderboard: smooth width transitions on progress bars

### Dark Mode
- Respect `prefers-color-scheme: dark`
- Dark palette:
  - `--bg: #111110`
  - `--bg-subtle: #1a1a18`
  - `--border: #2a2a28`
  - `--text-primary: #ededec`
  - `--text-secondary: #a0a09d`

---

## 12. Error States

| Scenario | UI Behavior |
|---|---|
| No API key for provider | Model pill is greyed out; tooltip: "Add API key in Settings" |
| Invalid API key | Card shows red border + "Invalid API key — check your key in Settings" |
| Rate limit hit | Card shows "Rate limit reached — wait a moment and try again" |
| Network error | Card shows "Network error — check your connection" |
| Anthropic CORS block | Card shows friendly CORS explanation (see Section 4) |
| Malformed JSON (structured mode) | Validator shows parse error; raw response still displayed |
| Timeout (>30s) | Card shows "Request timed out" with a retry button |

---

## 13. Responsive Behavior

- **Desktop (>1200px):** Full side-by-side grid, up to 4 columns
- **Tablet (768–1200px):** 2-column grid, horizontal scroll for more
- **Mobile (<768px):** Single column stack; mode toggle and model selector collapse into a compact bar

---

## 14. Accessibility

- All interactive elements have visible focus states
- ARIA labels on icon-only buttons (settings, copy, expand, show/hide key)
- Color is never the only indicator of state (always paired with text or icon)
- Sufficient contrast ratios (WCAG AA minimum)

---

## 15. File Structure

```
index.html        ← entire app (HTML + CSS + JS in one file)
spec.md           ← this document
README.md         ← brief description + how to use
```

> The entire app must run by opening `index.html` directly in a browser or via VS Code Live Server. No `npm install`, no build step, no server required (Anthropic CORS is expected and handled gracefully).

---

## 16. Out of Scope (for this version)

- Backend / proxy server
- Anthropic streaming (CORS blocks it — handled with friendly message)
- Authentication or user accounts
- Saving/exporting conversation history
- Mobile-native app
- Any third provider beyond OpenAI and Anthropic
