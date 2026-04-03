/* ============================================================
   views/adverseEvents.js — Adverse Event Explorer
   ============================================================ */


function renderAdverseEvents(AppState) {
  const el = document.getElementById('view-adverse-events');
  if (!el) return;

  const myMeds = AppState.myMedications;
  const opts   = myMeds.map(m =>
    `<option value="${escapeHtml(m.brandName || m.genericName)}">${escapeHtml(m.brandName || m.genericName)}</option>`
  ).join('');

  el.innerHTML = `
    <div class="view-header">
      <h1>Adverse Event Explorer</h1>
      <p>Real-world side effect frequency from the FDA Adverse Event Reporting System (FAERS).</p>
    </div>

    <div class="adverse-select-row">
      ${myMeds.length > 0 ? `
        <select id="ae-my-med-select" class="select" aria-label="Select from my medications">
          <option value="">— My Medications —</option>
          ${opts}
        </select>
        <span style="color:var(--text-muted);font-size:.9rem;align-self:center;">or</span>
      ` : ''}
      <div class="input-wrapper" style="flex:1;min-width:200px;">
        <input id="ae-drug-input" class="input" type="text" placeholder="Search any drug…" autocomplete="off" aria-label="Search drug for adverse events" />
        <div id="ae-autocomplete" class="autocomplete-dropdown" hidden role="listbox"></div>
      </div>
      <button class="btn btn--primary" id="ae-search-btn">Search Events</button>
    </div>
    <div id="ae-results"></div>`;

  attachAEEvents(AppState);
}

function attachAEEvents(AppState) {
  const input  = document.getElementById('ae-drug-input');
  const drop   = document.getElementById('ae-autocomplete');
  const btn    = document.getElementById('ae-search-btn');
  const selMed = document.getElementById('ae-my-med-select');
  let selected = null;

  // Autocomplete
  const doSearch = debounce(async (q) => {
    selected = null;
    if (!q || q.length < 2 || !drop) { if (drop) drop.hidden = true; return; }
    drop.innerHTML = '<div class="autocomplete-item" style="color:var(--text-muted)">Searching…</div>';
    drop.hidden = false;
    const results = await searchDrugsByName(q, 6);
    if (!results.length) { drop.innerHTML = '<div class="autocomplete-item" style="color:var(--text-muted)">No results</div>'; return; }
    drop.innerHTML = results.map((r, i) => `
      <div class="autocomplete-item" role="option" tabindex="0" data-idx="${i}" data-name="${escapeHtml(r.brand_name || r.generic_name || '')}">
        <div class="autocomplete-item__name">${escapeHtml(r.brand_name || r.generic_name)}</div>
        <div class="autocomplete-item__sub">${escapeHtml(r.generic_name || '')}</div>
      </div>`).join('');
    drop.querySelectorAll('.autocomplete-item[data-idx]').forEach(item => {
      const pick = () => { selected = item.dataset.name; input.value = item.dataset.name; drop.hidden = true; };
      item.addEventListener('click', pick);
      item.addEventListener('keydown', e => { if (e.key === 'Enter') pick(); });
    });
  }, 300);

  input?.addEventListener('input', e => doSearch(e.target.value.trim()));
  input?.addEventListener('blur', () => setTimeout(() => { if (drop) drop.hidden = true; }, 200));

  // Dropdown pick
  selMed?.addEventListener('change', () => {
    if (selMed.value && input) { input.value = selMed.value; selected = selMed.value; }
  });

  btn?.addEventListener('click', async () => {
    const drugName = selected || input?.value.trim() || selMed?.value;
    if (!drugName) { showToast('Enter a drug name to search', 'warning'); return; }
    await loadAEResults(drugName);
  });
}

async function loadAEResults(drugName) {
  const el = document.getElementById('ae-results');
  if (!el) return;

  el.innerHTML = `
    <div class="skeleton skeleton--title"></div>
    ${Array.from({length:6}, () => '<div class="skeleton skeleton--text"></div>').join('')}`;

  const reactions = await getAdverseEvents(drugName, 10);

  if (!reactions.length) {
    el.innerHTML = `
      <div class="empty-state" style="padding:40px 0;">
        <div class="empty-state__icon">⚠️</div>
        <p class="empty-state__body">No adverse event data found for <strong>${escapeHtml(drugName)}</strong> in FDA FAERS.</p>
      </div>`;
    return;
  }

  const max = reactions[0].count;

  el.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;box-shadow:var(--shadow);">
      <h2 style="font-family:var(--font-display);font-size:1.2rem;margin-bottom:20px;">
        Top Reported Reactions for <span style="color:var(--accent)">${escapeHtml(drugName)}</span>
      </h2>
      <div class="bar-chart">
        ${reactions.map(r => {
          const pct   = Math.round((r.count / max) * 100);
          const tier  = pct > 66 ? 'high' : pct > 33 ? 'medium' : 'low';
          return `
            <div class="bar-item">
              <span class="bar-label" title="${escapeHtml(r.term)}">${escapeHtml(r.term)}</span>
              <div class="bar-track">
                <div class="bar-fill bar-fill--${tier}" style="width:${pct}%">
                  <span class="bar-count">${r.count.toLocaleString()}</span>
                </div>
              </div>
            </div>`;
        }).join('')}
      </div>

      <div class="faers-disclaimer">
        ⚠️ <strong>Note:</strong> FAERS data reflects <em>reported</em> adverse events, not proven causation.
        Reports may be submitted by patients, healthcare professionals, or manufacturers, and are not
        verified for accuracy. High report counts indicate reporting frequency, not necessarily incidence rate.
      </div>
    </div>`;
}
