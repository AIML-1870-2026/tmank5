/* ============================================================
   views/reportCard.js — Safety Report Card
   ============================================================ */


async function renderReportCard(AppState) {
  const el = document.getElementById('view-report-card');
  if (!el) return;

  const meds = AppState.myMedications;

  if (meds.length === 0) {
    el.innerHTML = `
      <div class="view-header"><h1>Safety Report Card</h1></div>
      <div class="empty-state">
        <div class="empty-state__icon">📋</div>
        <h2 class="empty-state__title">No medications to report</h2>
        <p class="empty-state__body">Add medications to generate your Safety Report Card.</p>
        <button class="btn btn--primary" onclick="document.querySelector('[data-view=my-meds]').click()">Add Medications</button>
      </div>`;
    return;
  }

  el.innerHTML = `<div style="padding:8px 0;color:var(--text-muted);font-size:.85rem;">Generating report…</div>`;

  // Fetch recalls for all meds
  const recallResults = await Promise.allSettled(
    meds.map(m => getRecallStatus(m.brandName || m.genericName))
  );
  const recallMap = {};
  let totalRecalls = 0;
  meds.forEach((m, i) => {
    const r = recallResults[i];
    const recalls = (r.status === 'fulfilled' ? r.value : []);
    recallMap[m.id] = recalls;
    totalRecalls += recalls.length;
  });

  const interactions = AppState.interactions || [];
  const score   = calculateSafetyScore(interactions, totalRecalls);
  const verdict = scoreVerdict(score);
  const grade   = scoreGrade(score);
  const color   = scoreColor(score);
  const now     = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const notable = [...interactions].filter(i => i.severity > 0).sort((a, b) => b.severity - a.severity);

  el.innerHTML = `
    <!-- Print header (visible only in print) -->
    <div class="print-header">
      <div class="report-card-header" style="border-radius:0;">
        <div>
          <div class="report-card-header__title">DrugSafe — Safety Report Card</div>
          <div class="report-card-header__meta">Generated ${now} · ${meds.length} medications</div>
        </div>
      </div>
    </div>

    <!-- Screen header -->
    <div class="report-card-header no-print">
      <div>
        <div class="report-card-header__title">Safety Report Card</div>
        <div class="report-card-header__meta">Generated ${now} · ${meds.length} medication${meds.length !== 1 ? 's' : ''}</div>
      </div>
      <div class="report-card-actions no-print">
        <button class="btn btn--ghost" id="btn-copy-summary">📋 Copy Summary</button>
        <button class="btn btn--primary" id="btn-print">🖨️ Print / Save PDF</button>
      </div>
    </div>

    <!-- Safety Gauge -->
    <div class="gauge-section report-section">
      <div class="gauge-wrapper">
        ${renderGaugeSVG(score, grade, color)}
        <div class="gauge-verdict" style="color:${color}">${escapeHtml(verdict.text)}</div>
      </div>
    </div>

    <!-- Medication Summary Table -->
    <div class="report-section">
      <div class="report-section__title">💊 Medication Summary</div>
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Drug Name</th>
              <th>Generic</th>
              <th>Dosage Form</th>
              <th>Worst Interaction</th>
              <th>Active Recall?</th>
            </tr>
          </thead>
          <tbody>
            ${meds.map(m => {
              const worst   = worstSeverityFor(m.id, interactions);
              const recalls = recallMap[m.id] || [];
              return `<tr>
                <td><strong>${escapeHtml(m.brandName || m.genericName)}</strong></td>
                <td><code>${escapeHtml(m.genericName || '—')}</code></td>
                <td>${escapeHtml(m.dosageForm || '—')}</td>
                <td>${severityBadge(worst)}</td>
                <td>${recalls.length > 0
                  ? `<span class="badge badge--danger">${recalls.length} recall${recalls.length > 1 ? 's' : ''}</span>`
                  : `<span class="badge badge--safe">None</span>`}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Interaction Details -->
    <div class="report-section section-interactions">
      <div class="report-section__title">⚠️ Interaction Details</div>
      ${notable.length === 0
        ? `<div class="all-clear"><span class="all-clear__icon">✅</span><span>No significant interactions detected.</span></div>`
        : notable.map((ix, i) => `
            <div class="accordion__item">
              <button class="accordion__trigger" aria-expanded="false" aria-controls="ix-body-${i}" id="ix-trig-${i}">
                <span style="display:flex;align-items:center;gap:10px;">
                  ${escapeHtml(ix.drugA)} ↔ ${escapeHtml(ix.drugB)}
                  ${severityBadge(ix.severity)}
                </span>
                <span class="accordion__arrow">▼</span>
              </button>
              <div class="accordion__body" id="ix-body-${i}" role="region" aria-labelledby="ix-trig-${i}">
                <p>${escapeHtml(ix.summaryText?.slice(0, 800) || 'See FDA drug label for full interaction details.')}</p>
                ${ix.source ? `<p style="margin-top:8px;color:var(--text-muted);font-size:.78rem;">Source: ${escapeHtml(ix.source)} label</p>` : ''}
              </div>
            </div>`
        ).join('')}
    </div>

    <!-- Recall Summary -->
    ${totalRecalls > 0 ? `
    <div class="report-section">
      <div class="report-section__title">🚨 Active Recalls</div>
      ${meds.flatMap(m => (recallMap[m.id] || []).map(rc => `
        <div style="padding:10px 0;border-bottom:1px solid var(--border);">
          <strong>${escapeHtml(rc.brand_name || m.brandName)}</strong>
          ${rc.classification ? `<span style="margin-left:8px;font-size:.78rem;color:var(--danger)">${escapeHtml(rc.classification)}</span>` : ''}
          <br><span style="font-size:.82rem;color:var(--text-secondary)">${escapeHtml(rc.reason_for_recall || 'No reason provided')}</span>
        </div>`)).join('')}
    </div>` : ''}

    <!-- Disclaimer -->
    <div class="report-disclaimer">
      <strong>Disclaimer:</strong> DrugSafe uses publicly available data from the U.S. Food and Drug Administration (OpenFDA).
      This tool is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment.
      Always consult your pharmacist or physician before making changes to your medications.
    </div>`;

  attachReportEvents(meds, interactions, totalRecalls, score, verdict, now);
  animateGauge(score, color);
  attachAccordions();
}

function renderGaugeSVG(score, grade, color) {
  const r = 70;
  const cx = 90, cy = 90;
  const circumference = Math.PI * r; // half circle
  const offset = circumference * (1 - score / 100);

  return `
    <svg class="gauge-svg" width="180" height="110" viewBox="0 0 180 110" role="img" aria-label="Safety score ${score} out of 100">
      <!-- Background arc -->
      <path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}"
            fill="none" stroke="var(--border)" stroke-width="12" stroke-linecap="round"/>
      <!-- Score arc -->
      <path id="gauge-arc-path"
            d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}"
            fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${circumference}"
            style="transition: stroke-dashoffset 1.2s ease, stroke .6s ease;"/>
      <!-- Score text -->
      <text x="${cx}" y="${cy - 14}" class="gauge-score" id="gauge-score-text">${score}</text>
      <text x="${cx}" y="${cy + 8}"  class="gauge-grade" style="font-size:1rem;fill:${color};font-weight:700;">${grade}</text>
    </svg>`;
}

function animateGauge(score, color) {
  const path = document.getElementById('gauge-arc-path');
  if (!path) return;
  const r = 70;
  const circumference = Math.PI * r;
  const targetOffset = circumference * (1 - score / 100);
  requestAnimationFrame(() => {
    setTimeout(() => {
      path.style.strokeDashoffset = String(targetOffset);
      path.style.stroke = color;
    }, 50);
  });
}

function attachAccordions() {
  document.querySelectorAll('.accordion__trigger').forEach(btn => {
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      const body = document.getElementById(btn.getAttribute('aria-controls'));
      body?.classList.toggle('open', !expanded);
    });
  });
}

function attachReportEvents(meds, interactions, recallCount, score, verdict, date) {
  document.getElementById('btn-print')?.addEventListener('click', () => window.print());

  document.getElementById('btn-copy-summary')?.addEventListener('click', async () => {
    const notable = interactions.filter(i => i.severity > 0);
    const sevLabels = ['No Interaction','Monitor','Major','Contraindicated'];
    const lines = [
      `DrugSafe Safety Report Card`,
      `Generated: ${date}`,
      ``,
      `Overall Safety Score: ${score}/100 (${scoreGrade(score)})`,
      verdict.text,
      ``,
      `Medications (${meds.length}):`,
      ...meds.map(m => `  - ${m.brandName || m.genericName} (${m.genericName || ''})`),
      ``,
      notable.length > 0 ? `Interactions Found (${notable.length}):` : 'No significant interactions.',
      ...notable.map(ix => `  - ${ix.drugA} ↔ ${ix.drugB}: ${sevLabels[ix.severity]}`),
      ``,
      `Active Recalls: ${recallCount}`,
      ``,
      `Disclaimer: This report is for informational purposes only. Not a substitute for professional medical advice.`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      showToast('Summary copied to clipboard', 'success');
    } catch {
      showToast('Could not copy to clipboard', 'error');
    }
  });
}
