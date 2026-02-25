'use strict';

// ---------------------------------------------------------------------------
// CheatsUI — wires up all cheats-mode UI:
//   • Toggle button + training badge in the header
//   • Slide-in side drawer with three collapsible sections
//   • Card flash badges (+1/0/-1) on deal
//   • Deviation toast when player ignores the advisor
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  const store    = window.CheatsStore;
  const hilo     = window.HiLoCounter;
  const bust     = window.BustCalculator;
  const strategy = window.BasicStrategy;

  // -------------------------------------------------------------------------
  // 1. Inject toggle button into header
  // -------------------------------------------------------------------------
  const header = document.getElementById('header-actions');
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'btn-cheats';
  toggleBtn.innerHTML = 'Cheats &#128065;';
  toggleBtn.setAttribute('aria-pressed', 'false');
  toggleBtn.title = 'Toggle cheats / training mode';
  header.prepend(toggleBtn);

  // Training mode badge (fixed, shown only when cheats is on)
  const trainingBadge = document.createElement('div');
  trainingBadge.id = 'training-badge';
  trainingBadge.textContent = '\uD83C\uDF93 Training Mode';
  trainingBadge.setAttribute('aria-live', 'polite');
  document.body.appendChild(trainingBadge);

  // -------------------------------------------------------------------------
  // 2. Build the side drawer
  // -------------------------------------------------------------------------
  const backdrop = document.createElement('div');
  backdrop.id = 'cheats-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  document.body.appendChild(backdrop);

  const drawer = document.createElement('div');
  drawer.id = 'cheats-drawer';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-label', 'Cheats Mode');
  drawer.setAttribute('aria-modal', 'false');
  drawer.innerHTML = `
    <div class="drawer-header">
      <span class="drawer-title">&#128065; Cheats Mode</span>
      <button id="cheats-close" aria-label="Close cheats drawer">&times;</button>
    </div>
    <div class="drawer-body">

      <!-- Section 1: Bust Probability -->
      <details class="drawer-section" open>
        <summary>Bust Probability</summary>
        <div class="bust-content">
          <p class="section-sublabel">Bust if you Hit</p>
          <div class="bust-percent-value" id="bust-percent-display">&mdash;</div>
          <div class="bust-bar-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
            <div class="bust-bar-fill" id="bust-bar-fill"></div>
          </div>
          <p class="bust-note" id="bust-note"></p>
        </div>
      </details>

      <!-- Section 2: Hi-Lo Card Counter -->
      <details class="drawer-section" open>
        <summary>Hi&#8209;Lo Card Counter</summary>
        <div class="hilo-content">
          <div class="count-row">
            <span class="count-label">Running Count</span>
            <span class="count-value" id="running-count-val">0</span>
          </div>
          <div class="count-row">
            <span class="count-label">
              True Count
              <button class="tooltip-trigger" id="true-count-tip" aria-describedby="true-count-tooltip" aria-label="What is true count?">?</button>
              <span class="tooltip-popup" id="true-count-tooltip" role="tooltip">
                True count adjusts for remaining decks. Higher = more favorable.
              </span>
            </span>
            <span class="count-value" id="true-count-val">0</span>
          </div>
          <p class="count-hint" id="count-hint-text"></p>
          <p class="reshuffle-notice hidden" id="reshuffle-notice">&#x1F500; Deck reshuffled</p>
        </div>
      </details>

      <!-- Section 3: Optimal Move Advisor -->
      <details class="drawer-section" open>
        <summary>Optimal Move Advisor</summary>
        <div class="advisor-content">
          <div class="advisor-badge" id="advisor-badge">Waiting for hand&hellip;</div>
          <p class="advisor-reasoning" id="advisor-reasoning"></p>
        </div>
      </details>

      <!-- Section 4: Session Stats -->
      <details class="drawer-section">
        <summary>Session Stats</summary>
        <div class="stats-content">
          <div class="stat-row">
            <span>Hands played</span>
            <span id="stat-hands">0</span>
          </div>
          <div class="stat-row">
            <span>Strategy accuracy</span>
            <span id="stat-accuracy">&mdash;</span>
          </div>
        </div>
      </details>

    </div>`;
  document.body.appendChild(drawer);

  // Deviation toast
  const toast = document.createElement('div');
  toast.id = 'deviation-toast';
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  document.body.appendChild(toast);

  // -------------------------------------------------------------------------
  // 3. Drawer open / close
  // -------------------------------------------------------------------------
  let toastTimer = null;
  let reshuffleTimer = null;

  function openDrawer() {
    store.drawerOpen = true;
    drawer.classList.add('open');
    backdrop.classList.add('visible');
    document.getElementById('cheats-close').focus();
    drawer.addEventListener('keydown', handleDrawerKeydown);
  }

  function closeDrawer() {
    store.drawerOpen = false;
    drawer.classList.remove('open');
    backdrop.classList.remove('visible');
    drawer.removeEventListener('keydown', handleDrawerKeydown);
    toggleBtn.focus();
  }

  function handleDrawerKeydown(e) {
    if (e.key === 'Escape') { e.preventDefault(); closeDrawer(); }
  }

  function setEnabled(on) {
    if (on) {
      store.enable();
      toggleBtn.classList.add('cheats-on');
      toggleBtn.setAttribute('aria-pressed', 'true');
      trainingBadge.classList.add('visible');
      openDrawer();
      refreshAll();
    } else {
      store.disable();
      toggleBtn.classList.remove('cheats-on');
      toggleBtn.setAttribute('aria-pressed', 'false');
      trainingBadge.classList.remove('visible');
      closeDrawer();
    }
  }

  toggleBtn.addEventListener('click', () => {
    if (!store.isEnabled) {
      setEnabled(true);
    } else {
      // Cheats stay active; just toggle the drawer open/closed
      if (store.drawerOpen) {
        closeDrawer();
      } else {
        openDrawer();
      }
    }
  });

  document.getElementById('cheats-close').addEventListener('click', closeDrawer);

  // Mobile only: tap backdrop to close
  backdrop.addEventListener('click', closeDrawer);

  // Tooltip toggle
  document.getElementById('true-count-tip').addEventListener('click', (e) => {
    e.stopPropagation();
    const tt = document.getElementById('true-count-tooltip');
    tt.classList.toggle('visible');
  });
  document.addEventListener('click', () => {
    document.getElementById('true-count-tooltip').classList.remove('visible');
  });

  // -------------------------------------------------------------------------
  // 4. Rendering helpers
  // -------------------------------------------------------------------------

  function renderBustMeter(playerHand) {
    const pctEl  = document.getElementById('bust-percent-display');
    const barEl  = document.getElementById('bust-bar-fill');
    const noteEl = document.getElementById('bust-note');
    const barTrack = barEl.parentElement;

    if (!playerHand || playerHand.length === 0) {
      pctEl.textContent = '\u2014';
      barEl.style.width = '0%';
      barEl.className = 'bust-bar-fill';
      noteEl.textContent = '';
      barTrack.setAttribute('aria-valuenow', 0);
      return;
    }

    const { percent, cannotBust, alreadyBusted } = bust.calcBustPercent(
      playerHand, store.seenCounts, store.SHOE_COUNTS, store.SHOE_TOTAL
    );

    barTrack.setAttribute('aria-valuenow', percent);

    if (alreadyBusted) {
      pctEl.textContent = 'Bust';
      barEl.style.width = '100%';
      barEl.className = 'bust-bar-fill bust-red';
      noteEl.textContent = '';
      return;
    }

    if (cannotBust) {
      pctEl.textContent = '0%';
      barEl.style.width = '0%';
      barEl.className = 'bust-bar-fill bust-green';
      noteEl.textContent = 'You can\'t bust.';
      return;
    }

    pctEl.textContent = percent + '%';
    barEl.style.width = percent + '%';
    noteEl.textContent = '';

    // Color-code bar
    barEl.className = 'bust-bar-fill ' + bustBarColor(percent);
  }

  function bustBarColor(pct) {
    if (pct <= 30) return 'bust-green';
    if (pct <= 55) return 'bust-yellow';
    if (pct <= 75) return 'bust-orange';
    return 'bust-red';
  }

  function renderCountDisplay() {
    const rc      = store.runningCount;
    const tc      = hilo.getTrueCount(rc, store.decksRemaining);
    const hint    = hilo.getInterpretation(tc);

    const rcEl    = document.getElementById('running-count-val');
    const tcEl    = document.getElementById('true-count-val');
    const hintEl  = document.getElementById('count-hint-text');

    const sign = rc > 0 ? 'positive' : rc < 0 ? 'negative' : 'neutral';
    rcEl.textContent = (rc > 0 ? '+' : '') + rc;
    rcEl.dataset.sign = sign;

    const tcSign = tc > 0 ? 'positive' : tc < 0 ? 'negative' : 'neutral';
    tcEl.textContent = (tc > 0 ? '+' : '') + tc;
    tcEl.dataset.sign = tcSign;

    hintEl.textContent = hint;
  }

  function renderAdvisor(playerHand, dealerHand) {
    const badgeEl    = document.getElementById('advisor-badge');
    const reasonEl   = document.getElementById('advisor-reasoning');

    if (!playerHand || playerHand.length === 0) {
      badgeEl.textContent = 'Waiting for hand\u2026';
      badgeEl.dataset.move = '';
      reasonEl.textContent = '';
      store.recommendedMove = null;
      return;
    }

    const dealerUpcard = dealerHand ? dealerHand.find(c => c.faceUp) : null;
    if (!dealerUpcard) {
      badgeEl.textContent = 'Waiting for hand\u2026';
      badgeEl.dataset.move = '';
      reasonEl.textContent = '';
      store.recommendedMove = null;
      return;
    }

    const move = strategy.getRecommendedMove(playerHand, dealerUpcard);
    store.recommendedMove = move;

    if (!move) {
      badgeEl.textContent = '\u2014';
      badgeEl.dataset.move = '';
      reasonEl.textContent = '';
      return;
    }

    const labels = { H: 'HIT', S: 'STAND', D: 'DOUBLE', Sp: 'SPLIT' };
    badgeEl.textContent = labels[move] || move;
    badgeEl.dataset.move = move;

    const reasoning = strategy.getReasoning(move, playerHand, dealerUpcard);
    store.recommendedReasoning = reasoning;
    reasonEl.textContent = reasoning;
  }

  function renderStats() {
    document.getElementById('stat-hands').textContent = store.handsPlayed;
    const total = store.followedAdvice + store.deviatedAdvice;
    if (total === 0) {
      document.getElementById('stat-accuracy').textContent = '\u2014';
    } else {
      const pct = Math.round((store.followedAdvice / total) * 100);
      document.getElementById('stat-accuracy').textContent = pct + '%';
    }
  }

  function refreshAll(playerHand, dealerHand) {
    if (!store.isEnabled) return;
    renderCountDisplay();
    renderAdvisor(playerHand || [], dealerHand || []);
    renderBustMeter(playerHand || []);
    renderStats();
  }

  // -------------------------------------------------------------------------
  // 5. Card flash badge (+1 / 0 / -1) near the dealt card element
  // -------------------------------------------------------------------------
  function showCardFlash(cardEl, hiloVal) {
    if (!store.isEnabled) return;
    const badge = document.createElement('span');
    badge.className = 'card-flash-badge';
    badge.textContent = hiloVal > 0 ? '+1' : hiloVal < 0 ? '-1' : '0';
    badge.dataset.sign = hiloVal > 0 ? 'positive' : hiloVal < 0 ? 'negative' : 'neutral';
    cardEl.appendChild(badge);

    // Trigger animation after paint
    requestAnimationFrame(() => {
      requestAnimationFrame(() => badge.classList.add('flash-animate'));
    });

    setTimeout(() => badge.remove(), 1100);
  }

  // -------------------------------------------------------------------------
  // 6. Deviation toast
  // -------------------------------------------------------------------------
  const MOVE_LABELS = { H: 'Hit', S: 'Stand', D: 'Double', Sp: 'Split' };

  function showDeviationToast(recommendedMove) {
    if (!store.isEnabled) return;
    const label = MOVE_LABELS[recommendedMove] || recommendedMove;
    toast.textContent = `Basic strategy: ${label}`;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 2000);
  }

  // -------------------------------------------------------------------------
  // 7. Reshuffle notification inside drawer
  // -------------------------------------------------------------------------
  function showReshuffleNotice() {
    if (!store.isEnabled) return;
    const el = document.getElementById('reshuffle-notice');
    el.classList.remove('hidden');
    clearTimeout(reshuffleTimer);
    reshuffleTimer = setTimeout(() => el.classList.add('hidden'), 3000);
  }

  // -------------------------------------------------------------------------
  // 8. Dim overlay when it's not the player's turn
  // -------------------------------------------------------------------------
  function setDrawerPhase(phase) {
    const bustSection     = document.querySelector('.bust-content');
    const advisorSection  = document.querySelector('.advisor-content');
    const playerActive    = phase === 'PLAYER_TURN';

    bustSection.classList.toggle('section-dimmed', !playerActive);
    advisorSection.classList.toggle('section-dimmed', !playerActive);

    if (!playerActive) {
      document.getElementById('bust-percent-display').textContent = '\u2014';
      document.getElementById('bust-bar-fill').style.width = '0%';
      document.getElementById('bust-bar-fill').className = 'bust-bar-fill';
      document.getElementById('bust-note').textContent = '';

      if (phase === 'BETTING' || phase === 'ROUND_END') {
        document.getElementById('advisor-badge').textContent = 'Waiting for hand\u2026';
        document.getElementById('advisor-badge').dataset.move = '';
        document.getElementById('advisor-reasoning').textContent = '';
      }
    }
  }

  // -------------------------------------------------------------------------
  // 9. Game event listeners
  // -------------------------------------------------------------------------

  // A card was dealt (face-up or face-down)
  document.addEventListener('bj:cardDealt', (e) => {
    const { card, faceUp, el } = e.detail;
    if (!faceUp) return; // hole card counted later on reveal

    store.recordCard(card.value);
    store.runningCount += hilo.getHiLoValue(card.value);

    if (store.isEnabled) {
      showCardFlash(el, hilo.getHiLoValue(card.value));
      renderCountDisplay();
    }
  });

  // Dealer hole card flipped
  document.addEventListener('bj:holeRevealed', (e) => {
    const { card } = e.detail;
    store.recordCard(card.value);
    store.runningCount += hilo.getHiLoValue(card.value);

    if (store.isEnabled) {
      // Find the second card element in the dealer row and flash it
      const dealerRow = document.getElementById('dealer-cards');
      const cards = dealerRow ? dealerRow.querySelectorAll('.card') : [];
      if (cards[1]) showCardFlash(cards[1], hilo.getHiLoValue(card.value));
      renderCountDisplay();
    }
  });

  // Player hit a card that didn't bust — hand changed but phase stays PLAYER_TURN
  document.addEventListener('bj:playerHandUpdated', (e) => {
    if (!store.isEnabled) return;
    const { playerHand, dealerHand } = e.detail;
    renderBustMeter(playerHand);
    renderAdvisor(playerHand, dealerHand);
  });

  // Phase changed — refresh all panels
  document.addEventListener('bj:phaseChanged', (e) => {
    const { phase, playerHand, dealerHand } = e.detail;

    setDrawerPhase(phase);

    if (phase === 'PLAYER_TURN') {
      if (store.isEnabled) {
        renderBustMeter(playerHand);
        renderAdvisor(playerHand, dealerHand);
        renderCountDisplay();
      }
    }
  });

  // Player took an action — check for deviation
  document.addEventListener('bj:playerAction', (e) => {
    const { action } = e.detail; // 'HIT','STAND','DOUBLE','SPLIT'
    if (!store.isEnabled) return;

    const rec = store.recommendedMove;
    if (!rec) return;

    // Map player action to strategy code
    const actionToCode = { HIT: 'H', STAND: 'S', DOUBLE: 'D', SPLIT: 'Sp' };
    const playerCode = actionToCode[action];

    if (playerCode && playerCode !== rec) {
      showDeviationToast(rec);
      store.deviatedAdvice++;
    } else {
      store.followedAdvice++;
    }
    renderStats();
  });

  // Deck reshuffled
  document.addEventListener('bj:reshuffled', () => {
    store.resetShoe();
    showReshuffleNotice();
    if (store.isEnabled) renderCountDisplay();
  });

  // New round started
  document.addEventListener('bj:newRound', () => {
    store.resetRound();
    store.handsPlayed++;

    if (store.isEnabled) {
      renderBustMeter([]);
      renderAdvisor([], []);
      renderCountDisplay();
      renderStats();
    }
  });
});
