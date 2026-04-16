'use strict';

// ---------------------------------------------------------------------------
// AgentApi — OpenAI API integration for the blackjack AI agent
//
// Reads live game state, builds a structured prompt, calls the
// OpenAI chat completions API, and returns { action, reasoning }.
// ---------------------------------------------------------------------------

window.AgentApi = (() => {

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const SUIT_SYMBOL = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };

  function cardLabel(card) {
    return `${card.value}${SUIT_SYMBOL[card.suit] || ''}`;
  }

  function calcVisibleScore(hand) {
    const visible = hand.filter(c => c.faceUp);
    let score = 0, aces = 0;
    for (const c of visible) {
      if (c.value === 'A')                          { aces++; score += 11; }
      else if (['J', 'Q', 'K'].includes(c.value))  score += 10;
      else                                          score += parseInt(c.value, 10);
    }
    while (score > 21 && aces > 0) { score -= 10; aces--; }
    return { score, soft: aces > 0 && score <= 21 };
  }

  // -------------------------------------------------------------------------
  // Read available actions from live DOM button states
  // -------------------------------------------------------------------------
  function getAvailableActions() {
    const map = { 'btn-hit': 'HIT', 'btn-stand': 'STAND', 'btn-double': 'DOUBLE', 'btn-split': 'SPLIT' };
    return Object.entries(map)
      .filter(([id]) => {
        const el = document.getElementById(id);
        return el && !el.disabled;
      })
      .map(([, action]) => action);
  }

  // -------------------------------------------------------------------------
  // Collect all context needed for the prompt
  // -------------------------------------------------------------------------
  function getGameContext() {
    const store = window.AgentStore;
    const playerHand = store.currentPlayerHand;
    const dealerHand = store.currentDealerHand;
    const dealerUpCard = dealerHand.find(c => c.faceUp) || null;

    const { score: playerScore, soft: playerSoft } = calcVisibleScore(playerHand);
    const visiblePlayerCards = playerHand.filter(c => c.faceUp);

    // Balance and bet from DOM
    const balanceEl = document.getElementById('balance');
    const betEl = document.getElementById('bet-amount');
    const balance = parseInt((balanceEl?.textContent || '0').replace(/[$,]/g, ''), 10) || 0;
    const bet = parseInt((betEl?.textContent || '0').replace(/[$,]/g, ''), 10) || 0;

    // Basic strategy recommendation (reuses existing module)
    let basicRec = '?';
    let basicReason = '';
    if (window.BasicStrategy && dealerUpCard) {
      const move = window.BasicStrategy.getRecommendedMove(playerHand, dealerUpCard);
      if (move) {
        basicRec = move;
        basicReason = window.BasicStrategy.getReasoning(move, playerHand, dealerUpCard);
      }
    }

    const availableActions = getAvailableActions();

    return {
      playerHand,
      dealerHand,
      dealerUpCard,
      visiblePlayerCards,
      playerScore,
      playerSoft,
      balance,
      bet,
      basicRec,
      basicReason,
      runningCount: store.runningCount,
      trueCount: store.trueCount,
      decksRemaining: store.decksRemaining,
      availableActions: availableActions.length > 0 ? availableActions : ['HIT', 'STAND'],
    };
  }

  // -------------------------------------------------------------------------
  // Build the OpenAI prompt from game context
  // -------------------------------------------------------------------------
  function buildPrompt(ctx) {
    const {
      visiblePlayerCards, playerScore, playerSoft, dealerUpCard,
      basicRec, basicReason, runningCount, trueCount, decksRemaining,
      balance, bet, availableActions,
    } = ctx;

    const playerCardsStr = visiblePlayerCards.map(cardLabel).join(', ') || '—';
    const dealerCardStr  = dealerUpCard ? cardLabel(dealerUpCard) : 'Unknown';
    const handType       = playerSoft ? `Soft ${playerScore}` : `Hard ${playerScore}`;
    const countSign      = (n) => (n >= 0 ? '+' : '') + n;

    const system = [
      'You are an expert blackjack advisor with perfect knowledge of basic strategy and card counting.',
      'Analyze the game state below and recommend the single optimal action.',
      'Respond ONLY with valid JSON in this exact format: {"action":"HIT","reasoning":"..."}',
      `Action MUST be one of: ${availableActions.join(', ')}.`,
      'Reasoning must be 1-2 concise sentences explaining the strategic logic.',
    ].join('\n');

    const user = [
      'Current game state:',
      `  Player hand : ${playerCardsStr}  →  ${handType}`,
      `  Dealer up   : ${dealerCardStr}`,
      `  Basic strategy says : ${basicRec}  (${basicReason || 'standard play'})`,
      `  Hi-Lo running count : ${countSign(runningCount)}`,
      `  True count          : ${countSign(trueCount)}  (${decksRemaining.toFixed(1)} decks remaining)`,
      `  Balance             : $${balance.toLocaleString()}`,
      `  Current bet         : $${bet}`,
      `  Available actions   : ${availableActions.join(', ')}`,
      '',
      'What is the optimal action?',
    ].join('\n');

    return { system, user };
  }

  // -------------------------------------------------------------------------
  // Call OpenAI chat completions API
  // -------------------------------------------------------------------------
  async function callOpenAI(prompt, apiKey, model) {
    let response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || 'gpt-4o',
          messages: [
            { role: 'system', content: prompt.system },
            { role: 'user',   content: prompt.user   },
          ],
          max_tokens: 200,
          temperature: 0,
        }),
      });
    } catch {
      throw new Error('Network error — check your connection.');
    }

    if (!response.ok) {
      let errMsg = `API error (${response.status})`;
      try {
        const errBody = await response.json();
        if (errBody?.error?.message) errMsg = errBody.error.message;
      } catch { /* ignore */ }
      throw new Error(errMsg);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('Empty response from API.');

    // Strip markdown code fences if present
    const cleaned = content
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error('AI response was not valid JSON. Try again.');
    }

    if (!parsed.action || !parsed.reasoning) {
      throw new Error('AI response missing required fields.');
    }

    const action = parsed.action.toUpperCase().trim();
    const validActions = ['HIT', 'STAND', 'DOUBLE', 'SPLIT'];
    if (!validActions.includes(action)) {
      throw new Error(`Unexpected action from AI: "${action}".`);
    }

    return { action, reasoning: parsed.reasoning };
  }

  // -------------------------------------------------------------------------
  // Public: get a recommendation for the current game state
  // -------------------------------------------------------------------------
  async function getRecommendation() {
    const store = window.AgentStore;
    if (!store.apiKey) throw new Error('No API key configured.');

    const ctx = getGameContext();
    const prompt = buildPrompt(ctx);
    const rec = await callOpenAI(prompt, store.apiKey, store.model);
    return { rec, ctx };
  }

  return { getRecommendation, getGameContext };
})();
