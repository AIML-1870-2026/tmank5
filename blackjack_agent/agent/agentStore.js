'use strict';

// ---------------------------------------------------------------------------
// AgentStore — reactive state for the AI Agent module
// Tracks agent activation state, API config, current recommendation,
// and an independent Hi-Lo card count (does not depend on cheats module).
// ---------------------------------------------------------------------------

window.AgentStore = {
  active: false,
  panelOpen: false,
  apiKey: '',
  model: 'gpt-4o',

  // Status: 'idle' | 'thinking' | 'ready' | 'error'
  status: 'idle',
  recommendation: null, // { action: 'HIT'|'STAND'|'DOUBLE'|'SPLIT', reasoning: '...' }
  errorMessage: '',

  // Auto-play mode — AI handles the full loop (bet → deal → play → repeat)
  autoPlay: false,
  autoBetChip: 25,     // chip value clicked each round: 5 | 25 | 100 | 500
  currentPhase: 'BETTING', // tracked so toggling autoPlay mid-game works

  // Current game state snapshot — populated from bj:phaseChanged events
  currentPlayerHand: [],
  currentDealerHand: [],

  // ---------------------------------------------------------------------------
  // Independent Hi-Lo card counting (runs regardless of cheats module state)
  // ---------------------------------------------------------------------------
  runningCount: 0,
  seenCounts: {
    A: 0, '2': 0, '3': 0, '4': 0, '5': 0,
    '6': 0, '7': 0, '8': 0, '9': 0, '10': 0,
  },
  SHOE_TOTAL: 312, // 6-deck shoe

  get totalSeen() {
    return Object.values(this.seenCounts).reduce((a, b) => a + b, 0);
  },

  get totalRemaining() {
    return this.SHOE_TOTAL - this.totalSeen;
  },

  get decksRemaining() {
    return Math.max(this.totalRemaining / 52, 0.5);
  },

  get trueCount() {
    return Math.round((this.runningCount / this.decksRemaining) * 10) / 10;
  },

  canonicalValue(v) {
    if (['J', 'Q', 'K'].includes(v)) return '10';
    return v;
  },

  recordCard(cardValue) {
    const key = this.canonicalValue(cardValue);
    if (this.seenCounts[key] !== undefined) this.seenCounts[key]++;

    // Hi-Lo running count update
    if (['2', '3', '4', '5', '6'].includes(cardValue)) {
      this.runningCount++;
    } else if (!['7', '8', '9'].includes(cardValue)) {
      // 10, J, Q, K, A = -1
      this.runningCount--;
    }
  },

  resetShoe() {
    for (const k of Object.keys(this.seenCounts)) this.seenCounts[k] = 0;
    this.runningCount = 0;
  },

  resetRound() {
    this.recommendation = null;
    this.status = 'idle';
    this.errorMessage = '';
  },

  // ---------------------------------------------------------------------------
  // API key — stored in sessionStorage only (cleared on tab close)
  // ---------------------------------------------------------------------------
  loadSession() {
    const key = sessionStorage.getItem('bj_agent_key');
    const model = sessionStorage.getItem('bj_agent_model');
    if (key) this.apiKey = key;
    if (model) this.model = model;
  },

  saveSession(key, model) {
    this.apiKey = key;
    this.model = model || 'gpt-4o';
    sessionStorage.setItem('bj_agent_key', key);
    sessionStorage.setItem('bj_agent_model', this.model);
  },

  clearSession() {
    this.apiKey = '';
    this.active = false;
    sessionStorage.removeItem('bj_agent_key');
    sessionStorage.removeItem('bj_agent_model');
  },
};
