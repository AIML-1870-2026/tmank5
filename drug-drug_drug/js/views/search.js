/* ============================================================
   views/search.js — Drug-Drug Search view (3 tab modes)
   ============================================================ */


function renderSearch(AppState, onUpdate) {
  const el = document.getElementById('view-search');
  if (!el) return;

  el.innerHTML = `
    <div class="view-header">
      <h1>Drug Search</h1>
      <p>Check interactions between any two drugs, by drug class, or against your medication list.</p>
    </div>
    <div class="tabs" role="tablist">
      <button class="tab active" role="tab" aria-selected="true"  data-tab="by-name"    aria-controls="tab-by-name">By Name</button>
      <button class="tab"        role="tab" aria-selected="false" data-tab="by-class"   aria-controls="tab-by-class">By Drug Class</button>
      <button class="tab"        role="tab" aria-selected="false" data-tab="vs-my-meds" aria-controls="tab-vs-my-meds">My Meds vs. New Drug</button>
    </div>

    <div id="tab-by-name" class="tab-panel active" role="tabpanel">
      ${renderByNamePanel()}
    </div>
    <div id="tab-by-class" class="tab-panel" role="tabpanel">
      ${renderByClassPanel()}
    </div>
    <div id="tab-vs-my-meds" class="tab-panel" role="tabpanel">
      ${renderVsMyMedsPanel(AppState)}
    </div>
    <div id="search-result" style="margin-top:20px;"></div>`;

  attachTabEvents();
  attachByNameEvents(AppState, onUpdate);
  attachByClassEvents();
  attachVsMyMedsEvents(AppState, onUpdate);
}

// ── By Name ───────────────────────────────────────────────────────────────
function renderByNamePanel() {
  return `
    <div style="margin-bottom:16px;">
      <div class="search-pair">
        <div>
          <label style="font-weight:600;font-size:.85rem;display:block;margin-bottom:6px;">Drug A</label>
          <div class="input-wrapper">
            <input id="search-drug-a" class="input" type="text" placeholder="e.g. Warfarin" autocomplete="off" aria-label="Drug A" />
            <div id="ac-a" class="autocomplete-dropdown" hidden role="listbox"></div>
          </div>
        </div>
        <div class="search-pair__vs">↔</div>
        <div>
          <label style="font-weight:600;font-size:.85rem;display:block;margin-bottom:6px;">Drug B</label>
          <div class="input-wrapper">
            <input id="search-drug-b" class="input" type="text" placeholder="e.g. Aspirin" autocomplete="off" aria-label="Drug B" />
            <div id="ac-b" class="autocomplete-dropdown" hidden role="listbox"></div>
          </div>
        </div>
      </div>
      <button class="btn btn--primary" id="btn-check-pair">Check Interaction</button>
    </div>`;
}

// ── By Class ──────────────────────────────────────────────────────────────
function renderByClassPanel() {
  const opts = DRUG_CLASSES.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  return `
    <div class="search-class-row">
      <select id="class-select" class="select" aria-label="Select drug class">
        <option value="">— Select a drug class —</option>
        ${opts}
      </select>
      <button class="btn btn--primary" id="btn-check-class">Check Class Interactions</button>
    </div>
    <div id="class-results"></div>`;
}

// ── vs My Meds ────────────────────────────────────────────────────────────
function renderVsMyMedsPanel(AppState) {
  if (AppState.myMedications.length === 0) {
    return `<div class="empty-state" style="padding:40px 24px;">
      <div class="empty-state__icon">💊</div>
      <p class="empty-state__body">Add medications to "My Medications" first, then use this tab to check a new drug against them.</p>
    </div>`;
  }
  return `
    <p style="font-size:.875rem;color:var(--text-secondary);margin-bottom:12px;">
      Check a candidate drug against your ${AppState.myMedications.length} tracked medication(s).
    </p>
    <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:16px;">
      <div class="input-wrapper" style="flex:1;">
        <input id="search-new-drug" class="input" type="text" placeholder="New drug to check (e.g. Fluconazole)" autocomplete="off" aria-label="New drug to check" />
        <div id="ac-new" class="autocomplete-dropdown" hidden role="listbox"></div>
      </div>
      <button class="btn btn--primary" id="btn-check-vs-meds">Check</button>
    </div>
    <div id="vs-results"></div>`;
}

// ── Tab switching ─────────────────────────────────────────────────────────
function attachTabEvents() {
  document.querySelectorAll('#view-search .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#view-search .tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('#view-search .tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      document.getElementById(tab.dataset.tab)?.classList.add('active');
      document.getElementById('search-result').innerHTML = '';
    });
  });
}

