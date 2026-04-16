# Blackjack AI Agent — Spec

## Overview

This project extends the original vanilla-JS blackjack game with an **AI Agent module** that reads the live game state, calls the OpenAI API, displays a strategic recommendation, and executes the chosen action on your behalf.

---

## Project Structure

```
blackjack_agent/
├── index.html               Main HTML (adds agent script tags)
├── game.js                  Core game logic (unchanged from original)
├── styles.css               All styles (agent styles appended at bottom)
├── cheats/                  Original training/cheat modules (unchanged)
│   ├── cheatsStore.js
│   ├── basicStrategy.js
│   ├── hiLoCounter.js
│   ├── bustCalculator.js
│   └── cheatsUI.js
└── agent/                   AI Agent module (new)
    ├── agentStore.js        Reactive state, card counting, session key storage
    ├── agentApi.js          OpenAI prompt builder + API caller
    └── agentUI.js           DOM injection, event wiring, render loop
```

---

## Tech Stack

- **Language:** Vanilla JavaScript (ES6+), HTML5, CSS3 — no build tools
- **AI:** OpenAI Chat Completions API (`gpt-4o` default) called directly from the browser
- **Key storage:** `sessionStorage` only — cleared on tab close, never persisted to disk

---

## How It Works

### 1. Activation
Click the **AI Agent** button in the header. An API key modal slides in:
- Enter your OpenAI API key (`sk-...`)
- Choose a model (`gpt-4o`, `gpt-4o-mini`, or `gpt-3.5-turbo`)
- Click **Activate Agent** — key is saved to `sessionStorage`

### 2. Automatic trigger
When the game enters `PLAYER_TURN`, the agent automatically:
1. Opens the side panel
2. Shows "Consulting AI…"
3. Calls the OpenAI API with the full game context
4. Displays the recommendation

### 3. Recommendation display
The side panel shows:
- **Action badge** — HIT / STAND / DOUBLE / SPLIT (color-coded like the basic strategy advisor)
- **Reasoning** — 1–2 sentence explanation from the LLM
- **Let AI Play** — executes the action by programmatically clicking the correct game button
- **Dismiss** — clears the recommendation without acting

### 4. Context sent to the LLM
Each API call includes:
- Player hand (cards + soft/hard total)
- Dealer up card
- Basic strategy recommendation (from `cheats/basicStrategy.js`)
- Hi-Lo running count and true count (tracked independently by the agent)
- Current balance and bet
- Available actions (read from live button disabled-states)

---

## Module API

### `AgentStore` (`agent/agentStore.js`)

Global reactive state object:

| Property | Type | Description |
|---|---|---|
| `active` | bool | Agent enabled |
| `panelOpen` | bool | Side panel visible |
| `apiKey` | string | OpenAI key (from `sessionStorage`) |
| `model` | string | Model name (default `gpt-4o`) |
| `status` | string | `'idle'` / `'thinking'` / `'ready'` / `'error'` |
| `recommendation` | object/null | `{ action, reasoning }` |
| `runningCount` | number | Hi-Lo running count (agent-tracked) |
| `trueCount` | computed | `runningCount / decksRemaining` |

Key methods: `loadSession()`, `saveSession(key, model)`, `clearSession()`, `recordCard(value)`, `resetShoe()`, `resetRound()`

### `AgentApi` (`agent/agentApi.js`)

| Method | Returns | Description |
|---|---|---|
| `getRecommendation()` | `Promise<{rec, ctx}>` | Builds prompt, calls OpenAI, returns parsed recommendation |
| `getGameContext()` | object | Reads all game state needed for the prompt |

### `AgentUI` (`agent/agentUI.js`)

| Method | Description |
|---|---|
| `render()` | Sync all DOM to current `AgentStore` state |
| `triggerAI()` | Manually fire an AI call (called automatically on `PLAYER_TURN`) |

---

## Game Events Consumed

| Event | Action |
|---|---|
| `bj:phaseChanged` | Store player/dealer hands; trigger AI on `PLAYER_TURN` |
| `bj:playerAction` | Clear stale recommendation |
| `bj:newRound` | Reset recommendation |
| `bj:cardDealt` | Record face-up cards for running count |
| `bj:holeRevealed` | Record revealed hole card for running count |
| `bj:reshuffled` | Reset shoe counts and running count |

---

## Security

- The API key is stored **only in `sessionStorage`** — cleared automatically on tab close
- The key is never logged to the console, never sent to any server except `api.openai.com`
- No API key is included in the HTML, JS files, or URL parameters

---

## Testing Checklist

1. Open `index.html` directly in a browser (no server needed)
2. Click **AI Agent** → API key modal appears
3. Enter a valid OpenAI key → agent activates, panel opens
4. Deal a hand → on player turn, panel shows "Consulting AI…" then a recommendation
5. **Let AI Play** → correct button is clicked automatically
6. **Dismiss** → recommendation clears, no action taken
7. Verify with DevTools → `sessionStorage` contains `bj_agent_key`; no key in console logs
8. Reload tab → key is loaded back from `sessionStorage`, agent auto-activates
9. Close and reopen tab → key is gone (session cleared)
10. Test error cases: bad API key (401), network offline, malformed JSON response
