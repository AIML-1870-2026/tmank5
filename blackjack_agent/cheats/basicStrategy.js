'use strict';

// ---------------------------------------------------------------------------
// BasicStrategy — full basic strategy lookup table (6-deck, dealer stands S17)
//
// Dealer upcard columns: 2,3,4,5,6,7,8,9,10,A  (index 0-9)
// Move codes: H=Hit, S=Stand, D=Double, Sp=Split
// ---------------------------------------------------------------------------

window.BasicStrategy = (() => {

  // Maps any card value to column index 0-9
  const DEALER_COL = {
    '2':0, '3':1, '4':2, '5':3, '6':4,
    '7':5, '8':6, '9':7, '10':8, 'J':8, 'Q':8, 'K':8, 'A':9
  };

  // Hard totals — rows keyed by total (8 through 17; 17 means "17 and above").
  // prettier-ignore
  const HARD = {
     8: ['H','H','H','H','H','H','H','H','H','H'],
     9: ['H','D','D','D','D','H','H','H','H','H'],
    10: ['D','D','D','D','D','D','D','D','H','H'],
    11: ['D','D','D','D','D','D','D','D','D','H'],
    12: ['H','H','S','S','S','H','H','H','H','H'],
    13: ['S','S','S','S','S','H','H','H','H','H'],
    14: ['S','S','S','S','S','H','H','H','H','H'],
    15: ['S','S','S','S','S','H','H','H','H','H'],
    16: ['S','S','S','S','S','H','H','H','H','H'],
    17: ['S','S','S','S','S','S','S','S','S','S'],
  };

  // Soft totals — keyed by the non-ace card value (2=soft-13 … 9=soft-20).
  // Only meaningful when hand has exactly one ace counted as 11.
  // prettier-ignore
  const SOFT = {
    2: ['H','H','H','D','D','H','H','H','H','H'],  // soft 13
    3: ['H','H','H','D','D','H','H','H','H','H'],  // soft 14
    4: ['H','H','D','D','D','H','H','H','H','H'],  // soft 15
    5: ['H','H','D','D','D','H','H','H','H','H'],  // soft 16
    6: ['H','D','D','D','D','H','H','H','H','H'],  // soft 17
    7: ['S','D','D','D','D','S','S','H','H','H'],  // soft 18
    8: ['S','S','S','S','S','S','S','S','S','S'],  // soft 19
    9: ['S','S','S','S','S','S','S','S','S','S'],  // soft 20
  };

  // Pairs — keyed by the numeric value of each card (1=ace, 2-10).
  // J/Q/K all treated as 10.
  // prettier-ignore
  const PAIRS = {
     1: ['Sp','Sp','Sp','Sp','Sp','Sp','Sp','Sp','Sp','Sp'], // A-A
     2: ['Sp','Sp','Sp','Sp','Sp','Sp','H', 'H', 'H', 'H'], // 2-2
     3: ['Sp','Sp','Sp','Sp','Sp','Sp','H', 'H', 'H', 'H'], // 3-3
     4: ['H', 'H', 'H', 'Sp','Sp','H', 'H', 'H', 'H', 'H'], // 4-4
     5: ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H', 'H'], // 5-5 (treat as hard 10)
     6: ['Sp','Sp','Sp','Sp','Sp','H', 'H', 'H', 'H', 'H'], // 6-6
     7: ['Sp','Sp','Sp','Sp','Sp','Sp','H', 'H', 'H', 'H'], // 7-7
     8: ['Sp','Sp','Sp','Sp','Sp','Sp','Sp','Sp','Sp','Sp'], // 8-8
     9: ['Sp','Sp','Sp','Sp','Sp','S', 'Sp','Sp','S', 'S'], // 9-9
    10: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'], // 10-10
  };

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  function numericValue(cardValue) {
    if (cardValue === 'A')                      return 1;
    if (['J', 'Q', 'K'].includes(cardValue))    return 10;
    return parseInt(cardValue, 10);
  }

  // Is this a pair (two cards with equal value)?
  function isPair(hand) {
    const visible = hand.filter(c => c.faceUp);
    if (visible.length !== 2) return false;
    const v1 = numericValue(visible[0].value);
    const v2 = numericValue(visible[1].value);
    return v1 === v2;
  }

  // Does this hand contain an ace still counted as 11?
  function isSoft(hand) {
    let score = 0, aces = 0;
    for (const c of hand) {
      if (!c.faceUp) continue;
      if (c.value === 'A')                        { aces++; score += 11; }
      else if (['J', 'Q', 'K'].includes(c.value))   score += 10;
      else                                           score += parseInt(c.value, 10);
    }
    while (score > 21 && aces > 0) { score -= 10; aces--; }
    return aces > 0;
  }

  // -------------------------------------------------------------------------
  // getRecommendedMove(playerHand, dealerUpcard)
  // Returns 'H','S','D','Sp', or null
  // -------------------------------------------------------------------------
  function getRecommendedMove(playerHand, dealerUpcard) {
    if (!dealerUpcard || !playerHand || playerHand.length === 0) return null;

    const col = DEALER_COL[dealerUpcard.value];
    if (col === undefined) return null;

    const visible = playerHand.filter(c => c.faceUp);
    if (visible.length === 0) return null;

    // --- Pair check (only for exactly 2-card hands) ---
    if (isPair(visible)) {
      const pairNum = numericValue(visible[0].value);
      const key = pairNum; // 1 for A, 2-10 for numeric
      const row = PAIRS[key];
      if (row) return row[col];
    }

    // --- Score calculation ---
    let score = 0, aces = 0;
    for (const c of visible) {
      if (c.value === 'A')                        { aces++; score += 11; }
      else if (['J', 'Q', 'K'].includes(c.value))   score += 10;
      else                                           score += parseInt(c.value, 10);
    }
    while (score > 21 && aces > 0) { score -= 10; aces--; }

    if (score > 21) return null; // already busted

    // --- Soft hand (ace still as 11, exactly 2 cards) ---
    if (aces > 0 && visible.length === 2) {
      const nonAce = visible.find(c => c.value !== 'A');
      if (nonAce) {
        const nv = numericValue(nonAce.value);
        if (nv >= 2 && nv <= 9) {
          const row = SOFT[nv];
          if (row) return row[col];
        }
        if (nv === 10) return 'S'; // soft 21 (BJ) — stand
      }
    }

    // --- Hard total ---
    const hardKey = Math.min(score, 17);
    return (HARD[hardKey] || HARD[17])[col];
  }

  // -------------------------------------------------------------------------
  // getReasoning — one-line English explanation for the recommended move
  // -------------------------------------------------------------------------
  function getReasoning(move, playerHand, dealerUpcard) {
    if (!move || !dealerUpcard) return '';

    const col = DEALER_COL[dealerUpcard.value];
    const isWeakDealer  = col !== undefined && col <= 4; // 2-6
    const isStrongDealer = col !== undefined && col >= 5; // 7-A

    let score = 0, aces = 0;
    for (const c of playerHand) {
      if (!c.faceUp) continue;
      if (c.value === 'A')                        { aces++; score += 11; }
      else if (['J', 'Q', 'K'].includes(c.value))   score += 10;
      else                                           score += parseInt(c.value, 10);
    }
    while (score > 21 && aces > 0) { score -= 10; aces--; }

    const dv = dealerUpcard.value;

    if (move === 'S') {
      if (isWeakDealer) return `Dealer shows ${dv} \u2014 high bust risk. Stand and let them bust.`;
      return `Your ${score} is strong enough to stand here.`;
    }
    if (move === 'H') {
      if (score <= 11)    return `You can\u2019t bust on this hit. Always take the card.`;
      if (isStrongDealer) return `Dealer shows ${dv} \u2014 strong upcard. Hit to improve your hand.`;
      return `Your ${score} needs improvement vs dealer ${dv}.`;
    }
    if (move === 'D') {
      return `Strong position \u2014 double your bet and take one card for maximum value.`;
    }
    if (move === 'Sp') {
      return `Split this pair to play two stronger independent hands.`;
    }
    return '';
  }

  return { getRecommendedMove, getReasoning, isPair, isSoft };
})();