// ── By Name logic ─────────────────────────────────────────────────────────
function attachByNameEvents(AppState, onUpdate) {
  const selected = { a: null, b: null };

  function attachAC(inputId, dropId, key) {
    const input = document.getElementById(inputId);
    const drop  = document.getElementById(dropId);
    if (!input || !drop) return;

    const doSearch = debounce(async (q) => {
      selected[key] = null;
      if (!q || q.length < 2) { drop.hidden = true; return; }
      drop.innerHTML = '<div class="autocomplete-item" style="color:var(--text-muted)">Searching…</div>';
      drop.hidden = false;
      const results = await searchDrugsByName(q, 6);
      if (!results.length) { drop.innerHTML = '<div class="autocomplete-item" style="color:var(--text-muted)">No results</div>'; return; }
      drop.innerHTML = results.map((r, i) => `
        <div class="autocomplete-item" role="option" tabindex="0" data-idx="${i}"
             data-name="${escapeHtml(r.brand_name || r.generic_name || '')}"
             data-generic="${escapeHtml(r.generic_name || '')}">
          <div class="autocomplete-item__name">${escapeHtml(r.brand_name || r.generic_name)}</div>
          <div class="autocomplete-item__sub">${escapeHtml(r.generic_name || '')} · ${escapeHtml(r.dosage_form || '')}</div>
        </div>`).join('');

      drop.querySelectorAll('.autocomplete-item[data-idx]').forEach(item => {
        const pick = () => {
          selected[key] = item.dataset.name;
          input.value = item.dataset.name;
          drop.hidden = true;
        };
        item.addEventListener('click', pick);
        item.addEventListener('keydown', e => { if (e.key === 'Enter') pick(); });
      });
    }, 300);

    input.addEventListener('input', e => doSearch(e.target.value.trim()));
    input.addEventListener('blur', () => setTimeout(() => { drop.hidden = true; }, 200));
  }

  attachAC('search-drug-a', 'ac-a', 'a');
  attachAC('search-drug-b', 'ac-b', 'b');

  document.getElementById('btn-check-pair')?.addEventListener('click', async () => {
    const nameA = selected.a || document.getElementById('search-drug-a')?.value.trim();
    const nameB = selected.b || document.getElementById('search-drug-b')?.value.trim();
    if (!nameA || !nameB) { showToast('Please enter both drug names', 'warning'); return; }
    await checkAndDisplayPair(nameA, nameB, AppState, onUpdate);
  });
}

async function checkAndDisplayPair(nameA, nameB, AppState, onUpdate) {
  const result = document.getElementById('search-result');
  result.innerHTML = '<div class="skeleton skeleton--card"></div>';

  const [labelA, labelB] = await Promise.allSettled([getDrugLabel(nameA), getDrugLabel(nameB)]);
  const rA = labelA.status === 'fulfilled' ? labelA.value : null;
  const rB = labelB.status === 'fulfilled' ? labelB.value : null;

  let severity = 0;
  let text     = 'No interaction data found in FDA drug labels.';
  let source   = null;

  const checkLabel = (label, target, sourceName) => {
    if (!label?.drug_interactions) return;
    const raw = Array.isArray(label.drug_interactions) ? label.drug_interactions.join(' ') : label.drug_interactions;
    if (raw.toLowerCase().includes(target.toLowerCase())) {
      const sev = classifyInteraction(raw);
      if (sev > severity) { severity = sev; text = raw; source = sourceName; }
    }
  };

  checkLabel(rA, nameB, nameA);
  checkLabel(rB, nameA, nameB);

  const isInList = AppState.myMedications.some(m =>
    m.brandName?.toLowerCase() === nameA.toLowerCase() ||
    m.genericName?.toLowerCase() === nameA.toLowerCase()
  );

  result.innerHTML = `
    <div class="interaction-result">
      <div class="interaction-result__header">
        <span class="interaction-result__drugs">${escapeHtml(nameA)} ↔ ${escapeHtml(nameB)}</span>
        ${severityBadge(severity)}
      </div>
      <p class="interaction-result__body">${escapeHtml(truncate(text, 500))}</p>
      ${source ? `<p class="interaction-result__source">Source: ${escapeHtml(nameA)} label</p>` : ''}
      ${!isInList ? `<button class="btn btn--success btn--sm" id="btn-add-drug-a" style="margin-top:12px;" data-name="${escapeHtml(nameA)}">+ Add ${escapeHtml(nameA)} to My List</button>` : ''}
    </div>`;

  document.getElementById('btn-add-drug-a')?.addEventListener('click', async (e) => {
    const name = e.target.dataset.name;
    const med  = { brandName: name, genericName: '', dosageForm: '' };
    const upd  = addMedication(AppState.myMedications, med);
    if (upd) { AppState.myMedications = upd; showToast(`${name} added to My Medications`, 'success'); onUpdate?.(); e.target.remove(); }
    else showToast('Already in your list', 'info');
  });
}

