/* ============================================================
   utils.js — Helpers, severity scoring, formatters
   ============================================================ */

const SEVERITY = {
  0: { label: 'No Interaction', cssClass: 'safe',     color: 'var(--safe)',     badgeClass: 'badge--safe' },
  1: { label: 'Monitor',        cssClass: 'caution',  color: 'var(--caution)',  badgeClass: 'badge--caution' },
  2: { label: 'Major',          cssClass: 'danger',   color: 'var(--danger)',   badgeClass: 'badge--danger' },
  3: { label: 'Contraindicated',cssClass: 'critical', color: 'var(--critical)', badgeClass: 'badge--critical' },
};

function severityBadge(level) {
  const s = SEVERITY[level] || SEVERITY[0];
  return `<span class="badge ${s.badgeClass}">${s.label}</span>`;
}

function severityDotClass(level) {
  const map = { 0: 'safe', 1: 'caution', 2: 'danger', 3: 'critical' };
  return `status-dot--${map[level] ?? 'safe'}`;
}

// Debounce function — delays execution until after `delay` ms of inactivity
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Format ISO date string to human-readable
function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return iso; }
}

// Count-up animation for a DOM element
function countUp(el, target, duration = 800) {
  if (!el) return;
  const start = performance.now();
  const step = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    el.textContent = Math.round(progress * target);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Show a toast notification
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'alert');
  const icon = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' }[type] || 'ℹ️';
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast--out');
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}

// Show a confirmation modal — returns a Promise resolving to true/false
function showModal(title, body) {
  return new Promise((resolve) => {
    const overlay  = document.getElementById('modal-overlay');
    const titleEl  = document.getElementById('modal-title');
    const bodyEl   = document.getElementById('modal-body');
    const confirm  = document.getElementById('modal-confirm');
    const cancel   = document.getElementById('modal-cancel');
    const closeBtn = document.getElementById('modal-close');

    titleEl.textContent = title;
    bodyEl.innerHTML    = body;
    overlay.hidden      = false;

    const done = (result) => {
      overlay.hidden = true;
      resolve(result);
    };

    confirm.onclick  = () => done(true);
    cancel.onclick   = () => done(false);
    closeBtn.onclick = () => done(false);
    overlay.onclick  = (e) => { if (e.target === overlay) done(false); };
  });
}

// Truncate text to maxLen characters
function truncate(text, maxLen = 200) {
  if (!text || text.length <= maxLen) return text || '';
  return text.slice(0, maxLen).trimEnd() + '…';
}

// Calculate overall safety score (0–100)
function calculateSafetyScore(interactions = [], recallCount = 0) {
  const penalties = [0, 5, 20, 40];
  let deduction = 0;
  for (const ix of interactions) {
    deduction += penalties[ix.severity] ?? 0;
  }
  deduction += recallCount * 10;
  return Math.max(0, Math.min(100, 100 - deduction));
}

function scoreVerdict(score) {
  if (score >= 80) return { text: 'Your medication combination appears low-risk.', color: 'var(--safe)' };
  if (score >= 60) return { text: 'Some caution advised — review interactions.', color: 'var(--caution)' };
  if (score >= 40) return { text: 'Significant interactions detected — consult your pharmacist.', color: 'var(--danger)' };
  return { text: 'High-risk combination — please consult your physician immediately.', color: 'var(--critical)' };
}

function scoreGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function scoreColor(score) {
  if (score >= 80) return 'var(--safe)';
  if (score >= 60) return 'var(--caution)';
  if (score >= 40) return 'var(--danger)';
  return 'var(--critical)';
}

// Render a loading skeleton set
function renderSkeletons(count = 3, type = 'card') {
  return Array.from({ length: count }, () =>
    `<div class="skeleton skeleton--${type}" style="height:${type === 'metric' ? 90 : 100}px"></div>`
  ).join('');
}

// Escape HTML to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
