/* ============================================================
   views/dashboard.js — Dashboard view
   ============================================================ */


let initialized = false;

async function renderDashboard(AppState) {
  const el = document.getElementById('view-dashboard');
  if (!el) return;

  const meds = AppState.myMedications;

  if (meds.length === 0) {
    el.innerHTML = renderEmptyState();
    el.querySelector('.cta-add-meds')?.addEventListener('click', () => {
      document.querySelector('[data-view="my-meds"]')?.click();
    });
    return;
  }

  el.innerHTML = renderShell();
  renderSkeletonMetrics();

  // Run analysis if we have 2+ meds
  let interactions = AppState.interactions || [];
  if (meds.length >= 2 && (!initialized || interactions.length === 0)) {
    interactions = await analyzeAllInteractions(meds, (done, total) => {
      updateProgressNote(`Checking interactions… ${done}/${total}`);
    });
    AppState.interactions = interactions;
    AppState.lastAnalyzedAt = new Date().toISOString();
    initialized = true;
  }

  // Fetch recall + adverse counts in parallel
  const recallCounts = await Promise.allSettled(
    meds.map(m => getRecallStatus(m.brandName || m.genericName))
  );
  const totalRecalls = recallCounts.reduce((sum, r) => {
    return sum + (r.status === 'fulfilled' ? r.value.length : 0);
  }, 0);

  const adverseCounts = await Promise.allSettled(
    meds.map(m => getAdverseEventCount(m.brandName || m.genericName))
  );
  const totalAdverse = adverseCounts.reduce((sum, r) => {
    return sum + (r.status === 'fulfilled' ? r.value : 0);
  }, 0);

  renderMetrics(meds.length, interactions, totalRecalls, totalAdverse);
  renderMatrix(meds, interactions);
  renderRecentAlerts(interactions);
  updateSidebarSummary(meds.length, interactions);
}

function renderEmptyState() {
  return `
    <div class="view-header">
      <h1>Dashboard</h1>
      <p>Your medication safety overview</p>
    </div>
    <div class="empty-state">
      <div class="empty-state__icon">💊</div>
      <h2 class="empty-state__title">No medications tracked yet</h2>
      <p class="empty-state__body">Add your medications to get started with drug interaction checking, adverse event reports, and recall alerts.</p>
      <button class="btn btn--primary cta-add-meds">Add your first medication</button>
      <div style="margin-top:40px;">
        <p style="font-size:.85rem;color:var(--text-muted);margin-bottom:12px;">Demo combination (not saved):</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
          ${['Warfarin','Aspirin','Atorvastatin','Fluconazole','Sertraline','Tramadol']
            .map(d => `<span class="pill">${escapeHtml(d)}</span>`).join('')}
        </div>
      </div>
    </div>`;
}

function renderShell() {
  return `
    <div class="view-header">
      <h1>Dashboard</h1>
      <p>Your medication safety overview</p>
    </div>
    <div id="dash-metrics" class="dashboard-metrics grid-4"></div>
    <div id="dash-progress" style="font-size:.8rem;color:var(--text-muted);margin-bottom:8px;min-height:18px;"></div>
    <div class="matrix-section">
      <div class="section-header">
        <h2 class="section-title">Interaction Matrix</h2>
      </div>
      <div id="dash-matrix" class="matrix-scroll"></div>
    </div>
    <div class="section-header" style="margin-top:24px;">
      <h2 class="section-title">Recent Alerts</h2>
    </div>
    <div id="dash-alerts" class="recent-alerts"></div>`;
}

function renderSkeletonMetrics() {
  const el = document.getElementById('dash-metrics');
  if (el) el.innerHTML = renderSkeletons(4, 'metric');
}

function updateProgressNote(text) {
  const el = document.getElementById('dash-progress');
  if (el) el.textContent = text;
}

