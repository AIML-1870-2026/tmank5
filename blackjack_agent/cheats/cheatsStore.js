'use strict';

// ---------------------------------------------------------------------------
// CheatsStore — shared reactive state for the cheats module
// All cheats submodules read/write through this object.
// ---------------------------------------------------------------------------

window.CheatsStore = {
  isEnabled: false,
  drawerOpen: false,
  usedThisSession: false,

  // Hi-Lo running count (resets on reshuffle)
  runningCount: 0,

  // Cards seen this shoe (for true count + bust %)
  // Keyed by canonical value: 'A','2'-'9','10' (J/Q/K map to '10')
  seenCounts: { A:0, '2':0, '3':0, '4':0, '5':0, '6':0, '7':0, '8':0, '9':0, '10':0 },

  // Total cards in a 6-deck shoe per canonical value
  SHOE_COUNTS: { A:24, '2':24, '3':24, '4':24, '5':24, '6':24, '7':24, '8':24, '9':24, '10':96 },
  SHOE_TOTAL: 312,

  // Current derived values (updated by cheatsUI on each event)
  bustPercent: 0,
  recommendedMove: null,    // 'H','S','D','Sp', or null
  recommendedReasoning: '',

  // Session stats
  handsPlayed: 0,
  followedAdvice: 0,
  deviatedAdvice: 0,

  // -------------------------------------------------------------------------
  enable() {
    this.isEnabled = true;
    this.usedThisSession = true;
  },

  disable() {
    this.isEnabled = false;
  },

  // Canonical value key for seen-counts tracking
  canonicalValue(cardValue) {
    if (['J', 'Q', 'K'].includes(cardValue)) return '10';
    return cardValue; // A, 2-10
  },

  recordCard(cardValue) {
    const key = this.canonicalValue(cardValue);
    if (this.seenCounts[key] !== undefined) this.seenCounts[key]++;
  },

  resetShoe() {
    for (const k of Object.keys(this.seenCounts)) this.seenCounts[k] = 0;
    this.runningCount = 0;
  },

  resetRound() {
    this.bustPercent = 0;
    this.recommendedMove = null;
    this.recommendedReasoning = '';
  },

  get totalSeen() {
    return Object.values(this.seenCounts).reduce((a, b) => a + b, 0);
  },

  get totalRemaining() {
    return this.SHOE_TOTAL - this.totalSeen;
  },

  get decksRemaining() {
    return Math.max(this.totalRemaining / 52, 0.5);
  },
};
