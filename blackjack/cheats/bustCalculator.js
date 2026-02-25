'use strict';

// ---------------------------------------------------------------------------
// BustCalculator — computes the probability the next hit busts the player
//
// Logic:
//  1. Calculate the player's hard total (soft hands can never bust on one hit).
//  2. Determine the maximum safe card value: maxSafe = 21 - hardTotal.
//  3. Sum all remaining cards in the shoe whose hard value > maxSafe.
//  4. Bust % = bustingCards / totalRemaining * 100
//
// Ace note: when considering a hit onto a HARD hand, an ace is always
// counted as 1 (it can never bust a hard hand). So aces are excluded from
// the busting count.
// ---------------------------------------------------------------------------

window.BustCalculator = (() => {

  // Returns { percent, cannotBust, alreadyBusted }
  function calcBustPercent(playerHand, seenCounts, SHOE_COUNTS, SHOE_TOTAL) {
    let score = 0, aces = 0;

    for (const card of playerHand) {
      if (!card.faceUp) continue;
      if (card.value === 'A')                             { aces++; score += 11; }
      else if (['J', 'Q', 'K'].includes(card.value))       score += 10;
      else                                                  score += parseInt(card.value, 10);
    }
    while (score > 21 && aces > 0) { score -= 10; aces--; }

    if (score > 21) return { percent: 100, cannotBust: false, alreadyBusted: true };

    // Soft hand: the player still has an ace counted as 11.
    // Hitting can never bust because the ace absorbs up to 10 points.
    if (aces > 0)  return { percent: 0, cannotBust: true, alreadyBusted: false };

    // Hard total ≤ 11: no card can push it over 21 in one hit (max card = 10).
    if (score <= 11) return { percent: 0, cannotBust: true, alreadyBusted: false };

    const maxSafe = 21 - score; // e.g. hard 16 → maxSafe = 5

    // Count remaining cards that would bust
    let bustCount = 0;
    let totalRemaining = 0;

    for (const [key, initial] of Object.entries(SHOE_COUNTS)) {
      const remaining = Math.max(0, initial - (seenCounts[key] || 0));
      totalRemaining += remaining;

      if (key === 'A') continue; // ace → always 1, never busts hard hand

      const hardVal = parseInt(key, 10); // '10' → 10, '2'-'9' → face value
      if (hardVal > maxSafe) bustCount += remaining;
    }

    if (totalRemaining === 0) return { percent: 0, cannotBust: false, alreadyBusted: false };

    const percent = Math.round((bustCount / totalRemaining) * 100);
    return { percent, cannotBust: false, alreadyBusted: false };
  }

  return { calcBustPercent };
})();
