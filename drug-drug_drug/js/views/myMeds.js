/* ============================================================
   views/myMeds.js — My Medications view
   ============================================================ */


let searchTimeout = null;

function renderMyMeds(AppState, onUpdate) {
  const el = document.getElementById('view-my-meds');
  if (!el) return;

  el.innerHTML = `
    <div class="view-header">
      <h1>My Medications</h1>
      <p>Manage your medication list. Search and add drugs to track interactions.</p>
    </div>

    <div class="mymeds-search-bar">
      <label for="med-search-input" style="font-weight:600;font-size:.9rem;display:block;margin-bottom:8px;">Add a medication</label>
      <div class="mymeds-search-row">
        <div class="input-wrapper">
          <input id="med-search-input" class="input" type="text" placeholder="Type a drug name (e.g. Warfarin, Lipitor…)" autocomplete="off" aria-label="Search medications" aria-autocomplete="list" aria-controls="med-autocomplete" />
          <div id="med-autocomplete" class="autocomplete-dropdown" hidden role="listbox"></div>
        </div>
        <button class="btn btn--primary" id="btn-add-selected" disabled aria-label="Add selected medication">Add Drug</button>
      </div>
    </div>

    <div class="section-header">
      <h2 class="section-title">My Medications (<span id="meds-count">${AppState.myMedications.length}</span>)</h2>
      <div class="mymeds-bulk">
        <button class="btn btn--ghost btn--sm" id="btn-clear-all" ${AppState.myMedications.length === 0 ? 'disabled' : ''}>Clear all</button>
      </div>
    </div>
    <div id="meds-grid" class="cards-grid"></div>`;

  renderMedCards(AppState, onUpdate);
  attachSearchEvents(AppState, onUpdate);

  document.getElementById('btn-clear-all')?.addEventListener('click', async () => {
    const confirmed = await showModal(
      'Clear all medications?',
      'This will remove all medications from your list and clear the interaction cache. This cannot be undone.'
    );
    if (!confirmed) return;
    AppState.myMedications = clearMedications();
    AppState.interactions  = [];
    showToast('All medications removed', 'info');
    onUpdate?.();
    renderMyMeds(AppState, onUpdate);
  });
}

