/* ============================================================
   app.js — App init, routing, global state
   ============================================================ */


// ── Global AppState ────────────────────────────────────────────────────────
const AppState = {
  myMedications: [],   // [{ id, brandName, genericName, dosageForm, ndcCode, addedAt }]
  interactions:  [],   // cached results from last analysis
  currentView:   null, // null so the initial navigate('dashboard') is not skipped
  isLoading:     false,
  lastAnalyzedAt: null,
};

// ── View registry (lazy initialization) ───────────────────────────────────
const initializedViews = new Set();

const viewRenderers = {
  'dashboard':     () => renderDashboard(AppState),
  'my-meds':       () => renderMyMeds(AppState, onMedicationsUpdate),
  'search':        () => renderSearch(AppState, onMedicationsUpdate),
  'adverse-events':() => renderAdverseEvents(AppState),
  'recalls':       () => renderRecalls(AppState),
  'report-card':   () => renderReportCard(AppState),
};

// ── Navigation ─────────────────────────────────────────────────────────────
async function navigate(viewKey, force = false) {
  if (!force && AppState.currentView === viewKey) return;

  // Update nav state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewKey);
  });

  // Hide all views
  document.querySelectorAll('.view').forEach(v => { v.hidden = true; });

  // Show target view
  const target = document.getElementById(`view-${viewKey}`);
  if (target) {
    target.hidden = false;
    // Trigger re-animation
    target.style.animation = 'none';
    requestAnimationFrame(() => { target.style.animation = ''; });
  }

  AppState.currentView = viewKey;

  // Render the view (always re-render to reflect state changes)
  const renderer = viewRenderers[viewKey];
  if (renderer) await renderer();

  // Close sidebar on mobile
  closeMobileSidebar();
}

// ── Medications update callback ────────────────────────────────────────────
// Called when medications change — invalidates analysis cache if needed
function onMedicationsUpdate() {
  // Reset interactions so dashboard re-runs analysis with new meds
  AppState.interactions = [];
  AppState.lastAnalyzedAt = null;
  // Refresh sidebar summary
  updateSidebarSummary();
  // If dashboard is visible, re-render it with new data
  if (AppState.currentView === 'dashboard') {
    navigate('dashboard', true);
  }
}

function updateSidebarSummary() {
  const countEl = document.getElementById('summary-count');
  if (countEl) countEl.textContent = AppState.myMedications.length;
}

// ── Mobile sidebar ─────────────────────────────────────────────────────────
function closeMobileSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  const hamburger= document.getElementById('hamburger');
  sidebar?.classList.remove('open');
  if (overlay) overlay.hidden = true;
  hamburger?.setAttribute('aria-expanded', 'false');
}

function initMobileSidebar() {
  const hamburger = document.getElementById('hamburger');
  const overlay   = document.getElementById('sidebar-overlay');
  const sidebar   = document.getElementById('sidebar');

  hamburger?.addEventListener('click', () => {
    const isOpen = sidebar?.classList.contains('open');
    sidebar?.classList.toggle('open', !isOpen);
    if (overlay) overlay.hidden = isOpen;
    hamburger.setAttribute('aria-expanded', String(!isOpen));
  });

  overlay?.addEventListener('click', closeMobileSidebar);
}

// ── Offline detection ──────────────────────────────────────────────────────
function initOfflineDetection() {
  const banner = document.getElementById('offline-banner');
  const update = () => { if (banner) banner.hidden = navigator.onLine; };
  window.addEventListener('online',  update);
  window.addEventListener('offline', update);
  update();
}

// ── App initialization ─────────────────────────────────────────────────────
async function init() {
  // Load persisted state
  AppState.myMedications = loadMedications();
  const cached = loadAnalysis();
  if (cached?.data) {
    AppState.interactions  = cached.data;
    AppState.lastAnalyzedAt = cached.savedAt;
  }

  // Wire up navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => navigate(item.dataset.view));
  });

  // Mobile sidebar
  initMobileSidebar();

  // Offline detection
  initOfflineDetection();

  // Initial sidebar summary
  updateSidebarSummary();

  // Render initial view (dashboard)
  await navigate('dashboard', true);
}

// ── Bootstrap ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
