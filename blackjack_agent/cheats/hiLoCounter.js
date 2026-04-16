'use strict';

// ---------------------------------------------------------------------------
// HiLoCounter — Hi-Lo card counting system
//
// Card values:  2-6 → +1,  7-9 → 0,  10/J/Q/K/A → -1
// ---------------------------------------------------------------------------

window.HiLoCounter = (() => {

  function getHiLoValue(cardValue) {
    if (['2', '3', '4', '5', '6'].includes(cardValue)) return 1;
    if (['7', '8', '9'].includes(cardValue))            return 0;
    return -1; // 10, J, Q, K, A
  }

  // Running count / decks remaining (rounded to 1 decimal)
  function getTrueCount(runningCount, decksRemaining) {
    if (decksRemaining < 0.5) return runningCount;
    return Math.round((runningCount / decksRemaining) * 10) / 10;
  }

  function getInterpretation(trueCount) {
    if (trueCount >= 2)  return 'Deck favors you \u2014 consider betting more.';
    if (trueCount >= 0)  return 'Neutral deck.';
    return 'Deck favors dealer \u2014 play conservatively.';
  }

  return { getHiLoValue, getTrueCount, getInterpretation };
})();