// ── By Class logic ────────────────────────────────────────────────────────
function attachByClassEvents() {
  document.getElementById('btn-check-class')?.addEventListener('click', () => {
    const cls  = document.getElementById('class-select')?.value;
    const el   = document.getElementById('class-results');
    if (!cls || !el) return;
    const ixs = getClassInteractions(cls);
    if (!ixs.length) { el.innerHTML = `<p class="text-muted" style="margin-top:12px">No known class-level interactions found for ${escapeHtml(cls)}.</p>`; return; }
    el.innerHTML = ixs.map(ix => `
      <div class="interaction-result" style="margin-bottom:12px;">
        <div class="interaction-result__header">
          <span class="interaction-result__drugs">${escapeHtml(ix.classA)} ↔ ${escapeHtml(ix.classB)}</span>
          ${severityBadge(ix.severity)}
        </div>
        <p class="interaction-result__body">${escapeHtml(ix.note)}</p>
      </div>`).join('');
  });
}

// ── vs My Meds logic ──────────────────────────────────────────────────────
function attachVsMyMedsEvents(AppState, onUpdate) {
  const input = document.getElementById('search-new-drug');
  const drop  = document.getElementById('ac-new');
  const btn   = document.getElementById('btn-check-vs-meds');
  if (!input || !btn) return;

  let selectedNew = null;

  const doSearch = debounce(async (q) => {
    selectedNew = null;
    if (!q || q.length < 2 || !drop) { if(drop) drop.hidden = true; return; }
    drop.innerHTML = '<div class="autocomplete-item" style="color:var(--text-muted)">Searching…</div>';
    drop.hidden = false;
    const results = await searchDrugsByName(q, 6);
    if (!results.length) { drop.innerHTML = '<div class="autocomplete-item" style="color:var(--text-muted)">No results</div>'; return; }
    drop.innerHTML = results.map((r, i) => `
      <div class="autocomplete-item" role="option" tabindex="0" data-idx="${i}" data-name="${escapeHtml(r.brand_name || r.generic_name || '')}">
        <div class="autocomplete-item__name">${escapeHtml(r.brand_name || r.generic_name)}</div>
        <div class="autocomplete-item__sub">${escapeHtml(r.generic_name || '')} · ${escapeHtml(r.dosage_form || '')}</div>
      </div>`).join('');
    drop.querySelectorAll('.autocomplete-item[data-idx]').forEach(item => {
      const pick = () => { selectedNew = item.dataset.name; input.value = item.dataset.name; drop.hidden = true; };
      item.addEventListener('click', pick);
    });
  }, 300);

  input.addEventListener('input', e => doSearch(e.target.value.trim()));
  input.addEventListener('blur', () => setTimeout(() => { if(drop) drop.hidden = true; }, 200));

  btn.addEventListener('click', async () => {
    const newDrug = selectedNew || input.value.trim();
    if (!newDrug) { showToast('Enter a drug name to check', 'warning'); return; }
    if (AppState.myMedications.length === 0) { showToast('Add medications to your list first', 'warning'); return; }

    const resultsEl = document.getElementById('vs-results');
    resultsEl.innerHTML = '<div class="skeleton skeleton--card"></div><div class="skeleton skeleton--card" style="margin-top:8px"></div>';

    const checks = await Promise.allSettled(
      AppState.myMedications.map(async med => {
        const myName = med.brandName || med.genericName;
        const [labelA, labelB] = await Promise.allSettled([getDrugLabel(newDrug), getDrugLabel(myName)]);
        const rA = labelA.status === 'fulfilled' ? labelA.value : null;
        const rB = labelB.status === 'fulfilled' ? labelB.value : null;
        let severity = 0, text = 'No specific interaction data found.';
        const check = (label, target) => {
          if (!label?.drug_interactions) return;
          const raw = Array.isArray(label.drug_interactions) ? label.drug_interactions.join(' ') : label.drug_interactions;
          if (raw.toLowerCase().includes(target.toLowerCase())) {
            const s = classifyInteraction(raw);
            if (s > severity) { severity = s; text = raw; }
          }
        };
        check(rA, myName); check(rB, newDrug);
        return { med, severity, text };
      })
    );

    resultsEl.innerHTML = `<h3 style="margin-bottom:12px;font-size:1rem;">Results for <strong>${escapeHtml(newDrug)}</strong> vs. your medications:</h3>` +
      checks.map(r => {
        if (r.status !== 'fulfilled') return '';
        const { med, severity, text } = r.value;
        return `<div class="interaction-result" style="margin-bottom:10px;">
          <div class="interaction-result__header">
            <span class="interaction-result__drugs">${escapeHtml(newDrug)} ↔ ${escapeHtml(med.brandName || med.genericName)}</span>
            ${severityBadge(severity)}
          </div>
          <p class="interaction-result__body">${escapeHtml(truncate(text, 300))}</p>
        </div>`;
      }).join('');
  });
}