function renderMetrics(medCount, interactions, recalls, adverse) {
  const el = document.getElementById('dash-metrics');
  if (!el) return;
  const worst = overallWorstSeverity(interactions);
  const sev = SEVERITY[worst];
  const colorClass = worst === 0 ? '' : worst === 1 ? 'metric-card--caution' : worst >= 2 ? 'metric-card--danger' : '';

  const cards = [
    { value: medCount, label: 'Medications Tracked', cls: '' },
    { value: interactions.filter(i => i.severity > 0).length, label: 'Interactions Found', cls: colorClass },
    { value: recalls, label: 'Active Recalls', cls: recalls > 0 ? 'metric-card--danger' : 'metric-card--safe' },
    { value: adverse, label: 'Adverse Event Reports', cls: '' },
  ];

  el.innerHTML = cards.map((c, i) => `
    <div class="metric-card ${c.cls}">
      <div class="metric-card__value" id="metric-val-${i}">0</div>
      <div class="metric-card__label">${escapeHtml(c.label)}</div>
    </div>`).join('');

  cards.forEach((c, i) => countUp(document.getElementById(`metric-val-${i}`), c.value));
  document.getElementById('dash-progress').textContent = '';
}

function renderMatrix(meds, interactions) {
  const el = document.getElementById('dash-matrix');
  if (!el) return;
  if (meds.length < 2) { el.innerHTML = '<p class="text-muted" style="padding:12px">Add 2+ medications to see the interaction matrix.</p>'; return; }

  const ixMap = {};
  for (const ix of interactions) {
    ixMap[`${ix.idA}|${ix.idB}`] = ix;
    ixMap[`${ix.idB}|${ix.idA}`] = ix;
  }

  const sevClass = ['safe','caution','danger','critical'];

  // Build HTML
  let html = '<table class="matrix-table" role="grid"><thead><tr><th></th>';
  for (const m of meds) {
    html += `<th class="matrix-label">${escapeHtml((m.brandName || m.genericName).slice(0,10))}</th>`;
  }
  html += '</tr></thead><tbody>';

  for (const a of meds) {
    html += `<tr><td class="matrix-label">${escapeHtml((a.brandName || a.genericName).slice(0,10))}</td>`;
    for (const b of meds) {
      if (a.id === b.id) {
        html += `<td class="matrix-cell matrix-cell--self" aria-label="Same drug"></td>`;
      } else {
        const ix = ixMap[`${a.id}|${b.id}`];
        const sev = ix ? ix.severity : 0;
        const cls = sevClass[sev];
        const tip = ix ? escapeHtml(ix.summaryText?.slice(0,120) || '') : 'No known interaction';
        html += `<td class="matrix-cell matrix-cell--${cls} tooltip-wrapper" role="gridcell" aria-label="${escapeHtml(a.brandName||a.genericName)} + ${escapeHtml(b.brandName||b.genericName)}: ${SEVERITY[sev].label}">
          <div class="tooltip">${tip}</div>
        </td>`;
      }
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  el.innerHTML = html;

  // Stagger row animation
  const rows = el.querySelectorAll('tr');
  rows.forEach((row, i) => {
    row.style.animationDelay = `${i * 50}ms`;
  });
}

function renderRecentAlerts(interactions) {
  const el = document.getElementById('dash-alerts');
  if (!el) return;
  const sorted = [...interactions].filter(i => i.severity > 0).sort((a, b) => b.severity - a.severity).slice(0, 3);
  if (sorted.length === 0) {
    el.innerHTML = `<div class="all-clear"><span class="all-clear__icon">✅</span><span>No interactions detected between your medications.</span></div>`;
    return;
  }
  const sevName = ['safe','caution','danger','critical'];
  el.innerHTML = sorted.map(ix => `
    <div class="alert-preview alert-preview--${sevName[ix.severity]}">
      <div class="alert-preview__pair">
        ${escapeHtml(ix.drugA)} ↔ ${escapeHtml(ix.drugB)}
        ${severityBadge(ix.severity)}
      </div>
      <p class="alert-preview__summary">${escapeHtml(ix.summaryText?.slice(0,200) || 'See FDA label for details.')}</p>
    </div>`).join('');
}

function updateSidebarSummary(count, interactions) {
  const countEl = document.getElementById('summary-count');
  const dotEl   = document.getElementById('summary-dot');
  const labelEl = document.getElementById('summary-label');
  if (countEl) countEl.textContent = count;
  const worst = overallWorstSeverity(interactions);
  const cls = ['safe','caution','danger','critical'][worst];
  const labels = ['No interactions detected','Monitor some drugs','Major interactions found','Contraindication present'];
  if (dotEl)   { dotEl.className = `status-dot status-dot--${cls}`; }
  if (labelEl) labelEl.textContent = labels[worst];
}
