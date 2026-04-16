'use strict';

// ---------------------------------------------------------------------------
// AgentUI — DOM management and event wiring for the AI Agent module
//
// Injects: header button, API key modal, side panel (auto-play, recommendation, context)
// Subscribes to game events: bj:phaseChanged, bj:playerAction, bj:newRound,
//   bj:cardDealt, bj:holeRevealed, bj:reshuffled
// ---------------------------------------------------------------------------

window.AgentUI = (() => {

  // -------------------------------------------------------------------------
  // 1. Inject HTML
  // -------------------------------------------------------------------------

  function injectDOM() {
    // --- Header button ---
    const headerActions = document.getElementById('header-actions');
    if (headerActions) {
      const btn = document.createElement('button');
      btn.id = 'btn-agent';
      btn.innerHTML = '&#x25C6; AI Agent';
      headerActions.insertBefore(btn, headerActions.firstChild);
    }

    // --- API key modal ---
    const modal = document.createElement('div');
    modal.id = 'agent-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'agent-modal-title');
    modal.innerHTML = `
      <div class="agent-modal-card">
        <p class="agent-modal-title" id="agent-modal-title">Connect AI Agent</p>
        <p class="agent-modal-sub">Enter your OpenAI API key to activate the AI advisor. The key is stored in session memory only and cleared when you close the tab.</p>

        <div class="agent-field">
          <label for="agent-api-key-input">OpenAI API Key</label>
          <input type="password" id="agent-api-key-input" placeholder="sk-..." autocomplete="off" spellcheck="false">
        </div>

        <div class="agent-field">
          <label for="agent-model-select">Model</label>
          <select id="agent-model-select">
            <option value="gpt-4o">gpt-4o (recommended)</option>
            <option value="gpt-4o-mini">gpt-4o-mini (faster)</option>
            <option value="gpt-3.5-turbo">gpt-3.5-turbo (budget)</option>
          </select>
        </div>

        <p class="agent-key-note">&#x26A0;&#xFE0F; Your key is never sent anywhere except OpenAI and is cleared from memory when you close this tab.</p>

        <div class="agent-modal-actions">
          <button id="agent-modal-cancel" class="agent-btn-secondary">Cancel</button>
          <button id="agent-modal-activate">Activate Agent</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // --- Side panel ---
    const panel = document.createElement('div');
    panel.id = 'agent-panel';
    panel.setAttribute('role', 'complementary');
    panel.setAttribute('aria-label', 'AI Agent Panel');
    panel.innerHTML = `
      <div class="drawer-header">
        <span class="drawer-title">AI AGENT</span>
        <button id="agent-close" aria-label="Close AI Agent panel">&#x2715;</button>
      </div>

      <div class="drawer-body agent-body">

        <!-- Auto-Play -->
        <div class="agent-section agent-autoplay-section">
          <div class="section-sublabel">Auto-Play</div>
          <div class="agent-bet-row">
            <span class="agent-bet-label">Bet per hand</span>
            <div class="agent-chip-pills">
              <button class="agent-bet-chip" data-chip="5">$5</button>
              <button class="agent-bet-chip" data-chip="25">$25</button>
              <button class="agent-bet-chip" data-chip="100">$100</button>
              <button class="agent-bet-chip" data-chip="500">$500</button>
            </div>
          </div>
          <button id="agent-autoplay-btn">&#x25B6; Let AI Take Over</button>
          <div id="agent-autoplay-running" class="agent-autoplay-running agent-hidden">
            <span class="agent-autoplay-dot"></span> AI is playing&hellip;
          </div>
        </div>

        <!-- Status -->
        <div id="agent-status-section" class="agent-section">
          <div id="agent-status-idle"     class="agent-status-msg">Waiting for your turn&hellip;</div>
          <div id="agent-status-thinking" class="agent-status-msg agent-hidden">
            <span class="agent-spinner" aria-hidden="true"></span> Consulting AI&hellip;
          </div>
          <div id="agent-status-error"    class="agent-status-msg agent-error agent-hidden"></div>
        </div>

        <!-- Recommendation -->
        <div id="agent-recommendation" class="agent-section agent-hidden">
          <div class="section-sublabel">Recommendation</div>
          <div id="agent-action-badge" class="advisor-badge" aria-live="polite"></div>
          <p id="agent-reasoning" class="advisor-reasoning"></p>
          <div id="agent-execute-row" class="agent-execute-row">
            <button id="agent-execute-btn">Let AI Play</button>
            <button id="agent-dismiss-btn" class="agent-btn-secondary">Dismiss</button>
          </div>
        </div>

        <!-- Context preview -->
        <details class="drawer-section" id="agent-context-details">
          <summary>Context Sent to LLM</summary>
          <div class="bust-content">
            <div id="agent-context-preview" class="agent-context-preview">
              <span class="agent-context-empty">Deal a hand to see context.</span>
            </div>
          </div>
        </details>

        <!-- Stats / footer -->
        <div class="agent-section agent-footer">
          <div class="stat-row">
            <span>Model</span>
            <span id="agent-model-display">gpt-4o</span>
          </div>
          <div class="stat-row">
            <span>Running count</span>
            <span id="agent-count-display">0</span>
          </div>
          <div class="stat-row">
            <span>True count</span>
            <span id="agent-true-count-display">0.0</span>
          </div>
          <button id="agent-disconnect-btn" class="agent-btn-secondary agent-disconnect">
            Disconnect &amp; Clear Key
          </button>
        </div>

      </div>
    `;
    document.body.appendChild(panel);
  }

  // -------------------------------------------------------------------------
  // 2. Render — sync all DOM to AgentStore state
  // -------------------------------------------------------------------------

  let pendingAction = null;

  function render() {
    const store = window.AgentStore;

    const panel = document.getElementById('agent-panel');
    const btn   = document.getElementById('btn-agent');
    if (!panel || !btn) return;

    // Panel / header button state
    panel.classList.toggle('open', store.panelOpen);
    btn.classList.toggle('agent-active', store.active);

    // Auto-play button and indicator
    const autoBtn = document.getElementById('agent-autoplay-btn');
    if (autoBtn) {
      if (store.autoPlay) {
        autoBtn.textContent = '\u25A0 Stop Auto-Play';
        autoBtn.classList.add('agent-autoplay-stop');
      } else {
        autoBtn.innerHTML = '&#x25B6; Let AI Take Over';
        autoBtn.classList.remove('agent-autoplay-stop');
      }
    }
    setHidden('agent-autoplay-running', !store.autoPlay);

    // Bet chip pills — highlight selected
    document.querySelectorAll('.agent-bet-chip').forEach(chip => {
      chip.classList.toggle(
        'agent-chip-selected',
        parseInt(chip.dataset.chip, 10) === store.autoBetChip
      );
    });

    // Status sections — show exactly one
    setHidden('agent-status-idle',     store.status !== 'idle');
    setHidden('agent-status-thinking', store.status !== 'thinking');
    setHidden('agent-status-error',    store.status !== 'error');

    if (store.status === 'error') {
      const el = document.getElementById('agent-status-error');
      if (el) el.textContent = store.errorMessage || 'An unknown error occurred.';
    }

    // Recommendation card
    const hasRec = store.status === 'ready' && store.recommendation !== null;
    setHidden('agent-recommendation', !hasRec);

    if (hasRec && store.recommendation) {
      const { action, reasoning } = store.recommendation;
      pendingAction = action;

      const badge = document.getElementById('agent-action-badge');
      if (badge) {
        badge.textContent = action;
        const moveCode = { HIT: 'H', STAND: 'S', DOUBLE: 'D', SPLIT: 'Sp' }[action] || '';
        badge.setAttribute('data-move', moveCode);
      }

      const reasonEl = document.getElementById('agent-reasoning');
      if (reasonEl) reasonEl.textContent = reasoning;

      // In auto-play mode, hide the manual execute/dismiss buttons
      const execRow = document.getElementById('agent-execute-row');
      if (execRow) execRow.classList.toggle('agent-hidden', store.autoPlay);
    }

    // Count displays
    setText('agent-count-display',      fmtCount(store.runningCount));
    setText('agent-true-count-display', fmtCount(store.trueCount, 1));
    setText('agent-model-display',      store.model);
  }

  // -------------------------------------------------------------------------
  // 3. Context preview
  // -------------------------------------------------------------------------

  function renderContextPreview(ctx) {
    const el = document.getElementById('agent-context-preview');
    if (!el || !ctx) return;

    const { visiblePlayerCards, playerScore, playerSoft, dealerUpCard,
            basicRec, trueCount, balance, bet, availableActions } = ctx;

    const SUIT = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
    const cardStr = c => `${c.value}${SUIT[c.suit] || ''}`;

    const playerStr = visiblePlayerCards.map(cardStr).join(', ') || '—';
    const handType  = playerSoft ? `Soft ${playerScore}` : `Hard ${playerScore}`;
    const dealerStr = dealerUpCard ? cardStr(dealerUpCard) : '—';

    el.innerHTML = [
      ctxRow('Player hand',    `${playerStr} (${handType})`),
      ctxRow('Dealer up',      dealerStr),
      ctxRow('Basic strategy', basicRec),
      ctxRow('True count',     fmtCount(trueCount, 1)),
      ctxRow('Balance / Bet',  `$${balance.toLocaleString()} / $${bet}`),
      ctxRow('Actions',        availableActions.join(', ')),
    ].join('');
  }

  function ctxRow(label, value) {
    return `<div class="ctx-row"><span>${label}</span><span>${value}</span></div>`;
  }

  // -------------------------------------------------------------------------
  // 4. Trigger AI call (PLAYER_TURN)
  // -------------------------------------------------------------------------

  async function triggerAI() {
    const store = window.AgentStore;
    if (!store.active || !store.apiKey) return;

    store.status = 'thinking';
    store.recommendation = null;
    store.errorMessage = '';
    pendingAction = null;
    render();

    // Auto-open panel so the user can watch
    if (!store.panelOpen) {
      store.panelOpen = true;
      render();
    }

    try {
      const { rec, ctx } = await window.AgentApi.getRecommendation();
      store.recommendation = rec;
      store.status = 'ready';
      renderContextPreview(ctx);
      render();

      // Auto-play: execute after a brief pause so the user sees what was decided
      if (store.autoPlay) {
        setTimeout(() => {
          if (window.AgentStore.autoPlay && window.AgentStore.recommendation) {
            executeAction(window.AgentStore.recommendation.action);
          }
        }, 1100);
      }
    } catch (err) {
      store.status = 'error';
      store.errorMessage = err.message || 'Unknown error.';

      // Stop auto-play on API errors to avoid silent failures
      if (store.autoPlay) {
        store.autoPlay = false;
      }
      render();
    }
  }

  // -------------------------------------------------------------------------
  // 5. Auto-play: place bet + deal (BETTING phase)
  // -------------------------------------------------------------------------

  function autoBet() {
    const store = window.AgentStore;
    if (!store.autoPlay) return;

    // Short delay — let the UI settle after round reset
    setTimeout(() => {
      if (!window.AgentStore.autoPlay) return;

      const chipBtn = document.querySelector(`.chip[data-value="${store.autoBetChip}"]`);
      if (chipBtn && !chipBtn.disabled) chipBtn.click();

      // Then click Deal after the chip animation
      setTimeout(() => {
        if (!window.AgentStore.autoPlay) return;
        const dealBtn = document.getElementById('btn-deal');
        if (dealBtn && !dealBtn.disabled) dealBtn.click();
      }, 450);
    }, 600);
  }

  // -------------------------------------------------------------------------
  // 6. Auto-play: click "Play Again" (ROUND_END phase)
  // -------------------------------------------------------------------------

  function autoPlayAgain() {
    setTimeout(() => {
      if (!window.AgentStore.autoPlay) return;
      const dealBtn = document.getElementById('btn-deal');
      if (dealBtn && !dealBtn.disabled) dealBtn.click();
    }, 1600);
  }

  // -------------------------------------------------------------------------
  // 7. Execute a play action
  // -------------------------------------------------------------------------

  function executeAction(action) {
    const buttonMap = { HIT: 'btn-hit', STAND: 'btn-stand', DOUBLE: 'btn-double', SPLIT: 'btn-split' };
    const btnId = buttonMap[action];
    if (!btnId) return;
    const btn = document.getElementById(btnId);
    if (btn && !btn.disabled) btn.click();
    // bj:playerAction event will clear the recommendation
  }

  // -------------------------------------------------------------------------
  // 8. Bind all event listeners
  // -------------------------------------------------------------------------

  function bindEvents() {
    // Header button
    on('btn-agent', 'click', () => {
      const store = window.AgentStore;
      if (!store.active) {
        openModal();
      } else {
        store.panelOpen = !store.panelOpen;
        render();
      }
    });

    // Modal: activate
    on('agent-modal-activate', 'click', () => {
      const key   = document.getElementById('agent-api-key-input')?.value.trim();
      const model = document.getElementById('agent-model-select')?.value || 'gpt-4o';
      if (!key) {
        document.getElementById('agent-api-key-input')?.focus();
        return;
      }
      window.AgentStore.saveSession(key, model);
      window.AgentStore.active = true;
      window.AgentStore.panelOpen = true;
      closeModal();
      render();
    });

    on('agent-modal-cancel', 'click', closeModal);

    on('agent-api-key-input', 'keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('agent-modal-activate')?.click();
    });

    document.getElementById('agent-modal')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('agent-modal')) closeModal();
    });

    // Panel: close
    on('agent-close', 'click', () => {
      window.AgentStore.panelOpen = false;
      render();
    });

    // Auto-play toggle
    on('agent-autoplay-btn', 'click', () => {
      const store = window.AgentStore;
      store.autoPlay = !store.autoPlay;
      render();

      // If toggled ON while already in BETTING phase, kick off auto-bet right away
      if (store.autoPlay && store.currentPhase === 'BETTING') {
        autoBet();
      }
      // If toggled ON while in PLAYER_TURN, trigger AI right away
      if (store.autoPlay && store.currentPhase === 'PLAYER_TURN' && store.apiKey) {
        triggerAI();
      }
    });

    // Bet chip pills
    document.querySelectorAll('.agent-bet-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        window.AgentStore.autoBetChip = parseInt(chip.dataset.chip, 10);
        render();
      });
    });

    // Manual execute / dismiss buttons (non-autoplay mode)
    on('agent-execute-btn', 'click', () => {
      if (pendingAction) executeAction(pendingAction);
    });

    on('agent-dismiss-btn', 'click', () => {
      window.AgentStore.recommendation = null;
      window.AgentStore.status = 'idle';
      pendingAction = null;
      render();
    });

    // Disconnect
    on('agent-disconnect-btn', 'click', () => {
      window.AgentStore.autoPlay = false;
      window.AgentStore.clearSession();
      window.AgentStore.panelOpen = false;
      window.AgentStore.resetRound();
      render();
    });

    // ---- Game events ----

    document.addEventListener('bj:phaseChanged', (e) => {
      const { phase, playerHand, dealerHand } = e.detail;
      const store = window.AgentStore;

      store.currentPhase = phase;
      store.currentPlayerHand = playerHand || [];
      store.currentDealerHand = dealerHand || [];

      if (phase === 'PLAYER_TURN') {
        if (store.active && store.apiKey) {
          triggerAI();
        }
      } else if (phase === 'BETTING') {
        store.resetRound();
        render();
        if (store.autoPlay) autoBet();

      } else if (phase === 'ROUND_END') {
        if (store.autoPlay) autoPlayAgain();

      } else if (phase === 'GAME_OVER') {
        // Game ended — always stop auto-play
        if (store.autoPlay) {
          store.autoPlay = false;
          render();
        }

      } else if (phase === 'DEALING') {
        store.resetRound();
        render();
      }
    });

    document.addEventListener('bj:playerAction', () => {
      const store = window.AgentStore;
      store.recommendation = null;
      store.status = 'idle';
      pendingAction = null;
      render();
    });

    document.addEventListener('bj:newRound', () => {
      window.AgentStore.resetRound();
      render();
    });

    // Player hit a non-bust card — phase stays PLAYER_TURN but no phaseChanged fires
    document.addEventListener('bj:playerHandUpdated', (e) => {
      const { playerHand, dealerHand } = e.detail;
      const store = window.AgentStore;
      store.currentPlayerHand = playerHand || [];
      store.currentDealerHand = dealerHand || [];

      if (store.active && store.apiKey) {
        triggerAI();
      }
    });

    document.addEventListener('bj:cardDealt', (e) => {
      const { card, faceUp } = e.detail;
      if (faceUp && card) {
        window.AgentStore.recordCard(card.value);
        render();
      }
    });

    document.addEventListener('bj:holeRevealed', (e) => {
      const { card } = e.detail;
      if (card) {
        window.AgentStore.recordCard(card.value);
        render();
      }
    });

    document.addEventListener('bj:reshuffled', () => {
      window.AgentStore.resetShoe();
      render();
    });
  }

  // -------------------------------------------------------------------------
  // 9. Modal helpers
  // -------------------------------------------------------------------------

  function openModal() {
    const modal = document.getElementById('agent-modal');
    if (!modal) return;
    modal.classList.add('visible');
    const input    = document.getElementById('agent-api-key-input');
    const modelSel = document.getElementById('agent-model-select');
    if (input && window.AgentStore.apiKey) input.value = window.AgentStore.apiKey;
    if (modelSel) modelSel.value = window.AgentStore.model || 'gpt-4o';
    input?.focus();
  }

  function closeModal() {
    document.getElementById('agent-modal')?.classList.remove('visible');
  }

  // -------------------------------------------------------------------------
  // 10. Tiny DOM utilities
  // -------------------------------------------------------------------------

  function on(id, event, handler) {
    document.getElementById(id)?.addEventListener(event, handler);
  }

  function setHidden(id, hidden) {
    document.getElementById(id)?.classList.toggle('agent-hidden', hidden);
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function fmtCount(n, decimals = 0) {
    const prefix = n >= 0 ? '+' : '';
    return prefix + (decimals > 0 ? n.toFixed(decimals) : String(n));
  }

  // -------------------------------------------------------------------------
  // 11. Init
  // -------------------------------------------------------------------------

  function init() {
    window.AgentStore.loadSession();
    injectDOM();
    bindEvents();
    if (window.AgentStore.apiKey) window.AgentStore.active = true;
    render();
  }

  document.addEventListener('DOMContentLoaded', init);

  return { render, triggerAI };
})();
