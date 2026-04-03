/* ============================================================
   views/recalls.js — Recall Alerts view
   ============================================================ */


function renderRecalls(AppState) {
  const el = document.getElementById('view-recalls');
  if (!el) return;

  el.innerHTML = `
    <div class="view-header">
      <h1>Recall Alerts</h1>
      <p>Check if any of your medications have active FDA enforcement actions or recalls.</p>
    </div>

    <div class="recalls-search-row">
      <div class="input-wrapper" style="flex:1;">
        <input id="recall-input" class="input" type="text" placeholder="Search any drug for recall status…" aria-label="Drug name for recall search" />
      </div>
      <button class="btn btn--primary" id="recall-search-btn">Search Recalls</button>
    </div>

    <div id="recalls-my-meds" style="margin-bottom:28px;">
      ${AppState.myMedications.length > 0 ? renderMyMedsHeader(AppState.myMedications.length) : ''}
    </div>
    <div id="recall-results"></div>`;

  // Auto-check all tracked meds on load
  if (AppState.myMedications.length > 0) {
    checkAllMyMeds(AppState.myMedications);
  }

  document.getElementById('recall-search-btn')?.addEventListener('click', async () => {
    const name = document.getElementById('recall-input')?.value.trim();
    if (!name) { showToast('Enter a drug name', 'warning'); return; }
    await checkAndDisplayDrug(name, 'recall-results');
  });

  document.getElementById('recall-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('recall-search-btn')?.click();
  });
}

function renderMyMedsHeader(count) {
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <h2 style="font-family:var(--font-display);font-size:1.2rem;">My Medications (${count})</h2>
      <span style="font-size:.78rem;color:var(--text-muted);">Auto-checking…</span>
    </div>
    <div id="my-meds-recall-results"></div>`;
}

async function checkAllMyMeds(meds) {
  const container = document.getElementById('my-meds-recall-results');
  if (!container) return;

  container.innerHTML = `<div class="skeleton skeleton--card"></div>`;

  const allResults = await Promise.allSettled(
    meds.map(async m => {
      const name    = m.brandName || m.genericName;
      const recalls = await getRecallStatus(name);
      return { name, recalls };
    })
  );

  let anyRecall = false;
  const html = allResults.map(r => {
    if (r.status !== 'fulfilled') return '';
    const { name, recalls } = r.value;
    if (recalls.length > 0) {
      anyRecall = true;
      return recalls.map(rc => recallCard(rc)).join('');
    }
    return `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);">
      <span style="color:var(--safe)">✅</span>
      <span style="font-size:.875rem;color:var(--text-secondary)"><strong>${escapeHtml(name)}</strong> — No active recalls found</span>
    </div>`;
  }).join('');

  container.innerHTML = anyRecall
    ? html
    : `<div class="all-clear"><span class="all-clear__icon">✅</span><span>All Clear — No active recalls found for any of your medications.</span></div>`;
}

async function checkAndDisplayDrug(name, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '<div class="skeleton skeleton--card"></div>';

  const recalls = await getRecallStatus(name);

  if (!recalls.length) {
    el.innerHTML = `<div class="all-clear"><span class="all-clear__icon">✅</span><span>No active recalls found for <strong>${escapeHtml(name)}</strong>.</span></div>`;
    return;
  }

  el.innerHTML = `
    <h3 style="margin-bottom:12px;font-size:1rem;">Recall results for <strong>${escapeHtml(name)}</strong>:</h3>
    ${recalls.map(rc => recallCard(rc)).join('')}
    <p style="font-size:.78rem;color:var(--text-muted);margin-top:12px;">
      <a href="https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts" target="_blank" rel="noopener" style="color:var(--accent);">View full FDA recall database ↗</a>
    </p>`;
}

function recallCard(rc) {
  const cls1 = (rc.classification || '').toLowerCase().includes('class i')   ? ''
    : (rc.classification || '').toLowerCase().includes('class ii')  ? 'recall-card--class-ii'
    : 'recall-card--class-iii';

  const classBadge = rc.classification
    ? `<span class="badge ${cls1 === '' ? 'badge--danger' : cls1 === 'recall-card--class-ii' ? 'badge--caution' : ''}" style="${cls1 === 'recall-card--class-iii' ? 'background:#eab308' : ''}">${escapeHtml(rc.classification)}</span>`
    : '';

  return `
    <div class="recall-card ${cls1}">
      <div class="recall-card__title">${escapeHtml(rc.brand_name || rc.product_description || 'Unknown drug')}</div>
      ${classBadge}
      <p class="recall-card__reason">${escapeHtml(rc.reason_for_recall || 'No reason provided')}</p>
      <div class="recall-card__meta">
        ${rc.recall_initiation_date ? `<span>📅 Initiated: ${escapeHtml(formatDate(rc.recall_initiation_date))}</span>` : ''}
        ${rc.recalling_firm         ? `<span>🏢 Firm: ${escapeHtml(rc.recalling_firm)}</span>` : ''}
        ${rc.distribution_pattern   ? `<span>🗺️ ${escapeHtml(rc.distribution_pattern.slice(0, 80))}</span>` : ''}
        ${rc.product_ndc            ? `<span>NDC: <code>${escapeHtml(rc.product_ndc)}</code></span>` : ''}
      </div>
    </div>`;
}
