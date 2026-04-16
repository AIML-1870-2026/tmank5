'use strict';

document.addEventListener('DOMContentLoaded', () => {

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const state = {
    phase: 'BETTING',
    shoe: [],
    balance: 1000,
    bet: 0,
    playerHand: [],
    dealerHand: [],
    firstAction: true,
    // Split state
    isSplit:    false,
    splitHand:  [],
    activeHand: 0,     // 0 = main hand, 1 = split hand
    splitBet:   0,
    aceSplit:   false, // ace-split: one card each then auto-stand
  };

  // ---------------------------------------------------------------------------
  // EVENT EMITTER — thin wrapper so cheats module can subscribe without coupling
  // ---------------------------------------------------------------------------
  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
  }

  // ---------------------------------------------------------------------------
  // SPLIT HELPERS
  // ---------------------------------------------------------------------------

  function cardNumericVal(v) {
    if (v === 'A') return 1;
    if (['J', 'Q', 'K'].includes(v)) return 10;
    return parseInt(v, 10);
  }

  function isPair(hand) {
    if (hand.length !== 2) return false;
    return cardNumericVal(hand[0].value) === cardNumericVal(hand[1].value);
  }

  // Returns the hand that is currently being played
  function activePlayerHand() {
    return (state.isSplit && state.activeHand === 1) ? state.splitHand : state.playerHand;
  }

  // Update score display for one hand (0 = main, 1 = split)
  function updateHandScore(handIndex) {
    const hand        = handIndex === 0 ? state.playerHand : state.splitHand;
    const scoreId     = handIndex === 0 ? 'player-score'   : 'split-score';
    const containerId = handIndex === 0 ? 'player-cards'   : 'split-cards';
    const el = document.getElementById(scoreId);
    const { score, bust, blackjack } = calcScore(hand);
    el.textContent = blackjack ? 'BJ' : score || '';
    if (score) popScore(el);
    el.classList.toggle('score-warning', score >= 18 && !blackjack);
    if (bust) {
      document.getElementById(containerId).querySelectorAll('.card').forEach(c => {
        c.classList.add('card-busted');
      });
    }
  }
  function updateSplitScore() { updateHandScore(1); }

  // Highlight the currently active hand column
  function setActiveHand(n) {
    state.activeHand = n;
    document.getElementById('player-hand-wrapper').classList.toggle('hand-active', n === 0);
    document.getElementById('split-hand-wrapper').classList.toggle('hand-active',  n === 1);
  }

  // Show the split zone and switch player zone to two-column layout
  function splitShowZone() {
    document.getElementById('player-zone').classList.add('split-active');
    document.getElementById('split-hand-wrapper').style.display = 'block';
    document.getElementById('player-zone-label').textContent = 'Hand 1';
  }

  // Hide split zone and restore single-hand layout
  function splitHideZone() {
    document.getElementById('player-zone').classList.remove('split-active');
    const sw = document.getElementById('split-hand-wrapper');
    sw.style.display = 'none';
    sw.classList.remove('hand-active');
    document.getElementById('split-cards').innerHTML = '';
    const splitScore = document.getElementById('split-score');
    splitScore.textContent = '—';
    delete splitScore.dataset.result;
    document.getElementById('player-hand-wrapper').classList.remove('hand-active');
    document.getElementById('player-zone-label').textContent = 'Player';
  }

  // Move from hand 0 to hand 1
  function switchToSplitHand() {
    state.firstAction = true;
    setActiveHand(1);
    setPhase('PLAYER_TURN');
  }

  // Central finish-hand logic — decides whether to switch hands or end round
  function finishCurrentHand(playerBusted) {
    if (state.isSplit && state.activeHand === 0) {
      // Hand 0 done — switch to hand 1
      setTimeout(switchToSplitHand, playerBusted ? 420 : 0);
    } else if (state.isSplit && state.activeHand === 1) {
      // Both hands done — determine whether dealer must draw
      const hand0Bust = calcScore(state.playerHand).bust;
      setPhase('DEALER_TURN');
      if (hand0Bust && playerBusted) {
        // Both hands busted — no dealer play needed
        setTimeout(resolveSplitRound, 420);
      } else {
        // At least one hand is standing — dealer draws
        runDealerTurn();
      }
    } else {
      // Single-hand mode
      setPhase('DEALER_TURN');
      if (playerBusted) {
        setTimeout(resolveRound, 420);
      } else {
        runDealerTurn();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // SHOE MANAGEMENT
  // ---------------------------------------------------------------------------

  const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
  const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  function buildShoe() {
    const cards = [];
    for (let d = 0; d < 6; d++) {
      for (const suit of SUITS) {
        for (const value of VALUES) {
          cards.push({ suit, value, faceUp: true });
        }
      }
    }
    return fisherYates(cards);
  }

  function fisherYates(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function checkReshuffle() {
    if (state.shoe.length < 78) {
      state.shoe = buildShoe();
      emit('bj:reshuffled');
    }
  }

  function drawCard(faceUp = true) {
    checkReshuffle();
    const card = state.shoe.pop();
    card.faceUp = faceUp;
    return card;
  }

  // ---------------------------------------------------------------------------
  // SCORING
  // ---------------------------------------------------------------------------

  function calcScore(cards) {
    let score = 0;
    let aces = 0;
    for (const card of cards) {
      if (!card.faceUp) continue;
      if (card.value === 'A') { aces++; score += 11; }
      else if (['J', 'Q', 'K'].includes(card.value)) score += 10;
      else score += parseInt(card.value, 10);
    }
    let soft = false;
    while (score > 21 && aces > 0) { score -= 10; aces--; }
    if (aces > 0 && score <= 21) soft = true;
    return {
      score,
      soft,
      bust: score > 21,
      blackjack: score === 21 && cards.filter(c => c.faceUp).length === 2,
    };
  }

  // ---------------------------------------------------------------------------
  // SOUND SYSTEM (Web Audio API — no external files)
  // ---------------------------------------------------------------------------

  let audioCtx = null;
  let audioEnabled = true;

  function getCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  // Short noise burst with bandpass/highpass filter — models paper/ceramic sounds
  function noiseShot({ duration = 0.06, vol = 0.18, filterType = 'bandpass', frequency = 1800, Q = 1.5, at = 0 } = {}) {
    if (!audioEnabled) return;
    const ctx = getCtx();
    const t = ctx.currentTime + at;
    const samples = Math.floor(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, samples, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < samples; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / samples);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = Q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(t);
  }

  // Sine oscillator tone — models piano/bell notes
  function toneShot({ freq = 440, vol = 0.3, decay = 0.6, at = 0, harmonics = true } = {}) {
    if (!audioEnabled) return;
    const ctx = getCtx();
    const t = ctx.currentTime + at;
    const partials = harmonics ? [[1, vol], [2, vol * 0.25], [3, vol * 0.1]] : [[1, vol]];
    for (const [h, v] of partials) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq * h;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(v, t);
      gain.gain.setTargetAtTime(0, t + 0.05, decay);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + decay * 6);
    }
  }

  const sounds = {
    // Soft paper slide — card dealing
    deal() {
      noiseShot({ duration: 0.07, vol: 0.16, filterType: 'bandpass', frequency: 1600, Q: 1.2 });
    },

    // Sharper snap — card flip
    flip() {
      noiseShot({ duration: 0.045, vol: 0.22, filterType: 'highpass', frequency: 4500, Q: 0.8 });
    },

    // Light ceramic click — chip place
    chip() {
      noiseShot({ duration: 0.03, vol: 0.14, filterType: 'highpass', frequency: 5500, Q: 0.5 });
    },

    // Warm piano note — win
    win() {
      toneShot({ freq: 523.25, vol: 0.32, decay: 0.7 }); // C5
    },

    // Two ascending notes — blackjack
    blackjack() {
      toneShot({ freq: 523.25, vol: 0.35, decay: 0.7, at: 0 });    // C5
      toneShot({ freq: 659.25, vol: 0.35, decay: 0.8, at: 0.22 }); // E5
    },

    // Low thud — bust / lose
    bust() {
      if (!audioEnabled) return;
      const ctx = getCtx();
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, t);
      osc.frequency.exponentialRampToValueAtTime(38, t + 0.45);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.38, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    },

    // Neutral mid tone — push
    push() {
      toneShot({ freq: 392, vol: 0.14, decay: 0.4, harmonics: false }); // G4
    },
  };

  // ---------------------------------------------------------------------------
  // SUIT SYMBOLS
  // ---------------------------------------------------------------------------

  const SUIT_SYMBOLS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };

  // ---------------------------------------------------------------------------
  // CARD DOM CREATION
  // ---------------------------------------------------------------------------

  function createCardElement(card) {
    const sym = SUIT_SYMBOLS[card.suit];
    const el = document.createElement('div');
    el.className = 'card card-dealing';
    el.dataset.suit = card.suit;
    el.dataset.value = card.value;
    el.dataset.faceUp = 'false';
    el.innerHTML = `
      <div class="card-inner">
        <div class="card-front">
          <span class="card-corner top-left">
            <span class="card-val">${card.value}</span>
            <span class="card-suit">${sym}</span>
          </span>
          <span class="card-center-suit">${sym}</span>
          <span class="card-corner bottom-right">
            <span class="card-val">${card.value}</span>
            <span class="card-suit">${sym}</span>
          </span>
        </div>
        <div class="card-back"></div>
      </div>`;
    return el;
  }

  function dealCardToDOM(card, container, faceUp, callback) {
    const el = createCardElement(card);
    container.appendChild(el);
    // Emit before animation so cheats module can attach flash badge
    emit('bj:cardDealt', { card, faceUp, el, target: container.id === 'dealer-cards' ? 'dealer' : 'player' });
    requestAnimationFrame(() => {
      setTimeout(() => {
        el.dataset.faceUp = faceUp ? 'true' : 'false';
        el.classList.remove('card-dealing');
        if (callback) callback();
      }, 20);
    });
    sounds.deal();
    return el;
  }

  // ---------------------------------------------------------------------------
  // SCORE DISPLAY HELPERS
  // ---------------------------------------------------------------------------

  function popScore(el) {
    el.classList.remove('score-pop');
    void el.offsetWidth;
    el.classList.add('score-pop');
  }

  function updatePlayerScore() { updateHandScore(0); }

  function updateDealerScore(reveal = false) {
    const el = document.getElementById('dealer-score');
    if (!reveal) {
      const visibleCards = state.dealerHand.filter(c => c.faceUp);
      if (visibleCards.length === 0) { el.textContent = '?'; return; }
      let score = 0, aces = 0;
      for (const card of visibleCards) {
        if (card.value === 'A') { aces++; score += 11; }
        else if (['J', 'Q', 'K'].includes(card.value)) score += 10;
        else score += parseInt(card.value, 10);
      }
      while (score > 21 && aces > 0) { score -= 10; aces--; }
      el.textContent = state.dealerHand.some(c => !c.faceUp) ? score + ' + ?' : score;
    } else {
      const { score, blackjack } = calcScore(state.dealerHand);
      el.textContent = blackjack ? 'BJ' : score;
      popScore(el);
    }
  }

  // ---------------------------------------------------------------------------
  // BALANCE & BET UI
  // ---------------------------------------------------------------------------

  function animateBalance(from, to, duration = 600) {
    const start = performance.now();
    function update(now) {
      const t = Math.min((now - start) / duration, 1);
      const val = Math.round(from + (to - from) * t);
      document.getElementById('balance').textContent = '$' + val.toLocaleString();
      if (t < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  function setBalanceDisplay(val) {
    document.getElementById('balance').textContent = '$' + val.toLocaleString();
  }

  function updateBetDisplay() {
    const betDisplay = document.getElementById('bet-display');
    const betAmount  = document.getElementById('bet-amount');
    const clearBtn   = document.getElementById('btn-clear');
    const dealBtn    = document.getElementById('btn-deal');

    if (state.bet > 0) {
      betDisplay.classList.remove('hidden');
      betAmount.textContent = '$' + state.bet.toLocaleString();
      dealBtn.classList.add('deal-visible');
      clearBtn.disabled = false;
    } else {
      betDisplay.classList.add('hidden');
      betAmount.textContent = '$0';
      dealBtn.classList.remove('deal-visible');
      clearBtn.disabled = true;
    }
    renderChipStack(state.bet);
  }

  // ---------------------------------------------------------------------------
  // CHIP STACK VISUALIZATION
  // ---------------------------------------------------------------------------

  const CHIP_COLORS = { 500: '#9E7A8A', 100: '#9E8A7A', 25: '#7A8B9E', 5: '#8B9E7A' };

  function renderChipStack(bet) {
    const stack = document.getElementById('chip-stack');
    stack.innerHTML = '';
    if (bet === 0) return;
    const denoms = [500, 100, 25, 5];
    const chips = [];
    let remaining = bet;
    for (const d of denoms) {
      while (remaining >= d) { chips.push(d); remaining -= d; }
    }
    chips.forEach(val => {
      const div = document.createElement('div');
      div.className = 'stack-chip';
      div.dataset.color = val;
      stack.appendChild(div);
    });
  }

  // ---------------------------------------------------------------------------
  // PHASE MANAGEMENT
  // ---------------------------------------------------------------------------

  function setPhase(phase) {
    state.phase = phase;
    emit('bj:phaseChanged', { phase, playerHand: activePlayerHand(), dealerHand: state.dealerHand });

    const bettingControls = document.getElementById('betting-controls');
    const playControls    = document.getElementById('play-controls');
    const dealBtn         = document.getElementById('btn-deal');

    bettingControls.style.opacity      = '0';
    bettingControls.style.pointerEvents = 'none';
    bettingControls.style.visibility   = 'hidden';
    playControls.style.opacity         = '0';
    playControls.style.pointerEvents   = 'none';
    playControls.style.visibility      = 'hidden';

    switch (phase) {
      case 'BETTING':
        bettingControls.style.opacity      = '1';
        bettingControls.style.pointerEvents = 'auto';
        bettingControls.style.visibility   = 'visible';
        // Reset deal button text safely
        dealBtn.innerHTML = 'Deal &rarr;<small class="key-hint">Enter</small>';
        document.getElementById('btn-double').disabled = true;
        document.getElementById('btn-hit').disabled    = true;
        document.getElementById('btn-stand').disabled  = true;
        document.getElementById('btn-split').disabled  = true;
        break;

      case 'DEALING':
        break;

      case 'PLAYER_TURN': {
        playControls.style.opacity      = '1';
        playControls.style.pointerEvents = 'auto';
        playControls.style.visibility   = 'visible';
        document.getElementById('btn-hit').disabled    = false;
        document.getElementById('btn-stand').disabled  = false;
        document.getElementById('btn-double').disabled = !state.firstAction;
        const canSplit = state.firstAction && !state.isSplit &&
                         isPair(activePlayerHand()) && state.balance >= state.bet;
        document.getElementById('btn-split').disabled = !canSplit;
        break;
      }

      case 'DEALER_TURN':
        break;

      case 'ROUND_END':
        bettingControls.style.opacity      = '1';
        bettingControls.style.pointerEvents = 'auto';
        bettingControls.style.visibility   = 'visible';
        dealBtn.innerHTML = 'Play Again<small class="key-hint">Enter</small>';
        dealBtn.classList.add('deal-visible');
        dealBtn.disabled = false;
        break;

      case 'GAME_OVER':
        document.getElementById('game-over-modal').style.display = 'flex';
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // RESULT OVERLAY
  // ---------------------------------------------------------------------------

  function showResult(message, resultType) {
    const overlay = document.getElementById('result-overlay');
    const msgEl   = document.getElementById('result-message');
    overlay.dataset.result = resultType || message;
    msgEl.textContent = message;
    overlay.classList.add('result-visible');
  }

  function hideResult() {
    document.getElementById('result-overlay').classList.remove('result-visible');
  }

  // ---------------------------------------------------------------------------
  // WIN GLOW
  // ---------------------------------------------------------------------------

  function showWinGlow() {
    const el = document.getElementById('player-cards');
    el.classList.remove('win-glow');
    void el.offsetWidth;
    el.classList.add('win-glow');
    setTimeout(() => el.classList.remove('win-glow'), 2000);
  }

  // ---------------------------------------------------------------------------
  // BETTING ACTIONS
  // ---------------------------------------------------------------------------

  function placeBet(amount) {
    if (state.phase !== 'BETTING') return;
    const maxAdd = state.balance - state.bet;
    if (maxAdd <= 0) return;
    state.bet += Math.min(amount, maxAdd);
    sounds.chip();
    updateBetDisplay();
  }

  function clearBet() {
    if (state.phase !== 'BETTING') return;
    state.bet = 0;
    updateBetDisplay();
  }

  // ---------------------------------------------------------------------------
  // DEAL
  // ---------------------------------------------------------------------------

  function deal() {
    if (state.phase === 'ROUND_END') { newRound(); return; }
    if (state.phase !== 'BETTING')   return;
    if (state.bet === 0)             return;

    state.balance -= state.bet;
    setBalanceDisplay(state.balance);

    state.playerHand = [];
    state.dealerHand = [];
    state.firstAction = true;

    const playerContainer = document.getElementById('player-cards');
    const dealerContainer = document.getElementById('dealer-cards');
    playerContainer.innerHTML = '';
    dealerContainer.innerHTML = '';
    playerContainer.classList.remove('card-busted', 'win-glow');
    document.getElementById('player-score').textContent = '';
    document.getElementById('dealer-score').textContent = '?';
    hideResult();

    setPhase('DEALING');

    const p1 = drawCard(true);
    const d1 = drawCard(true);
    const p2 = drawCard(true);
    const d2 = drawCard(false);

    state.playerHand.push(p1, p2);
    state.dealerHand.push(d1, d2);

    setTimeout(() => dealCardToDOM(p1, playerContainer, true,  () => updatePlayerScore()), 0);
    setTimeout(() => dealCardToDOM(d1, dealerContainer, true,  () => updateDealerScore(false)), 60);
    setTimeout(() => dealCardToDOM(p2, playerContainer, true,  () => updatePlayerScore()), 120);
    setTimeout(() => dealCardToDOM(d2, dealerContainer, false, null), 180);

    setTimeout(() => {
      const playerResult = calcScore(state.playerHand);
      if (playerResult.blackjack) {
        revealDealerHole(() => resolveRound());
        return;
      }
      setPhase('PLAYER_TURN');
    }, 500);
  }

  // ---------------------------------------------------------------------------
  // PLAYER ACTIONS
  // ---------------------------------------------------------------------------

  function hit() {
    if (state.phase !== 'PLAYER_TURN') return;
    emit('bj:playerAction', { action: 'HIT' });
    state.firstAction = false;
    document.getElementById('btn-double').disabled = true;
    document.getElementById('btn-split').disabled  = true;

    const isHand1   = state.isSplit && state.activeHand === 1;
    const hand      = isHand1 ? state.splitHand : state.playerHand;
    const container = document.getElementById(isHand1 ? 'split-cards' : 'player-cards');

    const card = drawCard(true);
    hand.push(card);
    dealCardToDOM(card, container, true);

    setTimeout(() => {
      updateHandScore(isHand1 ? 1 : 0);
      const { bust } = calcScore(hand);
      if (bust) {
        finishCurrentHand(true);
      } else {
        emit('bj:playerHandUpdated', { playerHand: activePlayerHand(), dealerHand: state.dealerHand });
      }
    }, 80);
  }

  function stand() {
    if (state.phase !== 'PLAYER_TURN') return;
    emit('bj:playerAction', { action: 'STAND' });
    state.firstAction = false;
    finishCurrentHand(false);
  }

  function doubleDown() {
    if (state.phase !== 'PLAYER_TURN') return;
    if (!state.firstAction) return;
    emit('bj:playerAction', { action: 'DOUBLE' });

    const isHand1      = state.isSplit && state.activeHand === 1;
    const hand         = isHand1 ? state.splitHand : state.playerHand;
    const container    = document.getElementById(isHand1 ? 'split-cards' : 'player-cards');
    const currentBet   = isHand1 ? state.splitBet : state.bet;
    const additionalBet = Math.min(currentBet, state.balance);
    if (additionalBet <= 0) { stand(); return; }

    state.balance -= additionalBet;
    if (isHand1) state.splitBet += additionalBet;
    else         state.bet      += additionalBet;
    setBalanceDisplay(state.balance);
    updateBetDisplay();

    state.firstAction = false;
    document.getElementById('btn-double').disabled = true;
    document.getElementById('btn-split').disabled  = true;

    const card = drawCard(true);
    hand.push(card);
    dealCardToDOM(card, container, true);

    setTimeout(() => {
      updateHandScore(isHand1 ? 1 : 0);
      const { bust } = calcScore(hand);
      setTimeout(() => finishCurrentHand(bust), 300);
    }, 80);
  }

  function split() {
    if (state.phase !== 'PLAYER_TURN') return;
    if (!state.firstAction)            return;
    if (state.isSplit)                 return;
    if (!isPair(state.playerHand))     return;
    if (state.balance < state.bet)     return;

    emit('bj:playerAction', { action: 'SPLIT' });

    // Deduct second bet
    state.splitBet  = state.bet;
    state.balance  -= state.splitBet;
    state.aceSplit  = (state.playerHand[1].value === 'A');
    setBalanceDisplay(state.balance);

    // Move second card to split hand in state
    const splitCard = state.playerHand.pop();
    state.splitHand  = [splitCard];
    state.isSplit    = true;
    state.activeHand = 0;

    // Move card DOM element from player-cards to split-cards
    const playerContainer = document.getElementById('player-cards');
    const splitContainer  = document.getElementById('split-cards');
    splitContainer.innerHTML = '';
    const cardEls = playerContainer.querySelectorAll('.card');
    const splitCardEl = cardEls[cardEls.length - 1];
    if (splitCardEl) splitContainer.appendChild(splitCardEl);

    splitShowZone();
    setActiveHand(0);
    updateHandScore(0);
    updateHandScore(1);

    // Deal one card to each hand with short stagger
    setTimeout(() => {
      const c1 = drawCard(true);
      state.playerHand.push(c1);
      dealCardToDOM(c1, playerContainer, true, () => updateHandScore(0));
    }, 200);

    setTimeout(() => {
      const c2 = drawCard(true);
      state.splitHand.push(c2);
      dealCardToDOM(c2, splitContainer, true, () => updateHandScore(1));
    }, 450);

    if (state.aceSplit) {
      // Ace split: one card each, then dealer draws automatically
      setTimeout(() => {
        setPhase('DEALER_TURN');
        runDealerTurn();
      }, 800);
    } else {
      // Normal split: play hand 0 first
      setTimeout(() => {
        state.firstAction = true;
        setActiveHand(0);
        setPhase('PLAYER_TURN');
      }, 800);
    }
  }

  function resolveSplitRound() {
    // Ensure all dealer cards are face up
    const dealerContainer = document.getElementById('dealer-cards');
    state.dealerHand.forEach((card, i) => {
      if (!card.faceUp) {
        card.faceUp = true;
        const el = dealerContainer.querySelectorAll('.card')[i];
        if (el) el.dataset.faceUp = 'true';
      }
    });
    updateDealerScore(true);

    const { bust: dealerBust, score: dealerScore, blackjack: dealerBJ } = calcScore(state.dealerHand);

    function resolveHand(hand, bet, wrapperId) {
      const { bust, score, blackjack } = calcScore(hand);
      let payout = 0, message = '', resultType = '';
      if (bust) {
        payout = 0; message = 'Bust'; resultType = 'BUST';
      } else if (blackjack && !dealerBJ) {
        payout = bet * 2; message = 'Win'; resultType = 'WIN'; // even-money after split
      } else if (blackjack && dealerBJ) {
        payout = bet; message = 'Push'; resultType = 'PUSH';
      } else if (dealerBust) {
        payout = bet * 2; message = 'Win'; resultType = 'WIN';
      } else if (score > dealerScore) {
        payout = bet * 2; message = 'Win'; resultType = 'WIN';
      } else if (score < dealerScore) {
        payout = 0; message = 'Dealer Wins'; resultType = 'LOSE';
      } else {
        payout = bet; message = 'Push'; resultType = 'PUSH';
      }
      document.getElementById(wrapperId).dataset.result = resultType;
      return { payout, message, resultType };
    }

    const h0 = resolveHand(state.playerHand, state.bet,      'player-hand-wrapper');
    const h1 = resolveHand(state.splitHand,  state.splitBet, 'split-hand-wrapper');

    const totalPayout = h0.payout + h1.payout;
    const oldBalance  = state.balance;
    state.balance    += totalPayout;

    const anyWin  = h0.resultType === 'WIN'  || h1.resultType === 'WIN';
    const allLose = (h0.resultType === 'BUST' || h0.resultType === 'LOSE') &&
                    (h1.resultType === 'BUST' || h1.resultType === 'LOSE');
    if (anyWin)       sounds.win();
    else if (allLose) sounds.bust();
    else              sounds.push();

    if (anyWin) showWinGlow();

    // Pick combined result message
    let resultMsg, resultType;
    if (h0.resultType === h1.resultType) {
      resultMsg = h0.message; resultType = h0.resultType;
    } else if (anyWin) {
      resultMsg = 'Win'; resultType = 'WIN';
    } else if (h0.resultType === 'PUSH' || h1.resultType === 'PUSH') {
      resultMsg = 'Push'; resultType = 'PUSH';
    } else {
      resultMsg = 'Dealer Wins'; resultType = 'LOSE';
    }

    showResult(resultMsg, resultType);
    animateBalance(oldBalance, state.balance);

    if (state.balance === 0 && totalPayout === 0) {
      setTimeout(() => setPhase('GAME_OVER'), 1800);
      return;
    }
    setTimeout(() => { hideResult(); setPhase('ROUND_END'); }, 1600);
  }

  // ---------------------------------------------------------------------------
  // DEALER TURN
  // ---------------------------------------------------------------------------

  function revealDealerHole(callback) {
    const holeCard = state.dealerHand[1];
    if (!holeCard || holeCard.faceUp) { if (callback) callback(); return; }

    const dealerContainer = document.getElementById('dealer-cards');
    const cardEls = dealerContainer.querySelectorAll('.card');
    const holeEl  = cardEls[1];

    if (!holeEl) {
      holeCard.faceUp = true;
      updateDealerScore(true);
      if (callback) callback();
      return;
    }

    sounds.flip();
    const inner = holeEl.querySelector('.card-inner');
    inner.classList.add('card-flipping');

    setTimeout(() => {
      holeCard.faceUp = true;
      holeEl.dataset.faceUp = 'true';
      emit('bj:holeRevealed', { card: holeCard });
    }, 175);

    setTimeout(() => {
      inner.classList.remove('card-flipping');
      updateDealerScore(true);
      if (callback) callback();
    }, 380);
  }

  function runDealerTurn() {
    revealDealerHole(() => setTimeout(dealerHitLoop, 600));
  }

  function dealerHitLoop() {
    const { score, soft, bust } = calcScore(state.dealerHand);
    const shouldHit = !bust && (score < 17 || (score === 16 && soft));

    if (shouldHit) {
      const card = drawCard(true);
      state.dealerHand.push(card);
      dealCardToDOM(card, document.getElementById('dealer-cards'), true, () => updateDealerScore(true));
      setTimeout(dealerHitLoop, 600);
    } else {
      resolveRound();
    }
  }

  // ---------------------------------------------------------------------------
  // ROUND RESOLUTION
  // ---------------------------------------------------------------------------

  function resolveRound() {
    if (state.isSplit) { resolveSplitRound(); return; }
    const dealerContainer = document.getElementById('dealer-cards');
    state.dealerHand.forEach((card, i) => {
      if (!card.faceUp) {
        card.faceUp = true;
        const el = dealerContainer.querySelectorAll('.card')[i];
        if (el) el.dataset.faceUp = 'true';
      }
    });
    updateDealerScore(true);

    const playerResult = calcScore(state.playerHand);
    const dealerResult = calcScore(state.dealerHand);
    const { bust: playerBust, blackjack: playerBJ, score: playerScore } = playerResult;
    const { bust: dealerBust, blackjack: dealerBJ, score: dealerScore } = dealerResult;

    let payout = 0, message = '', resultType = '';

    if (playerBJ && !dealerBJ) {
      payout = Math.floor(state.bet * 2.5);
      message = 'Blackjack!';
      resultType = 'BLACKJACK';
    } else if (playerBJ && dealerBJ) {
      payout = state.bet;
      message = 'Push';
      resultType = 'PUSH';
    } else if (playerBust) {
      payout = 0;
      message = 'Bust';
      resultType = 'BUST';
    } else if (dealerBust) {
      payout = state.bet * 2;
      message = 'Win';
      resultType = 'WIN';
    } else if (playerScore > dealerScore) {
      payout = state.bet * 2;
      message = 'Win';
      resultType = 'WIN';
    } else if (playerScore < dealerScore) {
      payout = 0;
      message = 'Dealer Wins';
      resultType = 'LOSE';
    } else {
      payout = state.bet;
      message = 'Push';
      resultType = 'PUSH';
    }

    // Play sound for outcome
    if (resultType === 'BLACKJACK')                       sounds.blackjack();
    else if (resultType === 'WIN')                        sounds.win();
    else if (resultType === 'BUST' || resultType === 'LOSE') sounds.bust();
    else if (resultType === 'PUSH')                       sounds.push();

    const oldBalance = state.balance;
    state.balance += payout;

    if (payout > state.bet) showWinGlow();

    showResult(message, resultType);
    animateBalance(oldBalance, state.balance);

    if (state.balance === 0 && payout === 0) {
      setTimeout(() => setPhase('GAME_OVER'), 1800);
      return;
    }

    setTimeout(() => {
      hideResult();
      setPhase('ROUND_END');
    }, 1600);
  }

  // ---------------------------------------------------------------------------
  // NEW ROUND / NEW GAME
  // ---------------------------------------------------------------------------

  function newRound() {
    emit('bj:newRound');
    state.bet        = 0;
    state.playerHand = [];
    state.dealerHand = [];
    state.firstAction = true;
    state.isSplit    = false;
    state.splitHand  = [];
    state.activeHand = 0;
    state.splitBet   = 0;
    state.aceSplit   = false;

    splitHideZone();
    delete document.getElementById('player-hand-wrapper').dataset.result;

    const playerContainer = document.getElementById('player-cards');
    const dealerContainer = document.getElementById('dealer-cards');
    playerContainer.innerHTML = '';
    dealerContainer.innerHTML = '';
    playerContainer.classList.remove('card-busted', 'win-glow');
    document.getElementById('player-score').textContent = '';
    document.getElementById('dealer-score').textContent = '—';
    hideResult();

    updateBetDisplay();
    setBalanceDisplay(state.balance);
    setPhase('BETTING');
  }

  function newGame() {
    emit('bj:newRound');
    state.shoe       = buildShoe();
    state.balance    = 1000;
    state.bet        = 0;
    state.playerHand = [];
    state.dealerHand = [];
    state.firstAction = true;
    state.isSplit    = false;
    state.splitHand  = [];
    state.activeHand = 0;
    state.splitBet   = 0;
    state.aceSplit   = false;

    splitHideZone();
    delete document.getElementById('player-hand-wrapper').dataset.result;

    document.getElementById('game-over-modal').style.display = 'none';
    const playerContainer = document.getElementById('player-cards');
    const dealerContainer = document.getElementById('dealer-cards');
    playerContainer.innerHTML = '';
    dealerContainer.innerHTML = '';
    playerContainer.classList.remove('card-busted', 'win-glow');
    document.getElementById('player-score').textContent = '';
    document.getElementById('dealer-score').textContent = '—';
    hideResult();

    updateBetDisplay();
    setBalanceDisplay(state.balance);
    setPhase('BETTING');
  }

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  function init() {
    state.shoe = buildShoe();
    setBalanceDisplay(state.balance);
    updateBetDisplay();
    setPhase('BETTING');

    // Chips
    document.querySelectorAll('.chip[data-value]').forEach(chip => {
      chip.addEventListener('click', () => placeBet(parseInt(chip.dataset.value, 10)));
    });

    // Betting controls
    document.getElementById('btn-clear').addEventListener('click', clearBet);
    document.getElementById('btn-deal').addEventListener('click', () => {
      if (state.phase === 'ROUND_END')                       newRound();
      else if (state.phase === 'BETTING' && state.bet > 0)  deal();
    });

    // Play controls
    document.getElementById('btn-hit').addEventListener('click', hit);
    document.getElementById('btn-stand').addEventListener('click', stand);
    document.getElementById('btn-double').addEventListener('click', doubleDown);
    document.getElementById('btn-split').addEventListener('click', split);

    // Header / modal
    document.getElementById('btn-new-game').addEventListener('click', newGame);
    document.getElementById('btn-restart').addEventListener('click', newGame);

    // Sound toggle
    const soundBtn = document.getElementById('btn-sound');
    soundBtn.addEventListener('click', () => {
      audioEnabled = !audioEnabled;
      soundBtn.textContent = audioEnabled ? '\u266B Sound' : '\u266B Muted';
      soundBtn.classList.toggle('sound-off', !audioEnabled);
      // Wake up the audio context on first user interaction
      if (audioEnabled) getCtx();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      if (e.repeat) return;
      switch (e.key) {
        case 'h': case 'H':
          if (state.phase === 'PLAYER_TURN') hit();
          break;
        case 's': case 'S':
          if (state.phase === 'PLAYER_TURN') stand();
          break;
        case 'd': case 'D':
          if (state.phase === 'PLAYER_TURN' && state.firstAction) doubleDown();
          break;
        case 'p': case 'P':
          if (state.phase === 'PLAYER_TURN') split();
          break;
        case '1': if (state.phase === 'BETTING') placeBet(5);   break;
        case '2': if (state.phase === 'BETTING') placeBet(25);  break;
        case '3': if (state.phase === 'BETTING') placeBet(100); break;
        case '4': if (state.phase === 'BETTING') placeBet(500); break;
        case 'Backspace':
          if (state.phase === 'BETTING') clearBet();
          break;
        case 'Enter': case ' ':
          e.preventDefault();
          if (state.phase === 'BETTING' && state.bet > 0) deal();
          else if (state.phase === 'ROUND_END')           newRound();
          break;
      }
    });
  }

  init();
});