function renderMedCards(AppState, onUpdate) {
  const grid = document.getElementById('meds-grid');
  if (!grid) return;
  const meds = AppState.myMedications;
  if (meds.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;">
        <div class="empty-state">
          <div class="empty-state__icon">💊</div>
          <h3 class="empty-state__title">No medications added yet</h3>
          <p class="empty-state__body">Use the search bar above to find and add your medications.</p>
        </div>
      </div>`;
    return;
  }

  grid.innerHTML = meds.map(med => {
    const worst = worstSeverityFor(med.id, AppState.interactions || []);
    return `
      <div class="drug-card" id="card-${med.id}" role="article" aria-label="${escapeHtml(med.brandName || med.genericName)}">
        <div class="drug-card__header">
          <div>
            <div class="drug-card__name">${escapeHtml(med.brandName || med.genericName)}</div>
            <div class="drug-card__generic">${escapeHtml(med.genericName)}</div>
          </div>
          ${severityBadge(worst)}
        </div>
        <div class="drug-card__meta">
          ${med.dosageForm ? `<span class="drug-card__form">${escapeHtml(med.dosageForm.toLowerCase())}</span>` : ''}
          ${med.ndcCode    ? `<span class="drug-card__date">NDC: <code>${escapeHtml(med.ndcCode)}</code></span>` : ''}
          <span class="drug-card__date">Added ${formatDate(med.addedAt)}</span>
        </div>
        <div class="drug-card__actions">
          <button class="btn btn--ghost btn--sm btn-view-interactions" data-id="${med.id}" data-name="${escapeHtml(med.brandName || med.genericName)}" aria-label="View interactions for ${escapeHtml(med.brandName || med.genericName)}">View Interactions</button>
          <button class="btn btn--danger btn--sm btn-remove" data-id="${med.id}" aria-label="Remove ${escapeHtml(med.brandName || med.genericName)}">Remove</button>
        </div>
      </div>`;
  }).join('');

  // Attach card events
  grid.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const med = meds.find(m => m.id === id);
      const confirmed = await showModal(
        'Remove medication?',
        `Remove <strong>${escapeHtml(med?.brandName || med?.genericName || 'this medication')}</strong> from your list?`
      );
      if (!confirmed) return;
      const card = document.getElementById(`card-${id}`);
      if (card) {
        card.classList.add('drug-card--removing');
        await new Promise(r => setTimeout(r, 200));
      }
      AppState.myMedications = removeMedication(AppState.myMedications, id);
      AppState.interactions   = AppState.interactions.filter(ix => ix.idA !== id && ix.idB !== id);
      showToast(`${med?.brandName || 'Medication'} removed`, 'info');
      onUpdate?.();
      renderMedCards(AppState, onUpdate);
      updateMedsCount(AppState.myMedications.length);
    });
  });

  grid.querySelectorAll('.btn-view-interactions').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.name;
      // Navigate to search view with drug pre-filled
      document.querySelector('[data-view="search"]')?.click();
      setTimeout(() => {
        const input = document.getElementById('search-drug-a');
        if (input) { input.value = name; input.dispatchEvent(new Event('input')); }
      }, 100);
    });
  });
}

function attachSearchEvents(AppState, onUpdate) {
  const input      = document.getElementById('med-search-input');
  const dropdown   = document.getElementById('med-autocomplete');
  const addBtn     = document.getElementById('btn-add-selected');
  let selectedDrug = null;

  const handleSearch = debounce(async (query) => {
    if (!query || query.length < 2) { dropdown.hidden = true; return; }
    dropdown.innerHTML = '<div class="autocomplete-item" style="color:var(--text-muted)">Searching…</div>';
    dropdown.hidden = false;

    const results = await searchDrugsByName(query);
    if (!results.length) {
      dropdown.innerHTML = '<div class="autocomplete-item" style="color:var(--text-muted)">No results found</div>';
      return;
    }

    dropdown.innerHTML = results.map((r, i) => `
      <div class="autocomplete-item" role="option" tabindex="0" data-idx="${i}"
           data-brand="${escapeHtml(r.brand_name || '')}"
           data-generic="${escapeHtml(r.generic_name || '')}"
           data-form="${escapeHtml(r.dosage_form  || '')}"
           data-ndc="${escapeHtml(r.product_ndc   || '')}">
        <div class="autocomplete-item__name">${escapeHtml(r.brand_name || r.generic_name || 'Unknown')}</div>
        <div class="autocomplete-item__sub">${escapeHtml(r.generic_name || '')} · ${escapeHtml(r.dosage_form || '')}</div>
      </div>`).join('');

    dropdown.querySelectorAll('.autocomplete-item[data-idx]').forEach(item => {
      const select = () => {
        selectedDrug = {
          brandName:   item.dataset.brand,
          genericName: item.dataset.generic,
          dosageForm:  item.dataset.form,
          ndcCode:     item.dataset.ndc,
        };
        input.value    = selectedDrug.brandName || selectedDrug.genericName;
        dropdown.hidden = true;
        addBtn.disabled = false;
      };
      item.addEventListener('click', select);
      item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') select(); });
    });
  }, 300);

  input.addEventListener('input', (e) => {
    selectedDrug    = null;
    addBtn.disabled = true;
    handleSearch(e.target.value.trim());
  });

  input.addEventListener('blur', () => setTimeout(() => { dropdown.hidden = true; }, 200));
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { dropdown.hidden = true; }
  });

  addBtn.addEventListener('click', () => {
    if (!selectedDrug) return;
    const updated = addMedication(AppState.myMedications, selectedDrug);
    if (!updated) {
      showToast('That medication is already in your list', 'warning');
      return;
    }
    AppState.myMedications = updated;
    showToast(`${selectedDrug.brandName || selectedDrug.genericName} added!`, 'success');
    input.value     = '';
    selectedDrug    = null;
    addBtn.disabled = true;
    onUpdate?.();
    renderMedCards(AppState, onUpdate);
    updateMedsCount(AppState.myMedications.length);
  });
}

function updateMedsCount(n) {
  const el = document.getElementById('meds-count');
  if (el) el.textContent = n;
  const clearBtn = document.getElementById('btn-clear-all');
  if (clearBtn) clearBtn.disabled = n === 0;
}
